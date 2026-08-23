"use client";

/**
 * 채널의 영상 목록 — 상호명·제목 검색 + 도시·유형 필터. 홈과 같은 시트 문법.
 *
 * 채널 표식(아바타·채널명)은 넘기지 않는다 — 이미 채널 화면 안이라 매 칸에
 * 같은 이름이 반복될 뿐이다. 그 자리는 도시가 가져간다.
 *
 * 검색·필터는 전부 클라이언트다 — YouTube `search.list` 는 100 units 라 런타임
 * 검색에 쓸 수 없다(INGEST.md). 다만 **목록 자체는 문서에 전부 싣지 않는다**:
 * 문서에는 앞줄 `HUB_VIDEO_HEAD` 편만 있고, 검색이 전편을 훑을 수 있도록
 * 마운트 뒤 `/api/creator/[creator]/videos` 로 나머지를 받는다.
 */

import { useEffect, useId, useMemo, useState } from "react";
import type { PlaceType } from "@/shared/api/database.types";
import { Chip } from "@/shared/ui/frame"
import { Icon } from "@/shared/ui/icons";
import { VideoSheet } from "@/shared/ui/VideoSheet";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName } from "@/shared/i18n/display";
import { HUB_VIDEO_HEAD, type HubVideo } from "./hub-payload";

const DEVELOP_LIMIT = 6;

