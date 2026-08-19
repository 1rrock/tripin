"use client";

/**
 * 채널×도시 탐색 화면 — 지도↔리스트 양방향 연동 (CONCEPT.md 4.3). 콘택트 시트.
 *
 *   · 모바일: 지도가 상부를 잡고 장소 리스트가 그 아래로 올라탄다 (지도 앱 문법)
 *   · 데스크톱: 좌 리스트 패널 + 우 sticky 지도
 *   · 지도 핀 번호 ↔ 행 번호 연동 — 선택은 클릭으로만, 재클릭 시 해제
 *   · candidate 는 지도에 없고 "위치 확인 중" 섹션에 격리 (P3 원칙)
 *   · 모든 항목의 종착지는 아웃링크 2개: 타임스탬프 영상 / 지도 열기 (P4 원칙)
 *   · 저장은 하트(`/saved`). URL 임시 담기(내 목록)는 쓰지 않는다.
 *
 * 지도는 이 월드에서 **라이트박스**다 — 웜 페이퍼 지면과 같은 크림 축의 밝은 면.
 * 낮에 길 위에서 지도를 봐야 한다는 사용 장면과 어두운 지면이 충돌하는데,
 * 월드 자신의 물건으로 그 충돌을 해소한다. 테마 분기가 아니라 재료의 차이다.
 *
 * 크리에이터 액센트(--hl)는 **지도 핀에만** 남긴다. 목록까지 액센트를 칠하면
 * 왁스(선택 표시)와 액센트가 같은 층에서 싸운다.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { MapStatus, PlaceType } from "@/shared/api/database.types";
import { primaryMapLink } from "@/shared/lib/map-links";
import { MapView } from "@/shared/ui/MapView";
import { PlaceSheet, type SheetPlace } from "@/shared/ui/PlaceSheet";
import { Chip, FrameNo, Rule } from "@/shared/ui/frame"
import { Act, Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayPlaceName, displayPlaceSecondary } from "@/shared/i18n/display";
import type { SummaryDisplay } from "@/shared/i18n/display";
import { SummaryBlock } from "@/shared/ui/SummaryBlock";
import { SaveButton } from "@/shared/ui/SaveButton";

/**
 * `page.tsx` 가 이미 로케일로 `summary` 를 확정해서 넘긴다 — ko/en 원본을 그대로
 * 이 클라이언트 컴포넌트에 넘기면 props 직렬화로 EN 페이지 HTML 에 한국어 원문이
 * 새어 나간다(검증 중 실제로 걸렸다: grep 이 0이어야 할 자리에 1이 나왔다).
 */
export interface PublicPlace {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PlaceType;
  mapStatus: MapStatus;
  lat: number | null;
  lng: number | null;
  address: string | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  kakaoPlaceId: string | null;
  naverPlaceId: string | null;
  /** 지도 앱 링크 순서(네이버 우선 vs 구글 우선)를 가른다 — shared/lib/map-links.ts */
  countryCode: string | null;
  summary: SummaryDisplay;
  videoTitle: string | null;
  youtubeVideoId: string | null;
  timestampSec: number | null;
}

/** 다음 행동 칩 — 같은 채널의 다른 도시 / 같은 도시의 다른 채널. */
export interface RelatedPiece {
  slug: string;
  name: string;
  count: number;
}

interface ExplorerProps {
  creatorName: string;
  /** 핀 상세 시트의 출처 표식용 */
  creatorInitials: string;
  creatorAvatar: string | null;
  accentColor: string;
  cityName: string;
  introText: string | null;
  places: PublicPlace[];
  activeType: PlaceType | null;
  basePath: string;
  otherCities?: RelatedPiece[];
  otherCreators?: RelatedPiece[];
}

function formatTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** 아웃링크 — 유튜브는 타임스탬프 포함 (&t=초). */
function youtubeUrl(videoId: string, timestampSec: number | null): string {
  return `https://www.youtube.com/watch?v=${videoId}${timestampSec ? `&t=${timestampSec}s` : ""}`;
}

/** 지도 앱 열기 — 한국은 네이버→카카오→구글, 그 외는 구글→카카오→네이버, 없으면 좌표 폴백. */
function mapsUrl(place: PublicPlace): string | null {
  return (
    primaryMapLink({
      googleMapsUrl: place.googleMapsUrl,
      googlePlaceId: place.googlePlaceId,
      kakaoPlaceId: place.kakaoPlaceId,
      naverPlaceId: place.naverPlaceId,
      lat: place.lat,
      lng: place.lng,
      countryCode: place.countryCode,
    })?.url ?? null
  );
}

