"use client";

/**
 * 채널×도시 탐색 화면 — 지도↔리스트 양방향 연동 (CONCEPT.md 4.3), 편집자막 월드.
 *
 *   · 이 조각의 형광펜(--hl)은 크리에이터 액센트색 — 페이지 전체가 그 채널의 색을 입는다
 *   · 챕터 바 = 장소 수만큼 나뉜 세그먼트. 지도 핀 번호·리스트 번호와 1:1 (3중 연동)
 *   · 장소명은 자막체, 선택 시 형광펜 긋기(pen-sweep) — 이 화면의 유일한 authored 모션
 *   · candidate 는 지도에 없고 [위치 확인 중] 섹션에 격리 (P3 원칙)
 *   · 모든 항목의 종착지는 아웃링크 2개: 타임스탬프 영상 / 지도 열기 (P4 원칙)
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { MapStatus, PlaceType } from "@/shared/api/database.types";
import { isDarkHex } from "@/shared/lib/color";
import { primaryMapLink } from "@/shared/lib/map-links";
import { MapView } from "@/shared/ui/MapView";
import { FILTERABLE_TYPES, PLACE_TYPE_LABELS } from "@/shared/ui/place-types";

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
  summary: string | null;
  summaryBullets: string[];
  priceHint: string | null;
  videoTitle: string | null;
  youtubeVideoId: string | null;
  timestampSec: number | null;
}

interface ExplorerProps {
  creatorName: string;
  accentColor: string;
  cityName: string;
  introText: string | null;
  places: PublicPlace[];
  activeType: PlaceType | null;
  basePath: string;
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

/** 지도 앱 열기 — 확보된 ID 우선(구글→카카오→네이버), 없으면 좌표 폴백. */
function mapsUrl(place: PublicPlace): string | null {
  return (
    primaryMapLink({
      googleMapsUrl: place.googleMapsUrl,
      googlePlaceId: place.googlePlaceId,
      kakaoPlaceId: place.kakaoPlaceId,
      naverPlaceId: place.naverPlaceId,
      lat: place.lat,
      lng: place.lng,
    })?.url ?? null
  );
}

