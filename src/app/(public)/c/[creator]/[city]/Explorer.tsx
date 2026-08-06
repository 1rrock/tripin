"use client";

/**
 * 채널×도시 탐색 화면 — 지도↔리스트 양방향 연동 (CONCEPT.md 4.3), 캐논 월드.
 *
 *   · 모바일: 지도가 상부를 잡고 장소 리스트가 라운드 시트로 올라탄다 (지도 앱 문법)
 *   · 데스크톱: 좌 리스트 패널 + 우 sticky 지도
 *   · 크리에이터 액센트(--hl)는 번호 뱃지·지도 핀·선택 강조에만 주입
 *   · 지도 핀 번호 ↔ 리스트 번호 연동 — 선택은 클릭으로만, 재클릭 시 해제
 *   · candidate 는 지도에 없고 "위치 확인 중" 섹션에 격리 (P3 원칙)
 *   · 모든 항목의 종착지는 아웃링크 2개: 타임스탬프 영상 / 지도 열기 (P4 원칙)
 *   · 담기(?picked=) — 선택을 URL에 남겨 공유·재방문. 담기 시 하단 고정 "내 목록" 바 등장
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

/** 다음 행동 칩 — 같은 채널의 다른 도시 / 같은 도시의 다른 채널. */
export interface RelatedPiece {
  slug: string;
  name: string;
  count: number;
}