export function Explorer({
  creatorName,
  creatorInitials,
  creatorAvatar,
  accentColor,
  cityName,
  introText,
  places,
  activeType,
  basePath,
  otherCities = [],
  otherCreators = [],
}: ExplorerProps) {
  const { messages: m, href, t, locale } = useLocale();
  const firstConfirmedId =
    places.find((p) => p.mapStatus === "confirmed" && p.lat !== null && p.lng !== null)?.id ??
    null;
  const [activeId, setActiveId] = useState<string | null>(firstConfirmedId);
  // 핀을 눌렀을 때만 상세 시트를 띄운다. 목록 행은 그 자체가 이미 상세라
  // 행을 눌렀다고 시트까지 겹쳐 띄우면 같은 내용이 두 번 나온다.
  const [sheetOpen, setSheetOpen] = useState(false);
  const listRef = useRef<globalThis.Map<string, HTMLLIElement>>(new globalThis.Map());

  const filtered = activeType ? places.filter((p) => p.placeType === activeType) : places;
  const confirmed = filtered.filter(
    (p) => p.mapStatus === "confirmed" && p.lat !== null && p.lng !== null,
  );
  const candidates = filtered.filter((p) => p.mapStatus === "candidate");

  // 필터로 가려진 선택은 지도·리스트 어디에도 없다 — 표시 기준은 항상 이 값
  const visibleActiveId =
    activeId !== null && confirmed.some((p) => p.id === activeId) ? activeId : null;

  // 핀 배열 안정화 — 선택(activeId) 리렌더마다 새 배열을 만들면
  // MapView 가 마커·뷰포트를 리셋한다 (MapView 의 시그니처 가드와 이중 방어)
  const pins = useMemo(
    () =>
      confirmed.map((p, i) => ({
        id: p.id,
        name: p.name,
        lat: p.lat!,
        lng: p.lng!,
        index: i + 1,
        accentColor,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [places, activeType, accentColor],
  );

  // 이 조각에 실제로 존재하는 타입만 필터 칩으로 노출
  const presentTypes = FILTERABLE_TYPES.filter((pt) => places.some((p) => p.placeType === pt));
  /** 얇은 조각은 교차 채널을 접힌 아래에 두면 "없다"로 읽힌다 — 헤더로 올린다 */
  const thinPiece = confirmed.length <= 4;

  // basePath = /c/[creator]/[city] — 다음 행동 칩의 교차 링크에 재사용
  const [, , creatorSlug, citySlug] = basePath.split("/");

  /** 필터 칩 href. basePath 는 로케일 없는 내부 경로라 href() 로 접두사를 붙인다. */
  const buildUrl = (type: PlaceType | null) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    const qs = params.toString();
    const path = href(basePath);
    return qs ? `${path}?${qs}` : path;
  };

  /** 선택된 행이 화면 밖이면 끌어온다. 이미 보이면 건드리지 않는다 */
  const revealRow = (id: string) => {
    const el = listRef.current.get(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (!fullyVisible) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /** 목록 행 — 지도만 그 핀으로 옮긴다. 행이 이미 상세라 시트는 띄우지 않는다 */
  const selectPlace = (id: string) => {
    setSheetOpen(false);
    const next = visibleActiveId === id ? null : id;
    setActiveId(next);
    if (next !== null) revealRow(next);
  };

  /** 지도 핀 — 상세 시트를 연다. 지도에는 이름 말고 들어갈 자리가 없다 */
  const openFromPin = (id: string) => {
    if (visibleActiveId === id && sheetOpen) {
      setSheetOpen(false);
      setActiveId(null);
      return;
    }
    setActiveId(id);
    setSheetOpen(true);
    revealRow(id);
  };

  /* 시트에 넘길 모양으로 옮긴다. 이 화면은 채널이 하나라 출처도 항상 하나다 —
     도시 페이지에서만 한 장소에 여러 채널이 붙는다 */
  const sheetIndex = confirmed.findIndex((p) => p.id === visibleActiveId);
  const sheetSource = sheetIndex >= 0 ? confirmed[sheetIndex]! : null;
  const sheetPlace: SheetPlace | null = sheetSource
    ? {
        id: sheetSource.id,
        name: displayPlaceName(sheetSource, locale),
        nameLocal: sheetSource.nameLocal,
        typeLabel: m.placeTypes[sheetSource.placeType],
        address: sheetSource.address,
        summary: sheetSource.summary,
        mapUrl: mapsUrl(sheetSource),
        sources: sheetSource.youtubeVideoId
          ? [
              {
                creatorSlug,
                creatorName,
                initials: creatorInitials,
                accentColor,
                avatarUrl: creatorAvatar,
                youtubeId: sheetSource.youtubeVideoId,
                videoTitle: sheetSource.videoTitle ?? m.piece.sourceVideoFallback,
                timestampSec: sheetSource.timestampSec,
              },
            ]
          : [],
      }
    : null;

  return (
    <main style={{ "--hl": accentColor } as React.CSSProperties}>
      <div className="lg:grid lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start lg:gap-7 lg:px-(--gutter) lg:pt-4">
        {/* 지도 = 라이트박스. 모바일은 상부, 데스크톱은 우측 sticky.
            시트가 데스크톱에서 이 안에 절대배치되므로 relative 가 필요하다 */}
        <div className="relative lg:sticky lg:top-4 lg:order-2">
          <MapView
            className="h-[28dvh] min-h-[11.5rem] w-full lg:h-[calc(100dvh-2rem)] lg:min-h-0"
            pins={pins}
            activeId={visibleActiveId}
            onPinClick={openFromPin}
            cluster
          />
          {sheetOpen && sheetPlace ? (
            <PlaceSheet
              index={sheetIndex + 1}
              place={sheetPlace}
              onClose={() => setSheetOpen(false)}
            />
          ) : null}
        </div>

        <section className="lg:order-1">
          <header className="flex flex-col gap-3.5 px-(--gutter) pt-6 pb-5 lg:px-0 lg:pt-0">
            <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
              <Link href={href("/")} className="underline-offset-4 hover:underline">
                {m.common.home}
              </Link>
              <Icon.chevron className="size-2.5" />
              <Link
                href={href(`/c/${creatorSlug}`)}
                className="underline-offset-4 hover:underline"
              >
                {creatorName}
              </Link>
              <Icon.chevron className="size-2.5" />
              <span style={{ color: "var(--paper)" }}>{cityName}</span>
            </nav>

            <h1
              className="font-black"
              style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
            >
              {t(m.piece.title, { creator: creatorName, city: cityName })}
            </h1>

            <p className="index tnum" style={{ color: "var(--dim)" }}>
              {t(m.piece.statsConfirmed, { n: confirmed.length })}
              {candidates.length > 0 ? t(m.piece.statsCandidates, { n: candidates.length }) : ""}
              {t(m.piece.statsTypes, { n: presentTypes.length })}
            </p>

            {thinPiece && otherCreators.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <h2 className="index" style={{ color: "var(--dim)" }}>
                  {t(m.piece.otherCreatorsHeading, { city: cityName })}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Chip href={href(`/city/${citySlug}`)}>
                    {t(m.piece.cityWide, { city: cityName })}
                  </Chip>
                  {otherCreators.map((c) => (
                    <Chip key={c.slug} href={href(`/c/${c.slug}/${citySlug}`)}>
                      {c.name} <span className="tnum ml-1.5 opacity-60">{c.count}</span>
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}

            {introText ? (
              <p
                className="max-w-[42ch]"
                style={{ fontSize: "var(--t-body)", lineHeight: 1.7, color: "var(--dim)" }}
              >
                {introText}
              </p>
            ) : null}

            {presentTypes.length > 1 ? (
              <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
                <Chip href={buildUrl(null)} active={activeType === null} scroll={false}>
                  {m.piece.filterAll}
                </Chip>
                {presentTypes.map((pt) => (
                  <Chip
                    key={pt}
                    href={buildUrl(pt)}
                    active={activeType === pt}
                    scroll={false}
                  >
                    {m.placeTypes[pt]}
                  </Chip>
                ))}
              </div>
            ) : null}
          </header>

          <div className="flex flex-col gap-(--block) px-(--gutter) pb-10 lg:px-0">
            {confirmed.length === 0 ? (
              <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
                {activeType ? m.piece.emptyFiltered : m.piece.emptyAll}
              </p>
            ) : (
              <ol>
                {confirmed.map((place, index) => {
                  const active = place.id === visibleActiveId;
                  const mapHref = mapsUrl(place);
                  const placeName = displayPlaceName(place, locale);
                  return (
                    <li
                      key={place.id}
                      id={place.slug}
                      ref={(el: HTMLLIElement | null) => {
                        if (el) listRef.current.set(place.id, el);
                        else listRef.current.delete(place.id);
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
                        {/* 헤더 전체가 선택 트리거 — 지도 핀과 같은 selectPlace 하나로 통일 */}
                        <button
                          type="button"
                          onClick={() => selectPlace(place.id)}
                          aria-pressed={active}
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
                              {placeName}
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
                        </button>

                        <div className="flex flex-wrap items-center gap-2 pl-10">
                          {place.youtubeVideoId ? (
                            <Act
                              icon="play"
                              href={youtubeUrl(place.youtubeVideoId, place.timestampSec)}
                              title={place.videoTitle ?? m.piece.sourceVideoFallback}
                            >
                              {place.timestampSec !== null
                                ? t(m.common.watchAt, { ts: formatTimestamp(place.timestampSec) })
                                : m.common.watchVideo}
                            </Act>
                          ) : null}
                          {mapHref ? (
                            <Act icon="out" href={mapHref}>
                              {m.common.openMap}
                            </Act>
                          ) : null}
                          <SaveButton placeId={place.id} placeName={placeName} />
                        </div>

                        <SummaryBlock className="pl-10" display={place.summary} />

                        {/* 출처 영상 제목 — 원문 그대로 노출 (YouTube API §III.E.3).
                            title= 툴팁만으로는 터치 기기에서 보이지 않는다 */}
                        {place.videoTitle ? (
                          <p
                            className="pl-10"
                            style={{
                              fontSize: "var(--t-meta)",
                              color: "var(--dim)",
                              lineHeight: 1.5,
                            }}
                          >
                            {place.videoTitle}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
                <Rule />
              </ol>
            )}

            {/* candidate 격리 — 지도 핀 없음. 확정된 것과 획의 종류로 구분한다 */}
            {candidates.length > 0 ? (
              <section
                className="flex flex-col gap-3 p-4"
                style={{
                  border: "1px dashed var(--hairline)",
                  borderRadius: "var(--r-control)",
                }}
              >
                <h2 className="index" style={{ color: "var(--dim)" }}>
                  {t(m.piece.pendingHeading, { n: candidates.length })}
                </h2>
                <ul className="flex flex-col gap-2">
                  {candidates.map((place) => (
                    <li
                      key={place.id}
                      className="flex flex-wrap items-baseline gap-x-2"
                      style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                    >
                      <span className="font-bold" style={{ color: "var(--paper)" }}>
                        {displayPlaceName(place, locale)}
                      </span>
                      {displayPlaceSecondary(place, locale) ? (
                        <span lang={locale === "en" ? "ko" : "ja"}>
                          {displayPlaceSecondary(place, locale)}
                        </span>
                      ) : null}
                      <span>{m.placeTypes[place.placeType]}</span>
                      {place.youtubeVideoId ? (
                        <OutboundA
                          href={youtubeUrl(place.youtubeVideoId, place.timestampSec)}
                          className="font-medium underline underline-offset-4"
                          style={{ color: "var(--paper)" }}
                        >
                          {m.common.watchVideo}
                        </OutboundA>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* 다음 행동 — SEO 1페이지 이탈 구조를 막는 조각 간 연결 (없으면 미렌더) */}
            {otherCities.length > 0 || (!thinPiece && otherCreators.length > 0) ? (
              <section className="flex flex-col gap-(--stack)">
                {otherCities.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <h2 className="index" style={{ color: "var(--dim)" }}>
                      {t(m.piece.otherCitiesHeading, { creator: creatorName })}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {otherCities.map((c) => (
                        <Chip key={c.slug} href={href(`/c/${creatorSlug}/${c.slug}`)}>
                          {c.name} <span className="tnum ml-1.5 opacity-60">{c.count}</span>
                        </Chip>
                      ))}
                    </div>
                  </div>
                ) : null}
                {!thinPiece && otherCreators.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <h2 className="index" style={{ color: "var(--dim)" }}>
                      {t(m.piece.otherCreatorsHeading, { city: cityName })}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <Chip href={href(`/city/${citySlug}`)}>
                        {t(m.piece.cityWide, { city: cityName })}
                      </Chip>
                      {otherCreators.map((c) => (
                        <Chip key={c.slug} href={href(`/c/${c.slug}/${citySlug}`)}>
                          {c.name} <span className="tnum ml-1.5 opacity-60">{c.count}</span>
                        </Chip>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