export function Explorer({
  creatorName,
  accentColor,
  cityName,
  introText,
  places,
  activeType,
  basePath,
}: ExplorerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<globalThis.Map<string, HTMLLIElement>>(new globalThis.Map());

  const filtered = activeType ? places.filter((p) => p.placeType === activeType) : places;
  const confirmed = filtered.filter(
    (p) => p.mapStatus === "confirmed" && p.lat !== null && p.lng !== null,
  );
  const candidates = filtered.filter((p) => p.mapStatus === "candidate");

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
  const presentTypes = FILTERABLE_TYPES.filter((t) => places.some((p) => p.placeType === t));

  const selectPlace = (id: string) => {
    setActiveId(id);
    listRef.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <main
      className="mx-auto max-w-5xl px-5"
      style={{ "--hl": accentColor } as React.CSSProperties}
    >
      {/* 헤더 — 지도보다 위 (LCP 에 지도 스크립트가 끼지 않게, CONCEPT.md 4.3 성능 규칙) */}
      <section className="pt-8 pb-5">
        <nav className="text-sm text-ink-soft">
          <Link href="/" className="hover:text-ink hover:underline">
            홈
          </Link>
          <span className="mx-1.5">›</span>
          <span>{creatorName}</span>
          <span className="mx-1.5">›</span>
          <span className="text-ink">{cityName}</span>
        </nav>

        <h1 className="subtitle-face mt-3 text-3xl sm:text-4xl">
          {creatorName}의 <span className="hl-pen">{cityName}</span>{" "}
          <span className="timecode-face align-middle text-lg text-ink-soft">
            간 곳 {confirmed.length}
          </span>
        </h1>
        <p className="meta-label mt-2.5">모든 장소에 출처 영상 · 타임스탬프 포함</p>
        {introText ? <p className="mt-3 max-w-2xl text-ink-soft">{introText}</p> : null}

        {presentTypes.length > 1 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={basePath}
              className={`border-2 border-ink px-3 py-1 text-sm font-bold transition ${
                activeType === null ? "bg-ink text-white" : "hover:bg-neutral-100"
              }`}
            >
              전체
            </Link>
            {presentTypes.map((t) => (
              <Link
                key={t}
                href={`${basePath}?type=${t}`}
                className={`border-2 border-ink px-3 py-1 text-sm font-bold transition ${
                  activeType === t ? "bg-ink text-white" : "hover:bg-neutral-100"
                }`}
              >
                {PLACE_TYPE_LABELS[t]}
              </Link>
            ))}
          </div>
        ) : null}

        {/* 챕터 바 — 장소 수만큼 세그먼트, 핀·리스트 번호와 1:1.
            비활성 색은 액센트 명도에 따라 잉크/흰색을 섞는다 — 흰 지면 대비 3:1(WCAG 1.4.11)과
            활성(잉크) 세그먼트와의 구분을 어떤 액센트색에서도 동시에 지키기 위함 */}
        {confirmed.length > 1 ? (
          <div className="mt-5 flex gap-1" role="group" aria-label="장소 챕터">
            {confirmed.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === activeId}
                aria-label={`${i + 1}. ${p.name}`}
                onClick={() => selectPlace(p.id)}
                className="h-2 flex-1 cursor-pointer rounded-none transition-colors"
                style={{
                  backgroundColor:
                    p.id === activeId
                      ? "var(--ink)"
                      : isDarkHex(accentColor)
                        ? "color-mix(in srgb, var(--hl) 60%, white)"
                        : "color-mix(in srgb, var(--hl) 60%, var(--ink))",
                }}
              />
            ))}
          </div>
        ) : null}
      </section>

      <div className="gap-8 lg:grid lg:grid-cols-[420px_1fr] lg:items-start">
        {/* 지도 — 모바일은 상단 고정 높이, 데스크톱은 우측 sticky */}
        <div className="lg:order-2 lg:sticky lg:top-20">
          <MapView
            className="h-[40dvh] w-full border-2 border-ink lg:h-[calc(100dvh-7rem)]"
            pins={pins}
            activeId={activeId}
            onPinClick={selectPlace}
          />
        </div>

        {/* 리스트 — 자막 블록의 세로 나열 (카드 없음) */}
        <div className="mt-8 lg:order-1 lg:mt-0">
          {confirmed.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">
              {activeType
                ? "이 카테고리의 확정 장소가 아직 없습니다."
                : "확정된 장소가 아직 없습니다."}
            </p>
          ) : (
            <ol className="space-y-8">
              {confirmed.map((place, index) => {
                const active = place.id === activeId;
                const mapHref = mapsUrl(place);
                return (
                  <li
                    key={place.id}
                    ref={(el) => {
                      if (el) listRef.current.set(place.id, el);
                      else listRef.current.delete(place.id);
                    }}
                  >
                    <div className="flex items-baseline gap-2.5">
                      <span aria-hidden className="timecode-face text-sm font-bold text-ink-soft">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="meta-label">{PLACE_TYPE_LABELS[place.placeType]}</span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                      <h2 className="subtitle-face text-2xl">
                        {/* 선택은 클릭으로만 — 지도 핀·챕터 바와 동기화, 키보드 접근 가능.
                            호버 밑줄 + 포인터가 "누를 수 있음"의 어포던스 */}
                        <button
                          type="button"
                          onClick={() => setActiveId(place.id)}
                          className="cursor-pointer text-left decoration-2 underline-offset-4 hover:underline"
                        >
                          <span className={active ? "hl-pen hl-pen-sweep" : ""}>{place.name}</span>
                        </button>
                      </h2>
                      {place.nameLocal ? (
                        <span lang="ja" className="text-base text-ink-soft">
                          {place.nameLocal}
                        </span>
                      ) : null}
                    </div>

                    {place.address ? (
                      <p className="mt-1 text-sm text-ink-soft">{place.address}</p>
                    ) : null}

                    {place.summaryBullets.length > 0 ? (
                      <ul className="mt-2.5 space-y-1 text-[0.9375rem] leading-relaxed">
                        {place.summaryBullets.map((b, i) => (
                          <li key={i} className="flex gap-2">
                            <span aria-hidden className="text-ink-soft">
                              —
                            </span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    ) : place.summary ? (
                      <p className="mt-2.5 text-[0.9375rem] leading-relaxed">{place.summary}</p>
                    ) : null}
                    {place.priceHint ? (
                      <p className="mt-1.5 text-sm text-ink-soft">{place.priceHint}</p>
                    ) : null}

                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      {place.youtubeVideoId ? (
                        <a
                          href={youtubeUrl(place.youtubeVideoId, place.timestampSec)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ts-chip transition hover:opacity-80"
                          title={place.videoTitle ?? "출처 영상"}
                        >
                          {place.timestampSec !== null
                            ? formatTimestamp(place.timestampSec)
                            : "영상"}{" "}
                          ▸
                        </a>
                      ) : null}
                      {mapHref ? (
                        <a
                          href={mapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border-2 border-ink px-2.5 py-[0.3rem] text-xs font-bold transition hover:bg-ink hover:text-white"
                        >
                          지도 열기
                        </a>
                      ) : null}
                      {place.videoTitle ? (
                        <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                          {place.videoTitle}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* candidate 격리 섹션 — 지도 핀 없음 (CONCEPT.md 4.3) */}
          {candidates.length > 0 ? (
            <section className="mt-14 border-t border-neutral-200 pt-6">
              <h2 className="meta-label">위치 확인 중 {candidates.length}</h2>
              <ul className="mt-3 space-y-2.5">
                {candidates.map((place) => (
                  <li key={place.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-bold">{place.name}</span>
                    {place.nameLocal ? (
                      <span lang="ja" className="text-ink-soft">
                        {place.nameLocal}
                      </span>
                    ) : null}
                    <span className="meta-label">{PLACE_TYPE_LABELS[place.placeType]}</span>
                    {place.youtubeVideoId ? (
                      <a
                        href={youtubeUrl(place.youtubeVideoId, place.timestampSec)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-ink"
                      >
                        영상 보기
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
