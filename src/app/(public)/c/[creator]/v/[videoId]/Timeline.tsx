"use client";

/**
 * 영상 타임라인 — 콘택트 시트에서 롤을 펼친 것, 즉 **필름 스트립**.
 *
 * 이 서비스에서 가장 고유한 물건은 지도가 아니라 타임코드다. 모든 장소가 영상의
 * 한 순간으로 되돌아가므로 화면의 주인공을 드래그 가능한 재생 헤드로 둔다.
 * 이 월드에서 시간축은 스트립이고, 정거장은 그 위의 컷 표시이며, 헤드는 지금
 * 라이트박스에 올려 둔 프레임이다.
 *
 * 위계는 색 세 단계로만 만든다: 정거장 dim → 활성 정거장 paper → 재생 헤드 wax.
 * 왁스가 여기서 면적을 먹지 않는 이유는 홈·조각과 같다 — 표시이지 채움이 아니다.
 *
 *   · 헤드를 끌면 현재 시각이 실시간으로 갱신되고 그 구간의 정거장이 활성화된다
 *   · 마우스·터치·키보드(←/→, Home/End) 전부 동작 — 포인터 캡처로 트랙 밖 드래그도 안 끊긴다
 *   · **클립 선택**은 스크러버 마커만이 아니라 가로 칩 스트립 + 행 헤더 탭으로도 가능
 *     (마커끼리 붙으면 손가락으로 고르기 어려워 이중 UI 가 필요)
 *   · 정거장이 1개뿐인 영상은 타임라인 대신 목록 단독 레이아웃으로 자동 전환한다
 *   · 종착 행동은 둘: 유튜브 타임스탬프(&t=) / 지도 열기
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VideoDetail, VideoStop } from "@/shared/api/videos";
import { Chip, FrameNo, Rule } from "@/shared/ui/frame"
import { Act } from "@/shared/ui/icons";
import { MapView, type MapPin } from "@/shared/ui/MapView";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName, displayPlaceName, displayPlaceSecondary } from "@/shared/i18n/display";

function fmt(sec: number | null): string {
  if (sec === null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function youtubeUrl(videoId: string, sec: number | null): string {
  return `https://www.youtube.com/watch?v=${videoId}${sec !== null ? `&t=${Math.floor(sec)}s` : ""}`;
}

/** 정거장 행 — 조각 화면의 장소 행과 같은 문법이라 두 화면이 서로를 알아본다. */
function StopRow({
  stop,
  videoId,
  index,
  active,
  onSelect,
  selectable,
}: {
  stop: VideoStop;
  videoId: string;
  index: number;
  active: boolean;
  onSelect: () => void;
  selectable: boolean;
}) {
  const { messages: m, t, locale } = useLocale();
  const header = (
    <>
      <FrameNo n={index} active={active} />
      <span className="min-w-0 flex-1">
        <span
          className="block font-bold"
          style={{ fontSize: "var(--t-title)", letterSpacing: "-0.025em", lineHeight: 1.3 }}
        >
          {displayPlaceName(stop, locale)}
        </span>
        <span className="mt-1 block" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
          <span className="tnum">{fmt(stop.timestampSec)}</span>
          {" · "}
          {m.placeTypes[stop.placeType]}
          {!stop.confirmed ? m.video.pendingLocation : ""}
          {displayPlaceSecondary(stop, locale) ? (
            <>
              {" · "}
              <span lang={locale === "en" ? "ko" : "ja"}>{displayPlaceSecondary(stop, locale)}</span>
            </>
          ) : null}
        </span>
        {stop.address ? (
          <span
            className="mt-0.5 block"
            style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
          >
            {stop.cityName ? `${displayCityName({ name: stop.cityName, nameEn: stop.cityNameEn }, locale)} · ` : ""}
            {stop.address}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <div
      className="-mx-2.5 flex flex-col gap-3 px-2.5 py-4 transition-colors"
      style={{
        background: active ? "var(--sheet)" : undefined,
        borderRadius: active ? "var(--r-control)" : undefined,
      }}
    >
      {selectable ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={active}
          className="flex w-full cursor-pointer items-start gap-3 text-left"
        >
          {header}
        </button>
      ) : (
        <div className="flex items-start gap-3">{header}</div>
      )}

      {stop.summaryBullets.length > 0 ? (
        <ul
          className="flex flex-col gap-1.5 pl-10"
          style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}
        >
          {stop.summaryBullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden style={{ color: "var(--dim)" }}>
                ·
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : stop.summary ? (
        <p className="pl-10" style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}>
          {stop.summary}
        </p>
      ) : null}
      {stop.priceHint ? (
        <p className="pl-10" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
          {stop.priceHint}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pl-10">
        <Act icon="play" href={youtubeUrl(videoId, stop.timestampSec)}>
          {stop.timestampSec !== null
            ? t(m.common.watchAt, { ts: fmt(stop.timestampSec) })
            : m.common.watchVideo}
        </Act>
        {stop.mapUrl ? (
          <Act icon="out" href={stop.mapUrl}>
            {/* 확정만 검수된 딥링크다 — 후보는 이름 검색이라 라벨로 정직하게 구분한다 */}
            {stop.confirmed ? m.common.openMap : m.video.searchAtLocation}
          </Act>
        ) : null}
      </div>
    </div>
  );
}

export function Timeline({ video, creatorName }: { video: VideoDetail; creatorName: string }) {
  const { messages: m, t, locale } = useLocale();
  const stops = video.stops;
  const timed = useMemo(
    () => stops.filter((s): s is VideoStop & { timestampSec: number } => s.timestampSec !== null),
    [stops],
  );
  const untimed = useMemo(() => stops.filter((s) => s.timestampSec === null), [stops]);

  // 축의 끝 — duration 이 있으면 그걸 쓰고, 없으면 마지막 정거장 + 여유 10%.
  const axisEnd = useMemo(() => {
    if (video.durationSec && video.durationSec > 0) return video.durationSec;
    const last = timed.length ? timed[timed.length - 1]!.timestampSec : 0;
    return Math.max(60, Math.round(last * 1.1));
  }, [video.durationSec, timed]);

  const [head, setHead] = useState(() => (timed.length ? timed[0]!.timestampSec : 0));
  /**
   * 지도·목록이 같이 가리키는 정거장.
   * effect 로 동기화하지 않는다 — 스크럽·핀·칩 핸들러에서만 갱신한다
   * (react-hooks/set-state-in-effect).
   */
  const [activePlaceId, setActivePlaceId] = useState<string | null>(
    () => timed[0]?.placeId ?? stops[0]?.placeId ?? null,
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const chipStripRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Array<HTMLDivElement | null>>([]);
  /** placeId → 정거장 행 — 지도 핀·스크러버가 목록을 끌어올 때 쓴다 */
  const rowByPlace = useRef(new Map<string, HTMLDivElement>());

  // 헤드에 가장 가까운(지나온) 정거장 인덱스 — 뒤로 끌면 이전 정거장으로 되돌아간다
  const activeIdx = useMemo(() => {
    if (timed.length === 0) return -1;
    let idx = 0;
    for (let i = 0; i < timed.length; i++) {
      if (timed[i]!.timestampSec <= head + 0.5) idx = i;
    }
    return idx;
  }, [head, timed]);

  /** 목록 번호 = 핀 번호. 좌표 있는 정거장만 지도에 올린다. */
  const pins: MapPin[] = useMemo(
    () =>
      stops
        .map((s, i) => ({ s, index: i + 1 }))
        .filter(({ s }) => s.lat !== null && s.lng !== null)
        .map(({ s, index }) => ({
          id: s.placeId,
          name: displayPlaceName(s, locale),
          lat: s.lat!,
          lng: s.lng!,
          index,
        })),
    [stops, locale],
  );

  const placeAtHead = useCallback(
    (sec: number) => {
      if (timed.length === 0) return null;
      let idx = 0;
      for (let i = 0; i < timed.length; i++) {
        if (timed[i]!.timestampSec <= sec + 0.5) idx = i;
      }
      return timed[idx]!;
    },
    [timed],
  );

  const revealPlace = useCallback((placeId: string) => {
    const el = rowByPlace.current.get(placeId);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  /** 헤드를 옮기면 그 시각의 정거장도 같이 고른다 */
  const moveHead = useCallback(
    (sec: number, opts?: { reveal?: boolean }) => {
      const clamped = Math.min(axisEnd, Math.max(0, sec));
      setHead(clamped);
      const stop = placeAtHead(clamped);
      if (stop) {
        setActivePlaceId(stop.placeId);
        if (opts?.reveal) revealPlace(stop.placeId);
      }
    },
    [axisEnd, placeAtHead, revealPlace],
  );

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      moveHead(ratio * axisEnd);
    },
    [axisEnd, moveHead],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    seekFromClientX(e.clientX);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = axisEnd / 40;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      moveHead(head - step, { reveal: true });
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      moveHead(head + step, { reveal: true });
    } else if (e.key === "Home") {
      e.preventDefault();
      moveHead(0, { reveal: true });
    } else if (e.key === "End") {
      e.preventDefault();
      moveHead(axisEnd, { reveal: true });
    }
  };

  const selectStop = useCallback(
    (sec: number, placeId: string) => {
      setHead(sec);
      setActivePlaceId(placeId);
      revealPlace(placeId);
    },
    [revealPlace],
  );

  /** 지도 핀 — 타임라인 헤드를 그 시각으로 옮기고 목록 행을 연다 */
  const onPinClick = useCallback(
    (placeId: string) => {
      const stop = stops.find((s) => s.placeId === placeId);
      if (!stop) return;
      setActivePlaceId(placeId);
      if (stop.timestampSec !== null) setHead(stop.timestampSec);
      revealPlace(placeId);
    },
    [stops, revealPlace],
  );

  // 칩 스트립만 스크롤 — 행 스크롤은 핸들러의 revealPlace 가 담당
  const lastChip = useRef(-1);
  useEffect(() => {
    if (activeIdx < 0 || activeIdx === lastChip.current) return;
    lastChip.current = activeIdx;
    const chip = chipRefs.current[activeIdx];
    const strip = chipStripRef.current;
    if (chip && strip) {
      const c = chip.getBoundingClientRect();
      const s = strip.getBoundingClientRect();
      if (c.left < s.left + 12 || c.right > s.right - 12) {
        chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [activeIdx]);

  /* 정거장이 1개거나 시각이 하나도 없으면 축이 의미를 못 만든다 — 목록 단독으로 간다 */
  const soloLayout = timed.length <= 1;
  const headPct = (head / axisEnd) * 100;

  const timelinePanel = (
    <div className="flex flex-col gap-(--block)">
      {!soloLayout ? (
        <section className="flex flex-col gap-3">
          <p className="index tnum" style={{ color: "var(--dim)" }}>
            {t(m.video.clipCount, { n: timed.length })} ·{" "}
            {t(m.video.clipCurrent, { t: fmt(head) })} ·{" "}
            {video.durationSec ? m.video.durationKnown : m.video.durationEstimated} {fmt(axisEnd)}
          </p>

          {/* 1차 선택 UI — 가로 칩. 스크러버 마커끼리 붙어도 손가락으로 고를 수 있다 */}
          <div
            ref={chipStripRef}
            className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:px-0"
            role="listbox"
            aria-label={m.video.clipListAria}
          >
            {timed.map((s, i) => (
              <div
                key={s.placeId}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                role="option"
                aria-selected={s.placeId === activePlaceId}
                className="shrink-0"
              >
                <Chip
                  active={s.placeId === activePlaceId}
                  onClick={() => selectStop(s.timestampSec, s.placeId)}
                >
                  <span className="tnum font-bold">{fmt(s.timestampSec)}</span>
                  <span className="ml-2 max-w-[9.5rem] truncate sm:max-w-[12rem]">
                    {displayPlaceName(s, locale)}
                  </span>
                </Chip>
              </div>
            ))}
          </div>

          {/* 스트립 — 롤을 펼친 축.
              상자가 아니라 **레일**이다. 높이가 있는 박스로 그리면 대부분이 빈 면이라
              화면이 비어 보이고, 지나온 구간이 회색 덩어리로 읽힌다.

              바깥(패딩)이 터치 영역이고 안쪽(trackRef)이 실제 축이다. 좌표 계산은
              안쪽 rect 로 하므로 0%·100% 에서도 마커와 헤드가 바깥 패딩으로 넘칠 뿐
              잘리지 않는다 — overflow-hidden 을 걸면 끝에서 헤드가 반토막 난다. */}
          <div
            role="slider"
            tabIndex={0}
            aria-label={t(m.video.scrubberAria, { creator: creatorName })}
            aria-valuemin={0}
            aria-valuemax={Math.round(axisEnd)}
            aria-valuenow={Math.round(head)}
            aria-valuetext={`${fmt(head)}, ${
              timed[activeIdx] ? displayPlaceName(timed[activeIdx], locale) : ""
            }`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onKeyDown={onKeyDown}
            className="relative h-12 cursor-ew-resize touch-none px-3 select-none"
          >
            <div ref={trackRef} className="relative h-full">
              {/* 레일 */}
              <div
                aria-hidden
                className="absolute top-1/2 right-0 left-0 h-[3px] -translate-y-1/2 rounded-full"
                style={{ background: "var(--hairline)" }}
              />
              {/* 지나온 구간 */}
              <div
                aria-hidden
                className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full"
                style={{ width: `${headPct}%`, background: "var(--dim)" }}
              />
              {/* 정거장 마커 — 각진 컷 표시. 히트 영역 44px */}
              {timed.map((s) => {
                const pct = (s.timestampSec / axisEnd) * 100;
                const on = s.placeId === activePlaceId;
                return (
                  <button
                    key={s.placeId}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectStop(s.timestampSec, s.placeId);
                    }}
                    aria-label={t(m.video.seekToAria, {
                      time: fmt(s.timestampSec),
                      name: displayPlaceName(s, locale),
                    })}
                    className="absolute top-0 bottom-0 w-11 -translate-x-1/2 cursor-pointer"
                    style={{ left: `${pct}%`, zIndex: on ? 3 : 1 }}
                  >
                    <span
                      aria-hidden
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all"
                      style={{
                        width: on ? 13 : 9,
                        height: on ? 13 : 9,
                        borderRadius: 2,
                        background: on ? "var(--paper)" : "var(--dim)",
                        boxShadow: "0 0 0 3px var(--ground)",
                      }}
                    />
                  </button>
                );
              })}
              {/* 재생 헤드 — 지금 라이트박스에 올려 둔 프레임 */}
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-0 z-[2] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${headPct}%` }}
              >
                <span
                  className="block"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "var(--r-frame)",
                    background: "var(--wax)",
                    boxShadow: "0 0 0 3px var(--ground)",
                  }}
                />
              </span>
            </div>
          </div>

          <p style={{ fontSize: "var(--t-meta)", lineHeight: 1.6, color: "var(--dim)" }}>
            {m.video.scrubHint}
          </p>
        </section>
      ) : null}

      {pins.length > 0 ? (
        <p className="index" style={{ color: "var(--dim)" }}>
          {m.video.mapHint}
        </p>
      ) : (
        <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.6 }}>
          {m.video.mapEmpty}
        </p>
      )}

      <div className="flex flex-col">
        {timed.map((s, i) => (
          <div
            key={s.placeId}
            ref={(el) => {
              if (el) rowByPlace.current.set(s.placeId, el);
              else rowByPlace.current.delete(s.placeId);
            }}
          >
            <Rule />
            <StopRow
              stop={s}
              videoId={video.youtubeId}
              index={i + 1}
              active={s.placeId === activePlaceId}
              onSelect={() => selectStop(s.timestampSec, s.placeId)}
              selectable={!soloLayout || pins.length > 0}
            />
          </div>
        ))}
        {timed.length > 0 ? <Rule /> : null}

        {untimed.length > 0 ? (
          <div
            className="mt-(--block) flex flex-col gap-2 p-4"
            style={{ border: "1px dashed var(--hairline)", borderRadius: "var(--r-control)" }}
          >
            <p className="index" style={{ color: "var(--dim)" }}>
              {t(m.video.untimedHeading, { n: untimed.length })}
            </p>
            {untimed.map((s, i) => (
              <div
                key={s.placeId}
                ref={(el) => {
                  if (el) rowByPlace.current.set(s.placeId, el);
                  else rowByPlace.current.delete(s.placeId);
                }}
              >
                <StopRow
                  stop={s}
                  videoId={video.youtubeId}
                  index={timed.length + i + 1}
                  active={s.placeId === activePlaceId}
                  onSelect={() => {
                    setActivePlaceId(s.placeId);
                    revealPlace(s.placeId);
                  }}
                  selectable={pins.some((p) => p.id === s.placeId)}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (pins.length === 0) return timelinePanel;

  /* 조각 페이지와 같은 2단: 모바일은 지도가 위, 데스크톱은 우측 sticky.
     페이지 main 에 gutter 가 있어 지도만 가장자리까지 뺀다. */
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start lg:gap-7">
      <div
        className="relative -mx-(--gutter) mb-(--block) lg:sticky lg:top-4 lg:order-2 lg:mx-0 lg:mb-0"
        aria-label={m.video.mapAria}
      >
        <MapView
          className="h-[38dvh] w-full lg:h-[calc(100dvh-2rem)]"
          pins={pins}
          activeId={activePlaceId}
          onPinClick={onPinClick}
          cluster={pins.length > 6}
        />
      </div>
      <div className="lg:order-1">{timelinePanel}</div>
    </div>
  );
}
