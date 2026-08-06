"use client";

/**
 * 영상 타임라인 — D 컨셉("스크러버").
 *
 * 이 서비스에서 가장 고유한 물건은 지도가 아니라 타임코드다. 모든 장소가 영상의
 * 한 순간으로 되돌아가므로, 화면의 주인공을 드래그 가능한 재생 헤드로 둔다.
 *
 *   · 헤드를 끌면 현재 시각이 실시간으로 갱신되고 그 구간의 정거장이 활성화된다
 *   · 마우스·터치·키보드(←/→, Home/End) 전부 동작 — 포인터 캡처로 트랙 밖 드래그도 안 끊긴다
 *   · **클립 선택**은 스크러버 마커만이 아니라 가로 칩 스트립 + 카드 전체 탭으로도 가능
 *     (마커끼리 붙으면 손가락으로 고르기 어려워 이중 UI 가 필요)
 *   · 정거장이 1개뿐인 영상은 타임라인 대신 카드 단독 레이아웃으로 자동 전환한다
 *   · 종착 행동은 둘: 유튜브 타임스탬프(&t=) / 지도 열기
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VideoDetail, VideoStop } from "@/shared/api/videos";
import { PLACE_TYPE_LABELS } from "@/shared/ui/place-types";

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

function PlayIcon() {
  return (
    <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M2.2 1.4a.6.6 0 0 1 .9-.5l5.4 3.3a.6.6 0 0 1 0 1L3.1 8.6a.6.6 0 0 1-.9-.5V1.4Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      aria-hidden
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

/** 정거장 카드 — 타임라인이 있든 없든 같은 카드를 쓴다. 카드 전체가 선택 타깃. */
function StopCard({
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
  return (
    <article
      className={`rounded-2xl border p-5 transition sm:p-6 ${
        active ? "border-ink" : "border-line bg-card"
      }`}
      style={
        active
          ? {
              background: "color-mix(in srgb, var(--lemon) 32%, var(--card))",
              boxShadow: "0 0 0 1px var(--ink)",
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {selectable ? (
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={active}
            className={`tnum min-h-10 cursor-pointer rounded-full px-3.5 text-[13px] font-bold transition active:scale-[0.97] ${
              active
                ? "bg-ink text-paper"
                : "bg-fill text-ink hover:bg-line"
            }`}
          >
            {fmt(stop.timestampSec)}
          </button>
        ) : (
          <span className="tnum inline-flex min-h-10 items-center rounded-full bg-ink px-3.5 text-[13px] font-bold text-paper">
            {fmt(stop.timestampSec)}
          </span>
        )}
        <span className="rounded-md bg-fill px-2 py-1 text-[11px] font-semibold text-ink-soft">
          {PLACE_TYPE_LABELS[stop.placeType]}
        </span>
        {!stop.confirmed ? (
          <span className="rounded-md border border-dashed border-line px-2 py-1 text-[11px] font-semibold text-ink-soft">
            위치 확인 중
          </span>
        ) : null}
        <span className="tnum ml-auto text-[12px] font-semibold text-ink-soft">{index}</span>
      </div>

      {/* 장소명 영역도 선택 — 작은 타임 칩만 누르던 UX 를 넓힌다 */}
      {selectable ? (
        <button
          type="button"
          onClick={onSelect}
          className="mt-3 w-full cursor-pointer text-left"
        >
          <h2 className="flex flex-wrap items-baseline gap-x-2 text-[17px] leading-snug font-bold decoration-2 underline-offset-4 hover:underline">
            {stop.name}
            {stop.nameLocal ? (
              <span lang="ja" className="text-sm font-normal text-ink-soft">
                {stop.nameLocal}
              </span>
            ) : null}
          </h2>
        </button>
      ) : (
        <h2 className="mt-3 flex flex-wrap items-baseline gap-x-2 text-[17px] leading-snug font-bold">
          {stop.name}
          {stop.nameLocal ? (
            <span lang="ja" className="text-sm font-normal text-ink-soft">
              {stop.nameLocal}
            </span>
          ) : null}
        </h2>
      )}

      {stop.address ? (
        <p className="mt-1.5 text-[13px] text-ink-soft">
          {stop.cityName ? <b className="font-semibold text-ink">{stop.cityName}</b> : null}
          {stop.cityName ? " · " : ""}
          {stop.address}
        </p>
      ) : null}

      {stop.summaryBullets.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed">
          {stop.summaryBullets.map((b, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden className="text-ink-soft">
                ·
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : stop.summary ? (
        <p className="mt-3 text-[15px] leading-relaxed">{stop.summary}</p>
      ) : null}

      {stop.priceHint ? (
        <p className="mt-1.5 text-[13px] text-ink-soft">{stop.priceHint}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <a
          href={youtubeUrl(videoId, stop.timestampSec)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-paper transition hover:opacity-85 active:scale-[0.97]"
        >
          <PlayIcon />
          <span className="tnum">
            {stop.timestampSec !== null ? `영상 ${fmt(stop.timestampSec)}` : "영상 보기"}
          </span>
        </a>
        {stop.mapUrl ? (
          <a
            href={stop.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-fill px-4 text-[13px] font-bold transition hover:bg-line active:scale-[0.97]"
          >
            <PinIcon />
            {/* 확정만 검수된 딥링크다 — 후보는 이름 검색이라 라벨로 정직하게 구분한다 */}
            {stop.confirmed ? "지도 열기" : "지도에서 검색"}
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function Timeline({ video, creatorName }: { video: VideoDetail; creatorName: string }) {
  const stops = video.stops;
  const timed = useMemo(
    () => stops.filter((s): s is VideoStop & { timestampSec: number } => s.timestampSec !== null),
    [stops],
  );
  const untimed = useMemo(() => stops.filter((s) => s.timestampSec === null), [stops]);

  // 축의 끝 — duration 이 있으면 그걸 쓰고, 없으면 마지막 정거장 + 여유 10%.
  // duration 이 비어 있으면 "영상 전체 중 어디쯤"이 아니라 "정거장 사이 어디쯤"만 읽힌다.
  const axisEnd = useMemo(() => {
    if (video.durationSec && video.durationSec > 0) return video.durationSec;
    const last = timed.length ? timed[timed.length - 1]!.timestampSec : 0;
    return Math.max(60, Math.round(last * 1.1));
  }, [video.durationSec, timed]);

  const [head, setHead] = useState(() => (timed.length ? timed[0]!.timestampSec : 0));
  const trackRef = useRef<HTMLDivElement>(null);
  const chipStripRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // 헤드에 가장 가까운(지나온) 정거장이 활성 — 뒤로 끌면 이전 정거장으로 되돌아간다
  const activeIdx = useMemo(() => {
    if (timed.length === 0) return -1;
    let idx = 0;
    for (let i = 0; i < timed.length; i++) {
      if (timed[i]!.timestampSec <= head + 0.5) idx = i;
    }
    return idx;
  }, [head, timed]);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      setHead(ratio * axisEnd);
    },
    [axisEnd],
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
      setHead((h) => Math.max(0, h - step));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setHead((h) => Math.min(axisEnd, h + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHead(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHead(axisEnd);
    }
  };

  const selectStop = useCallback((sec: number) => {
    setHead(sec);
  }, []);

  // 활성 정거장 카드로 스크롤 — 사용자가 스크럽할 때만
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lastActive = useRef(-1);
  useEffect(() => {
    if (activeIdx < 0 || activeIdx === lastActive.current) return;
    lastActive.current = activeIdx;
    const el = cardRefs.current[activeIdx];
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    // 칩 스트립도 활성 칩이 보이도록 가로 스크롤
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

  /* 정거장이 1개거나 시각이 하나도 없으면 축이 의미를 못 만든다 — 카드 단독으로 간다 */
  const soloLayout = timed.length <= 1;

  return (
    <div>
      {!soloLayout ? (
        <section className="mb-8">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-bold">장소 클립 {timed.length}</h2>
            <span className="tnum text-[13px] font-bold">
              {fmt(head)}
              <span className="font-normal text-ink-soft">
                {" / "}
                {video.durationSec ? fmt(axisEnd) : `${fmt(axisEnd)} (추정)`}
              </span>
            </span>
          </div>

          {/* 1차 선택 UI — 가로 칩. 스크러버 마커끼리 붙어도 손가락으로 고를 수 있다.
              min-h-12 · gap-2.5 · 넉넉한 패딩 = 터치 타깃 44px 이상 */}
          <div
            ref={chipStripRef}
            className="no-scrollbar -mx-6 mb-5 flex gap-2.5 overflow-x-auto px-6 pb-1 md:-mx-8 md:px-8 lg:mx-0 lg:px-0"
            role="listbox"
            aria-label="장소 클립 목록"
          >
            {timed.map((s, i) => {
              const on = i === activeIdx;
              return (
                <button
                  key={s.placeId}
                  ref={(el) => {
                    chipRefs.current[i] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => selectStop(s.timestampSec)}
                  className={`flex min-h-12 shrink-0 cursor-pointer items-center gap-2.5 rounded-full px-4 text-left transition active:scale-[0.97] ${
                    on
                      ? "bg-ink text-paper"
                      : "bg-fill text-ink hover:bg-line"
                  }`}
                >
                  <span className="tnum text-[13px] font-extrabold">{fmt(s.timestampSec)}</span>
                  <span
                    className={`max-w-[9.5rem] truncate text-[13px] font-bold sm:max-w-[12rem] ${
                      on ? "text-paper" : "text-ink"
                    }`}
                  >
                    {s.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 스크러버 — 대략 위치 감각용. 정밀 선택은 위 칩이 담당 */}
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label={`${creatorName} 영상 타임라인 — 좌우 화살표로 이동`}
            aria-valuemin={0}
            aria-valuemax={Math.round(axisEnd)}
            aria-valuenow={Math.round(head)}
            aria-valuetext={`${fmt(head)}, ${timed[activeIdx]?.name ?? ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onKeyDown={onKeyDown}
            className="relative h-16 cursor-ew-resize touch-none rounded-2xl border border-line bg-fill select-none"
          >
            {/* 지나온 구간 */}
            <div
              className="absolute inset-y-0 left-0 rounded-l-2xl bg-ink/8"
              style={{ width: `${(head / axisEnd) * 100}%` }}
            />
            {/* 정거장 마커 — 시각 히트 영역 44px. 겹쳐도 칩으로 고를 수 있다 */}
            {timed.map((s, i) => {
              const pct = (s.timestampSec / axisEnd) * 100;
              const on = i === activeIdx;
              return (
                <button
                  key={s.placeId}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectStop(s.timestampSec);
                  }}
                  aria-label={`${fmt(s.timestampSec)} ${s.name} 로 이동`}
                  className="absolute top-0 bottom-0 z-[1] w-11 -translate-x-1/2 cursor-pointer"
                  style={{ left: `${pct}%`, zIndex: on ? 3 : 1 }}
                >
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper transition"
                    style={{
                      background: on ? "var(--brand)" : "var(--ink)",
                      opacity: on ? 1 : 0.5,
                      scale: on ? "1.2" : "1",
                    }}
                  />
                </button>
              );
            })}
            {/* 재생 헤드 */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 z-[2] w-[2px] -translate-x-1/2 bg-brand"
              style={{ left: `${(head / axisEnd) * 100}%` }}
            >
              <span className="absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-brand" />
            </span>
          </div>

          <p className="mt-2.5 text-[12px] leading-relaxed text-ink-soft">
            위 클립을 누르거나 바를 드래그하세요. 화살표 키로도 시간을 옮길 수 있습니다.
          </p>
        </section>
      ) : null}

      <div className="space-y-4">
        {timed.map((s, i) => (
          <div
            key={s.placeId}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
          >
            <StopCard
              stop={s}
              videoId={video.youtubeId}
              index={i + 1}
              active={!soloLayout && i === activeIdx}
              onSelect={() => selectStop(s.timestampSec)}
              selectable={!soloLayout}
            />
          </div>
        ))}
        {untimed.length > 0 ? (
          <div className="space-y-4 border-t border-dashed border-line pt-5">
            <p className="text-[13px] font-bold">
              시각 미확인 <span className="tnum text-ink-soft">{untimed.length}</span>
            </p>
            {untimed.map((s, i) => (
              <StopCard
                key={s.placeId}
                stop={s}
                videoId={video.youtubeId}
                index={timed.length + i + 1}
                active={false}
                onSelect={() => undefined}
                selectable={false}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
