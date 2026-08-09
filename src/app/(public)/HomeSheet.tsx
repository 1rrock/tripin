"use client";

/**
 * 홈 = 영상 콘택트 시트 + 채널 진입.
 *
 * 멀티채널 전제: 도시 칩·채널 칩으로 좁히고, 영상은 페이지 단위로만 깐다.
 * 검색이 상호명까지 훑는 게 이 화면의 실질이다. "이치란 어디 나왔지"가
 * 방문자의 실제 질문이고, 제목만 훑으면 그 질문에 답하지 못한다.
 */

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import type { FeedCreator, FeedVideo } from "@/shared/api/home";
import { Avatar, Chip, Icon, Index } from "@/shared/ui/frame";
import { VideoSheet } from "@/shared/ui/VideoSheet";

/** 현상 애니메이션을 거는 프레임 수. 아래쪽까지 걸면 스크롤이 계속 흔들린다 */
const DEVELOP_LIMIT = 6;

/** 한 번에 까는 영상 수. 20~30 채널·수백 편 대비 전량 DOM 금지 */
const PAGE_SIZE = 24;

export function HomeSheet({
  videos,
  creators,
  totals,
}: {
  videos: FeedVideo[];
  creators: FeedCreator[];
  totals: { creators: number; cities: number; places: number; videos: number };
}) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchId = useId();

  const allCities = useMemo(() => [...new Set(videos.flatMap((v) => v.cities))].sort(), [videos]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return videos.filter((v) => {
      if (city && !v.cities.includes(city)) return false;
      if (channel && v.creatorSlug !== channel) return false;
      if (!needle) return true;
      return (
        v.title.toLowerCase().includes(needle) ||
        v.creatorName.toLowerCase().includes(needle) ||
        v.cities.some((c) => c.toLowerCase().includes(needle)) ||
        v.placeNames.some((n) => n.toLowerCase().includes(needle))
      );
    });
  }, [videos, q, city, channel]);

  /** 필터 변경 시 페이지를 1페이지로 — effect setState 금지 */
  const resetPage = () => setVisibleCount(PAGE_SIZE);

  const onQuery = (value: string) => {
    setQ(value);
    resetPage();
  };
  const onCity = (next: string | null) => {
    setCity(next);
    resetPage();
  };
  const onChannel = (next: string | null) => {
    setChannel(next);
    resetPage();
  };

  const filtered = Boolean(q.trim() || city || channel);
  const clearAll = () => {
    setQ("");
    setCity(null);
    setChannel(null);
    resetPage();
  };

  const page = shown.slice(0, visibleCount);
  const hasMore = shown.length > visibleCount;
  const [lead, ...rest] = page;
  const filterKey = `${q}|${city ?? ""}|${channel ?? ""}`;

  return (
    <div className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <header className="flex flex-col gap-4">
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-display)", letterSpacing: "-0.045em", lineHeight: 1.12 }}
        >
          유튜브에서 본
          <br />그 가게, 지도로.
        </h1>
        {/* 규모 — 장소·도시는 우리 큐레이션 산출물이고, 영상 수는 API 유래라
            "검수한"을 붙여 성격을 분명히 한다 (LEGAL.md 4.5-(2)) */}
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          간 곳 {totals.places} · 도시 {totals.cities} · 검수한 영상 {totals.videos}
        </p>
      </header>

      <section className="flex flex-col gap-(--stack)">
        <label
          htmlFor={searchId}
          className="flex items-center gap-2.5 px-3.5 py-3"
          style={{
            borderRadius: "var(--r-control)",
            background: "var(--sheet)",
            boxShadow: "inset 0 0 0 1px var(--hairline)",
          }}
        >
          <span className="sr-only">가게 이름·영상·도시·채널 검색</span>
          <Icon.search className="size-[18px] shrink-0" style={{ color: "var(--dim)" }} />
          <input
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="가게 이름으로 찾기"
            autoComplete="off"
            enterKeyHint="search"
            className="w-full bg-transparent outline-none placeholder:text-[color:var(--dim)]"
            style={{ fontSize: "var(--t-body)" }}
          />
        </label>

        {allCities.length > 1 ? (
          <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter)">
            <Chip active={city === null} onClick={() => onCity(null)}>
              전체 도시
            </Chip>
            {allCities.map((c) => (
              <Chip key={c} active={city === c} onClick={() => onCity(city === c ? null : c)}>
                {c}
              </Chip>
            ))}
          </div>
        ) : null}

        {/* 채널 필터 — 지역 페이지와 같은 패턴. 2+ 일 때만 노출 */}
        {creators.length > 1 ? (
          <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter)">
            <Chip active={channel === null} onClick={() => onChannel(null)}>
              전체 채널
            </Chip>
            {creators.map((c) => (
              <Chip
                key={c.slug}
                active={channel === c.slug}
                onClick={() => onChannel(channel === c.slug ? null : c.slug)}
              >
                {c.displayName}
                <span className="tnum ml-1.5 opacity-60">{c.placeCount}</span>
              </Chip>
            ))}
          </div>
        ) : null}
      </section>

      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p style={{ fontSize: "var(--t-body)" }}>찾는 곳이 아직 시트에 없어요.</p>
          <Chip onClick={clearAll}>전체 보기</Chip>
        </div>
      ) : (
        <section aria-labelledby="sheet-h" className="flex flex-col gap-(--stack)">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="sheet-h" className="index" style={{ color: "var(--dim)" }}>
              {filtered
                ? `찾은 영상 ${shown.length}`
                : hasMore
                  ? `최근 영상 · ${visibleCount} / ${shown.length}`
                  : "최근 영상"}
            </h2>
            {filtered ? (
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer underline underline-offset-4"
                style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
              >
                전체 보기
              </button>
            ) : null}
          </div>

          {/* 첫 프레임은 전폭 — key 에 필터를 물려 필터 변경 시 현상 연출을 다시 태운다 */}
          <ul key={`lead-${filterKey}`} className="flex flex-col">
            {lead ? (
              <VideoSheet
                video={lead}
                href={`/c/${lead.creatorSlug}/v/${lead.youtubeId}`}
                i={0}
                large
                channel={{
                  name: lead.creatorName,
                  initials: lead.initials,
                  accent: lead.accentColor,
                  avatarUrl: lead.avatarUrl,
                }}
              />
            ) : null}
          </ul>
          {rest.length > 0 ? (
            <ul
              key={`rest-${filterKey}`}
              className="mt-(--block) grid grid-cols-1 gap-(--block) md:grid-cols-2 xl:grid-cols-3"
            >
              {rest.map((v, i) => (
                <VideoSheet
                  key={v.youtubeId}
                  video={v}
                  href={`/c/${v.creatorSlug}/v/${v.youtubeId}`}
                  i={i + 1}
                  animate={i + 1 < DEVELOP_LIMIT}
                  channel={{
                    name: v.creatorName,
                    initials: v.initials,
                    accent: v.accentColor,
                    avatarUrl: v.avatarUrl,
                  }}
                />
              ))}
            </ul>
          ) : null}

          {hasMore ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Chip onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                더 보기
                <span className="tnum ml-1.5 opacity-60">
                  +{Math.min(PAGE_SIZE, shown.length - visibleCount)}
                </span>
              </Chip>
              <p className="index tnum" style={{ color: "var(--dim)" }}>
                {visibleCount} / {shown.length}
              </p>
            </div>
          ) : null}
        </section>
      )}

      {/* 채널 디렉터리 — 멀티채널에서 실질 입구 */}
      {creators.length > 0 ? (
        <section aria-labelledby="ch-h" className="flex flex-col gap-(--stack)">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="ch-h" className="index" style={{ color: "var(--dim)" }}>
              채널 {totals.creators}
            </h2>
            {creators.length > 6 ? (
              <Link
                href="/channels"
                className="underline-offset-4 hover:underline"
                style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
              >
                전체 보기
              </Link>
            ) : null}
          </div>
          <ul className="flex flex-col gap-(--stack)">
            {creators.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/c/${c.slug}`}
                  className="flex items-center gap-3 py-1"
                  aria-label={`${c.displayName} 채널 열기`}
                >
                  <Avatar
                    initials={c.initials}
                    accent={c.accentColor}
                    src={c.avatarUrl}
                    size={38}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate font-bold"
                      style={{ fontSize: "var(--t-title)" }}
                    >
                      {c.displayName}
                    </span>
                    <span
                      className="block truncate"
                      style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                    >
                      {c.cities.map((x) => x.name).join(" · ")}
                    </span>
                  </span>
                  <Index className="tnum shrink-0">{c.placeCount}곳</Index>
                  <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
