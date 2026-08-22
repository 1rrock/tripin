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
  places,
  creators,
  initialType,
  initialChannel,
}: {
  cityName: string;
  citySlug: string;
  places: CityPlace[];
  creators: CityCreator[];
  initialType: PlaceType | null;
  initialChannel: string | null;
}) {
  const { messages: m, href, t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [type, setType] = useState<PlaceType | null>(initialType);
  const [channel, setChannel] = useState<string | null>(initialChannel);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rowRefs = useRef<globalThis.Map<string, HTMLLIElement>>(new globalThis.Map());

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

  const presentTypes = FILTERABLE_TYPES.filter((t) => places.some((p) => p.placeType === t));

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
              {shown.length === places.length
                ? t(m.cityDetail.placesAll, { n: places.length })
                : t(m.cityDetail.placesFiltered, { shown: shown.length, total: places.length })}
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
          {shown.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
                {m.cityDetail.noMatch}
              </p>
              <Chip
                onClick={() => {
                  setType(null);
                  setChannel(null);
                  syncQuery(null, null);
                }}
              >
                {m.cityDetail.clearFilters}
              </Chip>
            </div>
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
                        background: active ? "var(--sheet)" : undefined,
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
