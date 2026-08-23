"use client";

/**
 * 도시 지도 — 채널 무관. 이 도시에 간 **모든 채널**의 장소가 한 지도에 모인다.
 *
 * 조각(`/c/[creator]/[city]`)과 화면 골격은 같지만 성격이 다르다. 조각은 "이 사람을
 * 따라가기"고 여기는 "이 도시에서 고르기"라, 한 장소에 출처 채널이 여러 개 붙을 수 있고
 * 그게 이 화면의 값이다.
 *
 * 선택의 두 갈래를 구분한다:
 *   · **핀** 을 누르면 상세 시트가 열린다 — 지도에는 이름 말고 들어갈 자리가 없으니까
 *   · **목록 행** 을 누르면 지도만 그 핀으로 옮긴다 — 행 자체가 이미 상세다
 * 둘 다 같은 activeId 를 쓰므로 지도와 목록의 강조는 항상 일치한다.
 *
 * 필터는 클라이언트. `?type=`·`?channel=` 은 replace 로 동기화해 공유·뒤로가기가 된다.
 * 지도 뷰포트 초기화를 피하려고 풀 네비게이션은 쓰지 않는다.
 *
 * **초기값도 클라이언트에서 읽는다.** 서버에서 `searchParams` 를 읽으면 이 페이지가
 * ISR 에서 빠져 매 진입이 람다 SSR 이 된다(`page.tsx` 머리 주석).
 * `useSearchParams()` 를 쓰지 않는 이유는 `readInitialFilter()` 주석에 있다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PlaceType } from "@/shared/api/database.types";
import type { CityCreator, MapPlaceDetail, PlaceSource } from "@/shared/api/cities";
import { MapView } from "@/shared/ui/MapView";
import { PlaceSheet } from "@/shared/ui/PlaceSheet";
import { ShareButton } from "@/shared/ui/ShareButton";
import { PlaceRowLink } from "@/shared/ui/PlaceRowLink";
import { Chip, FrameNo, Rule } from "@/shared/ui/frame"
import { EmptyState } from "@/shared/ui/EmptyState";
import { Icon } from "@/shared/ui/icons";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayPlaceName, displayPlaceSecondary } from "@/shared/i18n/display";
import type { SummaryDisplay } from "@/shared/i18n/display";

/**
 * 목록·핀이 읽는 최소 형태. **요약·출처·지도링크는 여기 없다.**
 *
 * 예전에는 이 타입이 `summary`·`sources`·`mapLinks` 를 다 들고 있었고, 후쿠오카
 * 561곳이면 그게 HTML 3.1MB(DOM 1.9MB + RSC 페이로드 1.0MB)가 됐다. 행마다 붙던
 * 출처·지도 링크 블록만 1.05MB, 그 안의 인라인 SVG 1259개가 482KB 였다.
 *
 * `/map` 이 같은 문제를 이미 이렇게 풀었다(cities.ts `MapCanvasPlace` 주석) —
 * 목록은 가볍게 싣고, 드로어를 열 때 `/api/map/place/[id]` 로 상세만 받는다.
 * 여기도 같은 규율을 쓴다. 필드를 늘리기 전에 561을 곱해 보고, 정말 목록·핀·필터에
 * 필요한지 따져라.
 *
 * 요약·출처를 잃는 게 아니다 — 드로어가 그대로 보여주고, 이제 각 장소에
 * `/place/[slug]` 문서가 따로 있다(행 전체가 그 링크다).
 */
/** 상세가 도착하기 전 PlaceSheet 에 넘길 빈 요약 — SummaryBlock 이 알아서 아무것도 안 그린다. */
const EMPTY_SUMMARY: SummaryDisplay = {
  bullets: [],
  summary: null,
  priceHint: null,
  isMachine: false,
  original: null,
};

/**
 * 첫 진입의 쿼리 — `useSearchParams()` 를 **쓰지 않는다.**
 *
 * 그 훅은 정적(ISR) 프리렌더 중에 `BailoutToCSRError` 를 던져, 가장 가까운
 * Suspense 경계(= 이 라우트의 `loading.tsx`) 아래를 통째로 클라이언트 렌더로
 * 돌린다. 그러면 이 도시의 장소 목록이 서버 HTML 에서 통째로 사라진다 —
 * 검색 유입이 본업인 페이지에서 그건 필터 하나와 바꿀 값이 아니다.
 *
 * 그래서 하이드레이션 뒤 `window.location.search` 를 한 번 읽는다. 첫 페인트는
 * 필터 없는 전체 목록이고, 깊은 링크의 필터는 그 다음 프레임에 걸린다.
 */