export function VideoList({
  videos: headVideos,
  total,
  cityOptions,
  typeOptions,
  creatorSlug,
}: {
  /** 서버가 문서에 그린 **앞줄**만(`hub-payload.ts` `HUB_VIDEO_HEAD`). 전체가 아니다 */
  videos: HubVideo[];
  /** 이 채널의 검수한 영상 전체 수 */
  total: number;
  /** 전편 기준으로 서버가 센 필터 칩 재료 — 앞줄에서 뽑으면 칩이 빠졌다 늘어난다 */
  cityOptions: HubVideo["cities"];
  typeOptions: PlaceType[];
  creatorSlug: string;
}) {
  const { messages: m, href, t, locale } = useLocale();
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [type, setType] = useState<PlaceType | null>(null);
  const searchId = useId();

  /**
   * 전편 — 문서에는 앞줄 24편만 실린다(`hub-payload.ts`).
   *
   * 장소 목록과 달리 여기는 **검색이 걸려 있다.** 앞줄 24편만 들고 있으면
   * "라멘" 검색이 24편 안에서만 맞아 조용히 틀린 답을 준다. 그래서 마운트 즉시
   * 전편을 받아 갈아 끼운다. 대신 **그린다고 다 그리지는 않는다** — 아래
   * `limit` 이 DOM 상한을 따로 쥔다(1,094편 채널에서 문서만 가볍고 DOM 은
   * 그대로인 상태를 막는다).
   *
   * 실패해도 `[]` 로 덮지 않는다 — 서버가 이미 그려 둔 앞줄이 남는다.
   */
  const [fetchedVideos, setFetchedVideos] = useState<HubVideo[] | null>(null);
  const videos = fetchedVideos ?? headVideos;
  const videosReady = fetchedVideos !== null || headVideos.length >= total;
  useEffect(() => {
    if (headVideos.length >= total) return;
    let alive = true;
    fetch(`/api/creator/${creatorSlug}/videos`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { videos?: HubVideo[] } | null) => {
        if (alive && data?.videos?.length) setFetchedVideos(data.videos);
      })
      .catch(() => {
        /* 앞줄은 그대로 둔다 — 위 주석 */
      });
    return () => {
      alive = false;
    };
  }, [creatorSlug, headVideos.length, total]);

  /* 칩의 재료는 서버가 전편 기준으로 준다. 정렬만 여기서 한다 — 표시명 기준이라
     로케일을 알아야 하고, 그건 클라이언트의 몫이다(자르기 전과 같은 순서다). */
  const allCities = useMemo(
    () =>
      [...cityOptions].sort((a, b) =>
        displayCityName(a, locale).localeCompare(displayCityName(b, locale)),
      ),
    [cityOptions, locale],
  );
  const allTypes = typeOptions;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return videos.filter((v) => {
      if (city && !v.cities.some((c) => c.slug === city)) return false;
      if (type && !v.types.includes(type)) return false;
      if (!needle) return true;
      // 상호명까지 훑는다 — 방문자는 영상 제목이 아니라 가게 이름을 기억한다
      return (
        v.title.toLowerCase().includes(needle) ||
        v.placeNames.some((n) => n.toLowerCase().includes(needle))
      );
    });
  }, [videos, q, city, type]);

  const filtered = Boolean(q.trim() || city || type);
  const clearAll = () => {
    setQ("");
    setCity(null);
    setType(null);
  };

  /**
   * 화면에 실제로 그리는 상한. 데이터가 전편 도착해도 DOM 은 여기서 멈춘다 —
   * 영상 칸은 썸네일 프레임을 든 카드라, 1,094편을 다 그리면 문서만 가벼워지고
   * 브라우저가 지는 짐은 그대로다.
   *
   * 필터가 바뀌면 다시 앞줄부터다. 렌더 중 상태 조정은 이 코드베이스가 이미
   * 쓰는 문법이다(`CityExplorer` 의 detailFor) — 이펙트로 미루면 옛 상한으로
   * 한 프레임 그렸다가 줄어든다.
   */
  const [limit, setLimit] = useState(HUB_VIDEO_HEAD);
  const filterKey = `${q}|${city}|${type}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setLimit(HUB_VIDEO_HEAD);
  }
  const visible = shown.slice(0, limit);
  const restCount = shown.length - visible.length;

  return (
    <div className="flex flex-col gap-(--stack)">
      <label
        htmlFor={searchId}
        className="field flex items-center gap-2.5 px-3.5 py-3"
      >
        <span className="sr-only">{m.home.searchAria}</span>
        <Icon.search className="size-[18px] shrink-0" style={{ color: "var(--dim)" }} />
        <input
          id={searchId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={m.home.searchPlaceholder}
          autoComplete="off"
          enterKeyHint="search"
          className="w-full bg-transparent outline-none placeholder:text-[color:var(--dim)]"
          style={{ fontSize: "16px" }}
        />
      </label>

      {allCities.length > 1 ? (
        <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
          <Chip active={city === null} onClick={() => setCity(null)}>
            {m.home.allCities}
          </Chip>
          {allCities.map((c) => (
            <Chip
              key={c.slug}
              active={city === c.slug}
              onClick={() => setCity(city === c.slug ? null : c.slug)}
            >
              {displayCityName(c, locale)}
            </Chip>
          ))}
        </div>
      ) : null}

      {allTypes.length > 1 ? (
        <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
          <Chip active={type === null} onClick={() => setType(null)}>
            {m.cityDetail.allTypes}
          </Chip>
          {allTypes.map((pt) => (
            <Chip key={pt} active={type === pt} onClick={() => setType(type === pt ? null : pt)}>
              {m.placeTypes[pt]}
            </Chip>
          ))}
        </div>
      ) : null}

      {filtered ? (
        <div className="flex items-baseline justify-between gap-3">
          <p className="index tnum" style={{ color: "var(--dim)" }}>
            {/* 전편이 오기 전의 결과 수는 앞줄 24편만 센 값이라 답이 아니다 */}
            {videosReady ? t(m.home.foundVideos, { n: shown.length }) : m.common.loading}
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="cursor-pointer underline underline-offset-4"
            style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
          >
            {m.cityDetail.clearFilters}
          </button>
        </div>
      ) : null}

      {shown.length === 0 && !videosReady ? (
        /* 전편이 오기 전 — 검색어가 앞줄 24편에서만 안 걸린 것일 수 있다.
           "조건에 맞는 영상이 없어요" 를 띄웠다가 곧 결과가 차면 그건 거짓말이다. */
        <span aria-hidden />
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p style={{ fontSize: "var(--t-body)" }}>{m.hub.noVideoMatch}</p>
          <Chip onClick={clearAll}>{m.cityDetail.clearFilters}</Chip>
        </div>
      ) : (
        <>
          <ul
            key={filterKey}
            className="grid grid-cols-1 gap-(--block) md:grid-cols-2 xl:grid-cols-3"
          >
            {visible.map((v, i) => (
              <VideoSheet
                key={v.youtubeId}
                video={{ ...v, cities: v.cities.map((c) => displayCityName(c, locale)) }}
                href={href(`/c/${creatorSlug}/v/${v.youtubeId}`)}
                i={i}
                animate={i < DEVELOP_LIMIT}
                extraLabel={
                  v.placeNames.length > 1
                    ? t(m.home.morePlaces, { n: v.placeNames.length - 1 })
                    : undefined
                }
              />
            ))}
          </ul>
          {restCount > 0 ? (
            <div>
              {/* 문구는 `m.search` 것을 빌려 쓴다("{n}개 더 보기") — i18n 은 다른
                  소유자라 키를 새로 만들지 않았다. 보고서에 적어 뒀다. */}
              <Chip onClick={() => setLimit((n) => n + HUB_VIDEO_HEAD)}>
                {t(m.search.more, { n: restCount })}
              </Chip>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