interface ExplorerProps {
  creatorName: string;
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

function PlayIcon() {
  return (
    <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M2.2 1.4a.6.6 0 0 1 .9-.5l5.4 3.3a.6.6 0 0 1 0 1L3.1 8.6a.6.6 0 0 1-.9-.5V1.4Z" />
    </svg>
  );
}

/** 브레드크럼 구분자 — 텍스트 글리프 대신 아이콘 시스템과 같은 SVG 획. */
function CrumbIcon() {
  return (
    <svg
      aria-hidden
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-1 inline text-line"
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    >
      <path d="M2.5 1.5h7v9L6 8.2l-3.5 2.3v-9Z" />
    </svg>
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
  initialPicked = [],
  otherCities = [],
  otherCreators = [],
}: ExplorerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // 담기 — 여행 직전 사용자의 실제 과업은 "훑기"가 아니라 "내 목록 만들기".
  // URL(?picked=slug,slug)에 남겨 공유·재방문이 가능하게 한다 (slug 는 공개 식별자).
  // ?picked= 는 사용자가 손댈 수 있는 입력 — 이 조각에 실제로 있는 slug 만 통과시킨다.
  // (없는 slug 를 그대로 받으면 "내 목록 N곳"만 뜨고 대응하는 카드가 없다)
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

  /**
   * 선택의 단일 진입점 — 리스트 장소명·지도 핀·장소 칩 어디서 눌러도 같은 결과.
   * 같은 항목을 다시 누르면 해제(토글), 이미 화면 안에 있으면 스크롤 생략.
   */
  const selectPlace = (id: string) => {
    const next = visibleActiveId === id ? null : id;
    setActiveId(next);
    if (next === null) return;
    const el = listRef.current.get(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (!fullyVisible) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const togglePick = (slug: string) => {
    const next = new Set(picked);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setPicked(next);
    // RSC 왕복 없이 URL 만 동기화 — Next 가 지원하는 얕은 히스토리 갱신
    window.history.replaceState(null, "", buildUrl(activeType, next));
  };

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

  /* 필터는 아웃라인 필 — 번호 뱃지가 붙는 장소 스트립(회색 필)과 형태로 구분한다 */
  const filterChip = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      scroll={false}
      className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold transition active:opacity-70 ${
        active ? "bg-ink text-paper" : "bg-fill hover:bg-line"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <main style={{ "--hl": accentColor } as React.CSSProperties}>
      <div className="lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start lg:gap-8 lg:px-4 lg:pt-6">
        {/* 지도 — 모바일은 상부 배경, 데스크톱은 우측 sticky 카드 */}
        <div className="lg:sticky lg:top-20 lg:order-2">
          <MapView
            className="h-[38dvh] w-full lg:h-[calc(100dvh-6.5rem)] lg:overflow-hidden lg:rounded-2xl"
            pins={pins}
            activeId={visibleActiveId}
            onPinClick={selectPlace}
          />
        </div>

        {/* 시트 — 모바일에서 지도 위로 올라타는 라운드 패널 */}
        {/* 시트 — 보더 없는 지면. 지도와 같은 평면 위에서 여백과 괘선만으로 선다 */}
        <section className="relative z-10 -mt-6 rounded-t-3xl bg-paper pb-6 sheet-shadow lg:order-1 lg:mt-0 lg:rounded-none lg:bg-transparent lg:pb-4 lg:shadow-none">
          {/* 태블릿(sm~lg)에서도 본문이 65~75ch 을 넘지 않게 폭을 캡 —
              홈과 같은 좌측 정렬 캡 (가운데 정렬은 헤더 정렬선을 깨뜨린다).
              lg 는 시트가 p-6 카드라 자체 패딩 불필요 */}
          {/* 라이브 세션에서 채택된 헤더 — 장소 칩 스트립 제거(리스트와 중복),
              위 여백 확보, 도시명 레몬 밑줄. lg 도 실제 패딩(lg:px-4)을 갖는다 */}
          <header className="w-full max-w-2xl px-6 pt-8 pb-1 md:px-8 lg:max-w-none lg:px-4">
            <nav className="flex items-center text-xs text-ink-soft">
              <Link href="/" className="font-medium transition hover:text-ink">
                홈
              </Link>
              <CrumbIcon />
              <span>{creatorName}</span>
              <CrumbIcon />
              <span className="text-ink">{cityName}</span>
            </nav>
            <h1 className="mt-3.5 text-3xl font-black tracking-tight">
              {creatorName}의 <span className="hl-under">{cityName}</span>
            </h1>
            <p className="mt-3 text-[13px] text-ink-soft">
              <b className="tnum text-[15px] font-extrabold text-ink">간 곳 {confirmed.length}</b>{" "}
              · 모든 장소에 출처 영상·타임스탬프 포함
            </p>
            {introText ? (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{introText}</p>
            ) : null}
            {presentTypes.length > 1 ? (
              <div className="no-scrollbar -mx-6 mt-5 flex gap-2 overflow-x-auto px-6 md:-mx-8 md:px-8 lg:mx-0 lg:flex-wrap lg:px-0">
                {filterChip("전체", buildUrl(null, picked), activeType === null)}
                {presentTypes.map((t) =>
                  filterChip(PLACE_TYPE_LABELS[t], buildUrl(t, picked), activeType === t),
                )}
              </div>
            ) : null}
          </header>

          {/* 리스트 — 라운드 카드의 세로 나열 (좌측 정렬 measure 캡, 홈과 동일 패턴) */}
          <div className="mt-7 w-full max-w-2xl px-6 md:px-8 lg:max-w-none lg:px-4">
            {confirmed.length === 0 ? (
              <div className="border-t border-dashed border-line py-14 text-center text-sm text-ink-soft">
                {activeType
                  ? "이 카테고리의 확정 장소가 아직 없어요."
                  : "확정된 장소가 아직 없어요."}
              </div>
            ) : (
              /* 괘선 리스트 — 균일한 카드 나열 대신 줄로 나누고,
                 "선택된 항목만" 카드로 승격시켜 위계를 만든다 */
              <ol>
                {confirmed.map((place, index) => {
                  const active = place.id === visibleActiveId;
                  const isPicked = picked.has(place.slug);
                  const mapHref = mapsUrl(place);
                  return (
                    <li
                      key={place.id}
                      ref={(el) => {
                        if (el) listRef.current.set(place.id, el);
                        else listRef.current.delete(place.id);
                      }}
                      className={`transition ${
                        active
                          ? "my-1 rounded-xl px-4 py-5 first:mt-0"
                          : "border-b border-line px-1 py-5 first:pt-1 last:border-b-0"
                      }`}
                      style={
                        active
                          ? { background: "color-mix(in srgb, var(--lemon) 32%, var(--card))" }
                          : undefined
                      }
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className="tnum mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                          style={{
                            backgroundColor: "var(--hl)",
                            color: isDarkHex(accentColor) ? "#ffffff" : "var(--ink-fixed)",
                          }}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <h2 className="text-[17px] font-bold leading-snug">
                              {/* 선택은 클릭으로만 — 지도 핀·장소 칩과 같은 selectPlace 하나로 통일 (재클릭 시 해제) */}
                              <button
                                type="button"
                                onClick={() => selectPlace(place.id)}
                                className="cursor-pointer text-left decoration-2 underline-offset-4 transition hover:underline active:opacity-60"
                              >
                                {place.name}
                              </button>
                            </h2>
                            {place.nameLocal ? (
                              <span lang="ja" className="text-sm text-ink-soft">
                                {place.nameLocal}
                              </span>
                            ) : null}
                            <span className="rounded-md bg-fill px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">
                              {PLACE_TYPE_LABELS[place.placeType]}
                            </span>
                          </div>

                          {place.address ? (
                            <p className="mt-1 text-[13px] text-ink-soft">{place.address}</p>
                          ) : null}

                          {place.summaryBullets.length > 0 ? (
                            <ul className="mt-2.5 space-y-1 text-[15px] leading-relaxed">
                              {place.summaryBullets.map((b, i) => (
                                <li key={i} className="flex gap-1.5">
                                  <span aria-hidden className="text-ink-soft">
                                    ·
                                  </span>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          ) : place.summary ? (
                            <p className="mt-2.5 text-[15px] leading-relaxed">{place.summary}</p>
                          ) : null}
                          {place.priceHint ? (
                            <p className="mt-1.5 text-[13px] text-ink-soft">{place.priceHint}</p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {place.youtubeVideoId ? (
                              <a
                                href={youtubeUrl(place.youtubeVideoId, place.timestampSec)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-paper transition hover:opacity-85 active:scale-[0.97]"
                                title={place.videoTitle ?? "출처 영상"}
                              >
                                <PlayIcon />
                                <span className="tnum">
                                  {place.timestampSec !== null
                                    ? `영상 ${formatTimestamp(place.timestampSec)}`
                                    : "영상 보기"}
                                </span>
                              </a>
                            ) : null}
                            {mapHref ? (
                              <a
                                href={mapHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-9 items-center rounded-full bg-fill px-3.5 text-[13px] font-bold transition hover:bg-line active:scale-[0.97]"
                              >
                                지도 열기
                              </a>
                            ) : null}
                            <button
                              type="button"
                              aria-pressed={isPicked}
                              onClick={() => togglePick(place.slug)}
                              className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition active:scale-[0.97] ${
                                isPicked
                                  ? "bg-brand text-on-brand"
                                  : "bg-fill hover:bg-line"
                              }`}
                            >
                              <BookmarkIcon filled={isPicked} />
                              {isPicked ? "담음" : "담기"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* candidate 격리 섹션 — 지도 핀 없음, 점선 괘선 = 미확정 (CONCEPT.md 4.3) */}
            {candidates.length > 0 ? (
              <section className="mt-10 border-t-2 border-dashed border-line pt-5">
                <h2 className="text-sm font-bold">
                  위치 확인 중 <span className="tnum text-ink-soft">{candidates.length}</span>
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {candidates.map((place) => (
                    <li key={place.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-semibold">{place.name}</span>
                      {place.nameLocal ? (
                        <span lang="ja" className="text-ink-soft">
                          {place.nameLocal}
                        </span>
                      ) : null}
                      <span className="text-[11px] font-semibold text-ink-soft">
                        {PLACE_TYPE_LABELS[place.placeType]}
                      </span>
                      {place.youtubeVideoId ? (
                        <a
                          href={youtubeUrl(place.youtubeVideoId, place.timestampSec)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand hover:underline"
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
              <section className="mt-10 space-y-6 border-t border-line pt-6">
                {otherCities.length > 0 ? (
                  <div>
                    <h2 className="text-sm font-bold">{creatorName}의 다른 도시</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {otherCities.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/c/${creatorSlug}/${c.slug}`}
                          className="inline-flex items-baseline gap-1.5 rounded-full bg-lemon px-4 py-2.5 text-[13px] font-extrabold text-on-lemon transition hover:bg-on-lemon hover:text-lemon active:scale-[0.97]"
                        >
                          {c.name}
                          <span className="tnum opacity-60">{c.count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
                {otherCreators.length > 0 ? (
                  <div>
                    <h2 className="text-sm font-bold">{cityName}에 간 다른 채널</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {otherCreators.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/c/${c.slug}/${citySlug}`}
                          className="inline-flex items-baseline gap-1.5 rounded-full bg-lemon px-4 py-2.5 text-[13px] font-extrabold text-on-lemon transition hover:bg-on-lemon hover:text-lemon active:scale-[0.97]"
                        >
                          {c.name}
                          <span className="tnum opacity-60">{c.count}</span>
                        </Link>
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
          담기 순간 떠오르는 하단 고정 바 (이 빌드의 유일한 authored 모션) */}
      {picked.size > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {/* 시트의 좌측 정렬 컬럼을 그대로 따라간다 — lg 에서는 6xl 그리드의 리스트 컬럼에 정렬 */}
          <div className="w-full max-w-2xl px-6 md:px-8 lg:mx-auto lg:max-w-6xl">
            <div className="lg:max-w-[26rem]">
              <div className="rise-in pointer-events-auto flex items-center justify-between gap-3 rounded-full bg-ink py-3 pr-2.5 pl-5 text-paper">
                <p className="text-sm font-semibold">
                  내 목록 <span className="tnum">{picked.size}</span>곳
                </p>
                {/* 전역 포커스 링은 잉크색인데 이 버튼이 앉은 바도 잉크 지면이라
                    링이 지면과 1:1 로 같아져 안 보인다 (WCAG 2.4.7).
                    .focus-ring-invert 는 globals.css 의 레이어 밖 규칙 — Tailwind 유틸리티로는
                    레이어 순서 때문에 전역 규칙을 이기지 못한다 (globals.css 주석 참조). */}
                <button
                  type="button"
                  onClick={copyPickedLink}
                  className="focus-ring-invert min-h-10 cursor-pointer rounded-full bg-brand px-4 text-[13px] font-bold text-on-brand transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
                >
                  {copied ? "복사됨" : "링크 복사"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 하단 바가 마지막 항목을 가리지 않게 여백 확보 */}
      {picked.size > 0 ? <div aria-hidden className="h-20" /> : null}
    </main>
  );
}