function readInitialFilter(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function parseType(v: string | null): PlaceType | null {
  return v && (FILTERABLE_TYPES as string[]).includes(v) ? (v as PlaceType) : null;
}

function parseChannel(v: string | null, creators: { slug: string }[]): string | null {
  if (!v) return null;
  return creators.some((c) => c.slug === v) ? v : null;
}

export interface CityPlace {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PlaceType;
  lat: number;
  lng: number;
  address: string | null;
  /** 채널 칩 필터용 — 이름·아바타는 안 싣는다. 드로어가 받아 온다 */
  creatorSlugs: string[];
  /** 드로어가 상세를 기다리는 동안 깔 대표 컷(heroHint) */
  youtubeId: string | null;
}

export function CityExplorer({
  cityName,
  citySlug,
  places: headPlaces,
  total,
  presentTypes,
  creators,
}: {
  cityName: string;
  citySlug: string;
  /** 서버가 문서에 그린 **앞줄**만(`list-payload.ts` `CITY_HEAD`). 전체가 아니다 */
  places: CityPlace[];
  /** 이 도시의 확정 장소 전체 수 — 개수 라벨이 앞줄만 세지 않게 서버가 넘긴다 */
  total: number;
  /** 전체 기준으로 서버가 센 종류 칩 — 꼬리가 와도 칩 줄이 안 튄다 */
  presentTypes: PlaceType[];
  creators: CityCreator[];
}) {
  const { messages: m, href, t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [type, setType] = useState<PlaceType | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rowRefs = useRef<globalThis.Map<string, HTMLLIElement>>(new globalThis.Map());

  /**
   * 목록의 꼬리 — 문서에는 앞줄 `CITY_HEAD` 곳만 실린다(`list-payload.ts`).
   * 마운트 즉시, 기본 우선순위로 한 번 받아 통째로 갈아 끼운다. `/map` 이
   * 씨앗 6곳에 `/api/map/index` 를 얹는 방식과 같다(HomeCanvas 주석).
   *
   * 실패해도 `[]` 로 덮지 않는다 — 서버가 이미 그려 둔 앞줄까지 지우면 지도도
   * 목록도 통째로 빈 화면이 된다. 꼬리는 있으면 더 보이는 것이지, 없다고
   * 화면이 사라져야 할 것이 아니다.
   */
  const [fetchedPlaces, setFetchedPlaces] = useState<CityPlace[] | null>(null);
  const places = fetchedPlaces ?? headPlaces;
  /** 앞줄이 곧 전체인 작은 도시는 처음부터 준비된 상태다 */
  const placesReady = fetchedPlaces !== null || headPlaces.length >= total;
  useEffect(() => {
    if (headPlaces.length >= total) return;
    let alive = true;
    fetch(`/api/city/${citySlug}/places`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { places?: CityPlace[] } | null) => {
        if (alive && data?.places?.length) setFetchedPlaces(data.places);
      })
      .catch(() => {
        /* 앞줄은 그대로 둔다 — 위 주석 */
      });
    return () => {
      alive = false;
    };
  }, [citySlug, headPlaces.length, total]);

  /* 깊은 링크(`/type/[type]` 의 "지도에서 보기" 칩이 `?type=` 을 실어 보낸다)를
     하이드레이션 직후 한 번 적용한다. 마운트 이후라 첫 HTML 은 필터 없는 전체
     목록이고, 그게 이 페이지가 검색엔진에 보여야 할 모습이다. */
  useEffect(() => {
    const q = readInitialFilter();
    const t0 = parseType(q.get("type"));
    const c0 = parseChannel(q.get("channel"), creators);
    /* eslint-disable react-hooks/set-state-in-effect --
       마운트 직후 1회. 서버는 이 값을 읽을 수 없다(readInitialFilter 주석) —
       "외부 시스템(주소창)에서 한 번 구독해 온다" 가 정확히 이 훅의 용례다. */
    if (t0) setType(t0);
    if (c0) setChannel(c0);
    /* eslint-enable react-hooks/set-state-in-effect */
    // 이후 필터 변경은 아래 select* 가 상태와 URL 을 함께 움직인다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 지도 뷰포트 유지 — scroll:false replace */
  const syncQuery = useCallback(
    (nextType: PlaceType | null, nextChannel: string | null) => {
      const params = new URLSearchParams();
      if (nextType) params.set("type", nextType);
      if (nextChannel) params.set("channel", nextChannel);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const selectType = (next: PlaceType | null) => {
    setType(next);
    syncQuery(next, channel);
  };

  const selectChannel = (next: string | null) => {
    setChannel(next);
    syncQuery(type, next);
  };

  const applyChannelFromDrawer = useCallback(
    (slug: string) => {
      if (slug === channel) return;
      setChannel(slug);
      const params = new URLSearchParams(window.location.search);
      params.set("channel", slug);
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      const st = window.history.state;
      window.history.replaceState(
        { ...(st && typeof st === "object" ? st : {}) },
        "",
        url,
      );
    },
    [channel, pathname],
  );

  const shown = useMemo(
    () =>
      places.filter((p) => {
        if (type && p.placeType !== type) return false;
        if (channel && !p.creatorSlugs.includes(channel)) return false;
        return true;
      }),
    [places, type, channel],
  );

  // 필터로 가려진 선택은 지도에도 목록에도 없다 — 표시 기준은 항상 이 값
  const visibleActiveId =
    activeId !== null && shown.some((p) => p.id === activeId) ? activeId : null;

  // 핀 번호는 **보이는 목록** 기준이다. 전체 기준으로 매기면 필터 후 번호가 띄엄띄엄해진다
  const pins = useMemo(
    () =>
      shown.map((p, i) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        index: i + 1,
      })),
    [shown],
  );

  /** 지도 핀 → 상세 시트. 지도에는 이름 말고 들어갈 자리가 없다 */
  const onPinClick = useCallback(
    (id: string) => {
      if (activeId === id && sheetOpen) {
        setSheetOpen(false);
        setActiveId(null);
        return;
      }
      setActiveId(id);
      setSheetOpen(true);
      const el = rowRefs.current.get(id);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    },
    [activeId, sheetOpen],
  );

  /** 목록 행 → 지도만 옮긴다. 행 자체가 이미 상세라 시트를 겹쳐 띄우지 않는다 */
  const onRowClick = (id: string) => {
    setSheetOpen(false);
    setActiveId((prev) => (prev === id ? null : id));
  };

  const activeIndex = shown.findIndex((p) => p.id === visibleActiveId);
  const activePlace = activeIndex >= 0 ? shown[activeIndex]! : null;

  /**
   * 드로어 상세 — 목록 페이로드에 안 실은 요약·출처·지도링크를 열 때 받는다.
   * `/map`(HomeCanvas)과 같은 라우트·같은 계약이라 CDN 캐시 항목도 공유한다.
   *
   * `?l=` 로 로케일을 URL 에 넣는 이유는 라우트 주석에 있다 — 응답이 s-maxage 로
   * CDN 에 앉는데 proxy 가 심는 헤더는 캐시 키에 안 들어간다.
   */
  const detailForId = sheetOpen ? visibleActiveId : null;
  const [detail, setDetail] = useState<MapPlaceDetail | null>(null);
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const [detailFor, setDetailFor] = useState<string | null>(detailForId);
  if (detailFor !== detailForId) {
    setDetailFor(detailForId);
    setDetail(null);
    setSettledFor(null);
  }
  const detailLoading = Boolean(detailForId) && settledFor !== detailForId;

  useEffect(() => {
    if (!detailForId) return;
    const id = detailForId;
    let alive = true;
    const settle = (row: MapPlaceDetail | null) => {
      if (!alive) return;
      setDetail(row);
      setSettledFor(id);
    };
    fetch(`/api/map/place/${id}?l=${locale}`, { priority: "high" } as RequestInit)
      .then((res) => (res.ok ? res.json() : null))
      .then(settle)
      .catch(() => settle(null));
    return () => {
      alive = false;
    };
  }, [detailForId, locale]);

  /** 채널 필터 중이면 출처도 그 채널만 — "이 사람이 간 장면"에 맞춤 */
  const sourcesFor = (sources: PlaceSource[]) =>
    channel ? sources.filter((s) => s.creatorSlug === channel) : sources;

  return (
    <div className="canvas-page">
      {/* 지도 — 이 화면의 본체. 시트가 이 안에 절대배치되므로 relative 필수 */}
      <div className="canvas-map">
        <MapView
          className="h-full w-full"
          pins={pins}
          activeId={visibleActiveId}
          onPinClick={onPinClick}
          cluster
        />
        {sheetOpen && activePlace ? (
          <PlaceSheet
            index={activeIndex + 1}
            place={{
              id: activePlace.id,
              slug: activePlace.slug,
              name: displayPlaceName(activePlace, locale),
              nameLocal: activePlace.nameLocal,
              typeLabel: m.placeTypes[activePlace.placeType],
              /* 주소는 목록이 이미 갖고 있다 — 상세가 오기 전에도 빈칸이 안 남는다 */
              address: activePlace.address,
              summary: detail?.summary ?? EMPTY_SUMMARY,
              mapLinks: detail?.mapLinks ?? [],
              sources: detail ? sourcesFor(detail.sources) : [],
              celebrities: detail?.celebrities ?? [],
            }}
            loading={detailLoading}
            heroHint={
              activePlace.youtubeId
                ? { creatorSlug: channel ?? "", youtubeId: activePlace.youtubeId }
                : null
            }
            onClose={() => setSheetOpen(false)}
            onSelectChannel={applyChannelFromDrawer}
          />
        ) : null}
      </div>

      <section className="canvas-panel">
        {/* 데스크톱 h1 — 모바일 h1(페이지 헤더, lg:hidden)과 공유 버튼 짝을 맞춘다 */}
        <div className="hidden items-start gap-2 px-(--gutter) pt-4 pb-1 lg:flex">
          <h1
            className="min-w-0 flex-1 font-black"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
          >
            {cityName}
          </h1>
          <ShareButton title={cityName} bare className="mt-0.5" />
        </div>
        <div className="flex flex-col gap-3 px-(--gutter) pt-5 pb-4 lg:pt-3">
          {presentTypes.length > 1 ? (
            <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
              <Chip active={type === null} onClick={() => selectType(null)}>
                {m.cityDetail.allTypes}
              </Chip>
              {presentTypes.map((t) => (
                <Chip
                  key={t}
                  active={type === t}
                  onClick={() => selectType(type === t ? null : t)}
                >
                  {m.placeTypes[t]}
                </Chip>
              ))}
            </div>
          ) : null}

          {/* 채널 필터 — 2명 이상일 때. URL ?channel= 과 동기화 */}
          {creators.length > 1 ? (
            <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
              <Chip active={channel === null} onClick={() => selectChannel(null)}>
                {m.cityDetail.allChannels}
              </Chip>
              {creators.map((c) => (
                <Chip
                  key={c.slug}
                  active={channel === c.slug}
                  onClick={() => selectChannel(channel === c.slug ? null : c.slug)}
                >
                  {c.displayName}
                  <span className="tnum ml-1.5 opacity-60">{c.placeCount}</span>
                </Chip>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="index tnum" style={{ color: "var(--dim)" }}>
              {/* 개수는 늘 **전체**(서버가 센 total)를 기준으로 말한다. 필터를 건
                  숫자 짝은 꼬리가 도착한 뒤에만 — 앞줄 36곳만 든 순간의 shown 은
                  "몇 곳이 걸렸나"의 답이 아니라, 잠깐 12곳이 떴다 뛰는 값이 된다
                  (`/map` 이 씨앗 6곳에서 겪은 그 버그다). */}
              {!placesReady || shown.length === places.length
                ? t(m.cityDetail.placesAll, { n: total })
                : t(m.cityDetail.placesFiltered, { shown: shown.length, total })}
              {m.cityDetail.pinHint}
            </p>
            {channel ? (
              <Link
                href={href(`/c/${channel}/${citySlug}`)}
                className="index underline-offset-4 hover:underline"
                style={{ color: "var(--wax)" }}
              >
                {m.cityDetail.onlyThisChannel}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-(--block) px-(--gutter) pb-10">
          {shown.length === 0 && !placesReady ? (
            /* 꼬리가 오기 전 — 깊은 링크 필터가 앞줄 36곳에서만 안 걸린 것일 수
               있다. "찾는 곳이 없어요" 를 띄웠다가 곧 목록이 차면 그건 거짓말이다.
               자리를 비워 두고 도착을 기다린다(대개 한 프레임). */
            <span aria-hidden />
          ) : shown.length === 0 ? (
            /* 빈 화면 문법은 `EmptyState` 하나다 — 다음 행동(필터 지우기)은
               이미 있었으니 상자만 갈아 끼운다. */
            <EmptyState message={m.cityDetail.noMatch} className="pt-8 pb-10">
              <Chip
                size="md"
                onClick={() => {
                  setType(null);
                  setChannel(null);
                  syncQuery(null, null);
                }}
              >
                {m.cityDetail.clearFilters}
              </Chip>
            </EmptyState>
          ) : (
            <ol>
              {shown.map((place, index) => {
                const active = place.id === visibleActiveId;
                return (
                  <li
                    key={place.id}
                    id={place.slug}
                    ref={(el: HTMLLIElement | null) => {
                      if (el) rowRefs.current.set(place.id, el);
                      else rowRefs.current.delete(place.id);
                    }}
                  >
                    <Rule />
                    <div
                      className="-mx-2.5 flex flex-col gap-3 px-2.5 py-4 transition-colors"
                      style={{
                        /* `--halo` 다. 예전엔 `--sheet` 였는데 `--ground` 와 둘 다
                           #ffffff 라 지도 핀을 눌러도 목록에서 아무 일도 안 일어났다
                           — 보이는 건 번호 원뿐이고 그건 스크롤하면 화면 밖으로
                           나간다. `--halo` 가 이 시스템에서 "지금 이것"의 면이다. */
                        background: active ? "var(--halo)" : undefined,
                        borderRadius: active ? "var(--r-control)" : undefined,
                      }}
                    >
                      <PlaceRowLink
                        slug={place.slug}
                        onOpen={() => onRowClick(place.id)}
                        active={active}
                        className="flex w-full cursor-pointer items-start gap-3 text-left"
                      >
                        <FrameNo n={index + 1} active={active} />
                        <span className="min-w-0 flex-1">
                          <span
                            className="block font-bold"
                            style={{
                              fontSize: "var(--t-title)",
                              letterSpacing: "-0.025em",
                              lineHeight: 1.3,
                            }}
                          >
                            {displayPlaceName(place, locale)}
                          </span>
                          <span
                            className="mt-1 block"
                            style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                          >
                            {m.placeTypes[place.placeType]}
                            {displayPlaceSecondary(place, locale) ? (
                              <>
                                {" · "}
                                <span lang={locale === "en" ? "ko" : "ja"}>
                                  {displayPlaceSecondary(place, locale)}
                                </span>
                              </>
                            ) : null}
                          </span>
                          {place.address ? (
                            <span
                              className="mt-0.5 block"
                              style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                            >
                              {place.address}
                            </span>
                          ) : null}
                        </span>
                      </PlaceRowLink>
                      {/* 요약·유튜브·지도 링크는 여기 없다 — 드로어와 `/place/[slug]` 가
                          맡는다. 행에 그리던 시절 이 목록 하나가 3.1MB 였다(위 CityPlace 주석).
                          아웃링크를 가리는 게 아니라 한 단계 뒤로 옮긴 것이고,
                          `/map` 목록이 이미 같은 문법이다. */}
                    </div>
                  </li>
                );
              })}
              <Rule />
            </ol>
          )}

          {/* 다음 행동 — 채널×도시 조각으로 */}
          {creators.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="index" style={{ color: "var(--dim)" }}>
                {t(m.cityDetail.channelsInCity, { city: cityName })}
              </h2>
              <div className="flex flex-wrap gap-2">
                {creators.map((c) => (
                  <Chip key={c.slug} href={href(`/c/${c.slug}/${citySlug}`)}>
                    {c.displayName}
                    <span className="tnum ml-1.5 opacity-60">{c.placeCount}</span>
                  </Chip>
                ))}
              </div>
            </section>
          ) : null}

          <Link
            href={href("/map")}
            className="index inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
            style={{ color: "var(--dim)" }}
          >
            <Icon.back className="size-3.5" />
            {m.cityDetail.otherCities}
          </Link>
        </div>
      </section>
    </div>
  );
}
