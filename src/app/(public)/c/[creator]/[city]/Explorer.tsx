"use client";

/**
 * 채널×도시 탐색 화면 — 지도↔리스트 양방향 연동 (CONCEPT.md 4.3), 공항 사인 시스템.
 *
 *   · 모바일: 지도가 상부를 잡고 장소 리스트가 그 아래로 올라탄다 (지도 앱 문법)
 *   · 데스크톱: 좌 리스트 패널 + 우 sticky 지도
 *   · 지도 핀 번호 ↔ 카드 "핀" 값 연동 — 선택은 클릭으로만, 재클릭 시 해제
 *   · candidate 는 지도에 없고 "위치 확인 중" 섹션에 격리 (P3 원칙)
 *   · 모든 항목의 종착지는 아웃링크 2개: 타임스탬프 영상 / 지도 열기 (P4 원칙)
 *   · 담기(?picked=) — 선택을 URL에 남겨 공유·재방문. 담기 시 하단 고정 "내 목록" 바 등장
 *
 * 크리에이터 액센트(--hl)는 **지도 핀에만** 남긴다. 카드까지 액센트를 칠하면
 * 노랑·검정 두 색으로 버티는 이 월드에 세 번째 색이 들어와 사인이 무너진다.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { MapStatus, PlaceType } from "@/shared/api/database.types";
import { primaryMapLink } from "@/shared/lib/map-links";
import { MapView } from "@/shared/ui/MapView";
import { Action, Box, Card, Chip, DataRow, Divider, Icon, placeGlyph } from "@/shared/ui/sign";
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
   * 선택의 단일 진입점 — 카드 헤더·지도 핀 어디서 눌러도 같은 결과.
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

  return (
    <main style={{ "--hl": accentColor } as React.CSSProperties}>
      <div className="lg:grid lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start lg:gap-6 lg:px-(--gutter) lg:pt-4">
        {/* 지도 — 모바일은 상부, 데스크톱은 우측 sticky 카드 */}
        <div className="lg:sticky lg:top-4 lg:order-2">
          <MapView
            className="h-[38dvh] w-full lg:h-[calc(100dvh-2rem)]"
            pins={pins}
            activeId={visibleActiveId}
            onPinClick={selectPlace}
          />
        </div>

        <section className="lg:order-1">
          <header className="flex flex-col gap-3 px-(--gutter) pt-6 pb-4 lg:px-0 lg:pt-0">
            <nav className="flex items-center gap-1.5" style={{ fontSize: "var(--t-meta)" }}>
              <Link href="/" className="underline-offset-4 hover:underline">
                홈
              </Link>
              <Icon.chevron aria-hidden style={{ width: 9, height: 9, fill: "var(--hairline)" }} />
              <Link href={`/c/${creatorSlug}`} className="underline-offset-4 hover:underline">
                {creatorName}
              </Link>
              <Icon.chevron aria-hidden style={{ width: 9, height: 9, fill: "var(--hairline)" }} />
              <span className="font-medium">{cityName}</span>
            </nav>

            <h1
              className="font-bold"
              style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.02em", lineHeight: 1.2 }}
            >
              {creatorName} → {cityName}
            </h1>

            <Card>
              <DataRow
                items={[
                  { label: "확정", value: String(confirmed.length) },
                  { label: "확인 중", value: String(candidates.length) },
                  { label: "유형", value: String(presentTypes.length) },
                ]}
              />
            </Card>

            {introText ? (
              <p className="max-w-[42ch]" style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}>
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

          <div className="flex flex-col gap-(--stack) px-(--gutter) pb-8 lg:px-0">
            {confirmed.length === 0 ? (
              <Card>
                <p style={{ fontSize: "var(--t-body)" }}>
                  {activeType
                    ? "이 카테고리의 확정 장소가 아직 없어요."
                    : "확정된 장소가 아직 없어요."}
                </p>
              </Card>
            ) : (
              <ol className="flex flex-col gap-(--stack)">
                {confirmed.map((place, index) => {
                  const active = place.id === visibleActiveId;
                  const isPicked = picked.has(place.slug);
                  const mapHref = mapsUrl(place);
                  return (
                    <Card
                      as="li"
                      key={place.id}
                      active={active}
                      className="flex flex-col gap-(--card-pad)"
                      ref={(el: HTMLLIElement | null) => {
                        if (el) listRef.current.set(place.id, el);
                        else listRef.current.delete(place.id);
                      }}
                    >
                      {/* 헤더 전체가 선택 트리거 — 지도 핀과 같은 selectPlace 하나로 통일 */}
                      <button
                        type="button"
                        onClick={() => selectPlace(place.id)}
                        aria-pressed={active}
                        className="flex w-full cursor-pointer items-center gap-4 text-left"
                      >
                        <Box icon={placeGlyph(PLACE_TYPE_LABELS[place.placeType])} size="card" />
                        <span className="min-w-0 flex-1">
                          <span className="block" style={{ fontSize: "var(--t-body)" }}>
                            {PLACE_TYPE_LABELS[place.placeType]}
                          </span>
                          <span
                            className="block font-bold"
                            style={{
                              fontSize: "var(--t-title)",
                              letterSpacing: "-0.02em",
                              lineHeight: 1.28,
                            }}
                          >
                            {place.name}
                          </span>
                          {place.nameLocal ? (
                            <span
                              lang="ja"
                              className="block"
                              style={{ fontSize: "var(--t-meta)", opacity: 0.75 }}
                            >
                              {place.nameLocal}
                            </span>
                          ) : null}
                          {place.address ? (
                            <span className="block" style={{ fontSize: "var(--t-meta)" }}>
                              {place.address}
                            </span>
                          ) : null}
                        </span>
                        <Icon.chevron
                          aria-hidden
                          style={{
                            width: "var(--icon-chevron)",
                            height: "var(--icon-chevron)",
                            fill: "var(--ink)",
                            flex: "none",
                            transform: active ? "rotate(90deg)" : undefined,
                          }}
                        />
                      </button>

                      {place.summaryBullets.length > 0 ? (
                        <ul
                          className="flex flex-col gap-1.5"
                          style={{ fontSize: "var(--t-body)", lineHeight: 1.6 }}
                        >
                          {place.summaryBullets.map((b, i) => (
                            <li key={i} className="flex gap-2">
                              <span aria-hidden style={{ opacity: 0.5 }}>
                                ·
                              </span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      ) : place.summary ? (
                        <p style={{ fontSize: "var(--t-body)", lineHeight: 1.6 }}>
                          {place.summary}
                        </p>
                      ) : null}
                      {place.priceHint ? (
                        <p style={{ fontSize: "var(--t-meta)" }}>{place.priceHint}</p>
                      ) : null}

                      <Divider />

                      {/* 핀 번호가 GATE 자리에 앉는다 — 지도 핀과 1:1 */}
                      <DataRow
                        items={[
                          { label: "핀", value: String(index + 1) },
                          {
                            label: "영상",
                            value:
                              place.timestampSec !== null
                                ? formatTimestamp(place.timestampSec)
                                : "—",
                          },
                          { label: "상태", value: isPicked ? "담음" : "—" },
                        ]}
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        {place.youtubeVideoId ? (
                          <Action
                            icon="play"
                            primary
                            href={youtubeUrl(place.youtubeVideoId, place.timestampSec)}
                            title={place.videoTitle ?? "출처 영상"}
                          >
                            {place.timestampSec !== null
                              ? `영상 ${formatTimestamp(place.timestampSec)}`
                              : "영상 보기"}
                          </Action>
                        ) : null}
                        {mapHref ? (
                          <Action icon="pin" href={mapHref}>
                            지도 열기
                          </Action>
                        ) : null}
                        <Action
                          icon="bookmark"
                          pressed={isPicked}
                          onClick={() => togglePick(place.slug)}
                        >
                          {isPicked ? "담음" : "담기"}
                        </Action>
                      </div>
                    </Card>
                  );
                })}
              </ol>
            )}

            {/* candidate 격리 — 지도 핀 없음. 확정된 것과 획의 종류로 구분한다 */}
            {candidates.length > 0 ? (
              <section
                className="flex flex-col gap-3 p-(--card-pad)"
                style={{
                  border: "var(--stroke-card) dashed var(--hairline)",
                  borderRadius: "var(--r-card)",
                }}
              >
                <h2 className="ds-label">위치 확인 중 {candidates.length}</h2>
                <ul className="flex flex-col gap-2">
                  {candidates.map((place) => (
                    <li
                      key={place.id}
                      className="flex flex-wrap items-baseline gap-x-2"
                      style={{ fontSize: "var(--t-meta)" }}
                    >
                      <span className="font-bold">{place.name}</span>
                      {place.nameLocal ? (
                        <span lang="ja" style={{ opacity: 0.7 }}>
                          {place.nameLocal}
                        </span>
                      ) : null}
                      <span style={{ opacity: 0.7 }}>{PLACE_TYPE_LABELS[place.placeType]}</span>
                      {place.youtubeVideoId ? (
                        <a
                          href={youtubeUrl(place.youtubeVideoId, place.timestampSec)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold underline underline-offset-4"
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
                    <h2 className="ds-label">{creatorName}의 다른 도시</h2>
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
                    <h2 className="ds-label">{cityName}에 간 다른 채널</h2>
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

      {/* 담은 목록 바 — URL 이 곧 저장본이라 "링크 복사"가 공유·재방문 동작이다 */}
      {picked.size > 0 ? (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="mx-auto w-full max-w-3xl px-(--gutter) xl:max-w-6xl">
              {/* lg 에서는 리스트 컬럼 폭에 맞춘다 — 지도를 가리지 않는다 */}
              <div className="lg:max-w-[30rem]">
                <div
                  className="rise-in pointer-events-auto flex items-center justify-between gap-3 py-2.5 pr-2.5 pl-5"
                  style={{ background: "var(--ink)", borderRadius: "var(--r-nav)" }}
                >
                  <p style={{ color: "var(--on-ink)", fontSize: "var(--t-body)", fontWeight: 500 }}>
                    내 목록 <span className="tnum">{picked.size}</span>곳
                  </p>
                  {/* 전역 포커스 링이 잉크색인데 이 버튼이 앉은 바도 잉크 지면이라
                      링이 지면과 1:1 로 같아져 안 보인다 (WCAG 2.4.7) — 반전 링을 쓴다 */}
                  <button
                    type="button"
                    onClick={copyPickedLink}
                    className="focus-ring-invert cursor-pointer px-4 py-2.5 font-medium"
                    style={{
                      background: "var(--sign)",
                      color: "var(--ink)",
                      borderRadius: "var(--r-field)",
                      fontSize: "var(--t-chip)",
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
