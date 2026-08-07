"use client";

/**
 * 채널×도시 탐색 화면 — 지도↔리스트 양방향 연동 (CONCEPT.md 4.3). 콘택트 시트.
 *
 *   · 모바일: 지도가 상부를 잡고 장소 리스트가 그 아래로 올라탄다 (지도 앱 문법)
 *   · 데스크톱: 좌 리스트 패널 + 우 sticky 지도
 *   · 지도 핀 번호 ↔ 행 번호 연동 — 선택은 클릭으로만, 재클릭 시 해제
 *   · candidate 는 지도에 없고 "위치 확인 중" 섹션에 격리 (P3 원칙)
 *   · 모든 항목의 종착지는 아웃링크 2개: 타임스탬프 영상 / 지도 열기 (P4 원칙)
 *   · 담기(?picked=) — 선택을 URL에 남겨 공유·재방문. 담기 시 하단 고정 "내 목록" 바 등장
 *
 * 지도는 이 월드에서 **라이트박스**다 — 암실(어두운 지면)에 놓인 유일하게 밝은 면.
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
import { Act, Chip, FrameNo, Icon, Rule } from "@/shared/ui/frame";
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
  /** URL(?picked=)에서 복원한 담은 장소 slug 목록 — 공유·재방문용. */
  initialPicked?: string[];
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
  creatorInitials,
  creatorAvatar,
  accentColor,
  cityName,
  introText,
  places,
  activeType,
  basePath,
  initialPicked = [],
  otherCities = [],
  otherCreators = [],
}: ExplorerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // 핀을 눌렀을 때만 상세 시트를 띄운다. 목록 행은 그 자체가 이미 상세라
  // 행을 눌렀다고 시트까지 겹쳐 띄우면 같은 내용이 두 번 나온다.
  const [sheetOpen, setSheetOpen] = useState(false);
  // 담기 — 여행 직전 사용자의 실제 과업은 "훑기"가 아니라 "내 목록 만들기".
  // URL(?picked=slug,slug)에 남겨 공유·재방문이 가능하게 한다 (slug 는 공개 식별자).
  // ?picked= 는 사용자가 손댈 수 있는 입력 — 이 조각에 실제로 있는 slug 만 통과시킨다.
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => {
    const known = new Set(places.map((p) => p.slug));
    return new Set(initialPicked.filter((s) => known.has(s)));
  });
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
  const presentTypes = FILTERABLE_TYPES.filter((t) => places.some((p) => p.placeType === t));

  // basePath = /c/[creator]/[city] — 다음 행동 칩의 교차 링크에 재사용
  const [, , creatorSlug, citySlug] = basePath.split("/");

  /** 필터·담기 상태를 모두 담은 URL — 필터 칩 href 와 담기 동기화가 같은 규칙을 쓴다. */
  const buildUrl = (type: PlaceType | null, pickedSet: ReadonlySet<string>) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (pickedSet.size > 0) params.set("picked", [...pickedSet].join(","));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
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

  const togglePick = (slug: string) => {
    const next = new Set(picked);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setPicked(next);
    // RSC 왕복 없이 URL 만 동기화 — Next 가 지원하는 얕은 히스토리 갱신
    window.history.replaceState(null, "", buildUrl(activeType, next));
  };

  /* 시트에 넘길 모양으로 옮긴다. 이 화면은 채널이 하나라 출처도 항상 하나다 —
     도시 페이지에서만 한 장소에 여러 채널이 붙는다 */
  const sheetIndex = confirmed.findIndex((p) => p.id === visibleActiveId);
  const sheetSource = sheetIndex >= 0 ? confirmed[sheetIndex]! : null;
  const sheetPlace: SheetPlace | null = sheetSource
    ? {
        name: sheetSource.name,
        nameLocal: sheetSource.nameLocal,
        typeLabel: PLACE_TYPE_LABELS[sheetSource.placeType],
        address: sheetSource.address,
        summary: sheetSource.summary,
        summaryBullets: sheetSource.summaryBullets,
        priceHint: sheetSource.priceHint,
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
                videoTitle: sheetSource.videoTitle ?? "출처 영상",
                timestampSec: sheetSource.timestampSec,
              },
            ]
          : [],
      }
    : null;

  const copyPickedLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한 거부 — 주소창 URL 이 이미 같은 값이므로 조용히 무시
    }
  };

  return (
    <main style={{ "--hl": accentColor } as React.CSSProperties}>
      <div className="lg:grid lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start lg:gap-7 lg:px-(--gutter) lg:pt-4">
        {/* 지도 = 라이트박스. 모바일은 상부, 데스크톱은 우측 sticky.
            시트가 데스크톱에서 이 안에 절대배치되므로 relative 가 필요하다 */}
        <div className="relative lg:sticky lg:top-4 lg:order-2">
          <MapView
            className="h-[38dvh] w-full lg:h-[calc(100dvh-2rem)]"
            pins={pins}
            activeId={visibleActiveId}
            onPinClick={openFromPin}
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
              <Link href="/" className="underline-offset-4 hover:underline">
                홈
              </Link>
              <Icon.chevron className="size-2.5" />
              <Link href={`/c/${creatorSlug}`} className="underline-offset-4 hover:underline">
                {creatorName}
              </Link>
              <Icon.chevron className="size-2.5" />
              <span style={{ color: "var(--paper)" }}>{cityName}</span>
            </nav>

            <h1
              className="font-black"
              style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
            >
              {creatorName}의 {cityName}
            </h1>

            <p className="index tnum" style={{ color: "var(--dim)" }}>
              확정 {confirmed.length}
              {candidates.length > 0 ? ` · 확인 중 ${candidates.length}` : ""} · 유형{" "}
              {presentTypes.length}
            </p>

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
                <Chip href={buildUrl(null, picked)} active={activeType === null}>
                  전체
                </Chip>
                {presentTypes.map((t) => (
                  <Chip key={t} href={buildUrl(t, picked)} active={activeType === t}>
                    {PLACE_TYPE_LABELS[t]}
                  </Chip>
                ))}
              </div>
            ) : null}
          </header>

          <div className="flex flex-col gap-(--block) px-(--gutter) pb-10 lg:px-0">
            {confirmed.length === 0 ? (
              <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
                {activeType
                  ? "이 카테고리의 확정 장소가 아직 없어요."
                  : "확정된 장소가 아직 없어요."}
              </p>
            ) : (
              <ol>
                {confirmed.map((place, index) => {
                  const active = place.id === visibleActiveId;
                  const isPicked = picked.has(place.slug);
                  const mapHref = mapsUrl(place);
                  return (
                    <li
                      key={place.id}
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
                              {place.name}
                            </span>
                            <span
                              className="mt-1 block"
                              style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                            >
                              {PLACE_TYPE_LABELS[place.placeType]}
                              {place.nameLocal ? (
                                <>
                                  {" · "}
                                  <span lang="ja">{place.nameLocal}</span>
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
                          <Icon.chevron
                            className="mt-1 size-4 shrink-0 transition-transform"
                            style={{
                              color: "var(--dim)",
                              transform: active ? "rotate(90deg)" : undefined,
                            }}
                          />
                        </button>

                        {place.summaryBullets.length > 0 ? (
                          <ul
                            className="flex flex-col gap-1.5 pl-10"
                            style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}
                          >
                            {place.summaryBullets.map((b, i) => (
                              <li key={i} className="flex gap-2">
                                <span aria-hidden style={{ color: "var(--dim)" }}>
                                  ·
                                </span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        ) : place.summary ? (
                          <p
                            className="pl-10"
                            style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}
                          >
                            {place.summary}
                          </p>
                        ) : null}
                        {place.priceHint ? (
                          <p
                            className="pl-10"
                            style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                          >
                            {place.priceHint}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2 pl-10">
                          {place.youtubeVideoId ? (
                            <Act
                              icon="play"
                              href={youtubeUrl(place.youtubeVideoId, place.timestampSec)}
                              title={place.videoTitle ?? "출처 영상"}
                            >
                              {place.timestampSec !== null
                                ? `영상 ${formatTimestamp(place.timestampSec)}`
                                : "영상 보기"}
                            </Act>
                          ) : null}
                          {mapHref ? (
                            <Act icon="out" href={mapHref}>
                              지도 열기
                            </Act>
                          ) : null}
                          <Act
                            icon="pin"
                            pressed={isPicked}
                            onClick={() => togglePick(place.slug)}
                          >
                            {isPicked ? "담음" : "담기"}
                          </Act>
                        </div>
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
                  위치 확인 중 {candidates.length}
                </h2>
                <ul className="flex flex-col gap-2">
                  {candidates.map((place) => (
                    <li
                      key={place.id}
                      className="flex flex-wrap items-baseline gap-x-2"
                      style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                    >
                      <span className="font-bold" style={{ color: "var(--paper)" }}>
                        {place.name}
                      </span>
                      {place.nameLocal ? <span lang="ja">{place.nameLocal}</span> : null}
                      <span>{PLACE_TYPE_LABELS[place.placeType]}</span>
                      {place.youtubeVideoId ? (
                        <a
                          href={youtubeUrl(place.youtubeVideoId, place.timestampSec)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline underline-offset-4"
                          style={{ color: "var(--paper)" }}
                        >
                          영상 보기
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* 다음 행동 — SEO 1페이지 이탈 구조를 막는 조각 간 연결 (없으면 미렌더) */}
            {otherCities.length > 0 || otherCreators.length > 0 ? (
              <section className="flex flex-col gap-(--stack)">
                {otherCities.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <h2 className="index" style={{ color: "var(--dim)" }}>
                      {creatorName}의 다른 도시
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {otherCities.map((c) => (
                        <Chip key={c.slug} href={`/c/${creatorSlug}/${c.slug}`}>
                          {c.name} <span className="tnum ml-1.5 opacity-60">{c.count}</span>
                        </Chip>
                      ))}
                    </div>
                  </div>
                ) : null}
                {otherCreators.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <h2 className="index" style={{ color: "var(--dim)" }}>
                      {cityName}에 간 다른 채널
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {otherCreators.map((c) => (
                        <Chip key={c.slug} href={`/c/${c.slug}/${citySlug}`}>
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

      {/* 담은 목록 바 — URL 이 곧 저장본이라 "링크 복사"가 공유·재방문 동작이다.
          어두운 지면 위에서 가장 강한 강조는 반전(밝은 면)이다 */}
      {picked.size > 0 ? (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="mx-auto w-full max-w-2xl px-(--gutter) xl:max-w-6xl">
              {/* lg 에서는 리스트 컬럼 폭에 맞춘다 — 지도를 가리지 않는다 */}
              <div className="lg:max-w-[30rem]">
                <div
                  className="rise-in pointer-events-auto flex items-center justify-between gap-3 py-2.5 pr-2.5 pl-4"
                  style={{
                    background: "var(--paper)",
                    borderRadius: "var(--r-control)",
                    boxShadow: "var(--lift)",
                  }}
                >
                  <p
                    style={{
                      color: "var(--ground)",
                      fontSize: "var(--t-body)",
                      fontWeight: 700,
                    }}
                  >
                    내 목록 <span className="tnum">{picked.size}</span>곳
                  </p>
                  {/* 전역 포커스 링이 왁스인데 이 바는 밝은 면이라 왁스 링이 묻는다 —
                      지면 색 링으로 반전한다 (WCAG 2.4.7) */}
                  <button
                    type="button"
                    onClick={copyPickedLink}
                    className="cursor-pointer px-3.5 py-2 font-bold focus-visible:outline-[color:var(--ground)]"
                    style={{
                      background: "var(--ground)",
                      color: "var(--paper)",
                      borderRadius: "var(--r-frame)",
                      fontSize: "var(--t-meta)",
                    }}
                  >
                    {copied ? "복사됨" : "링크 복사"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* 하단 바가 마지막 항목을 가리지 않게 여백 확보 */}
          <div aria-hidden className="h-24" />
        </>
      ) : null}
    </main>
  );
}
