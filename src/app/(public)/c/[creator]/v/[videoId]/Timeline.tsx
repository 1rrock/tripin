"use client";

/**
 * 영상 타임라인 — 공항 사인 시스템.
 *
 * 이 서비스에서 가장 고유한 물건은 지도가 아니라 타임코드다. 모든 장소가 영상의
 * 한 순간으로 되돌아가므로, 화면의 주인공을 드래그 가능한 재생 헤드로 둔다.
 * 사인 월드에서 이 축은 **출발 안내판의 진행 바** 문법으로 읽힌다 —
 * 검정 트랙 위를 지나온 만큼 채우고, 정거장은 게이트 번호판처럼 각진 마커로 선다.
 *
 *   · 헤드를 끌면 현재 시각이 실시간으로 갱신되고 그 구간의 정거장이 활성화된다
 *   · 마우스·터치·키보드(←/→, Home/End) 전부 동작 — 포인터 캡처로 트랙 밖 드래그도 안 끊긴다
 *   · **클립 선택**은 스크러버 마커만이 아니라 가로 칩 스트립 + 카드 헤더 탭으로도 가능
 *     (마커끼리 붙으면 손가락으로 고르기 어려워 이중 UI 가 필요)
 *   · 정거장이 1개뿐인 영상은 타임라인 대신 카드 단독 레이아웃으로 자동 전환한다
 *   · 종착 행동은 둘: 유튜브 타임스탬프(&t=) / 지도 열기
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VideoDetail, VideoStop } from "@/shared/api/videos";
import { Action, Box, Card, Chip, DataRow, Divider, Icon, placeGlyph } from "@/shared/ui/sign";
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

/** 정거장 카드 — 타임라인이 있든 없든 같은 카드를 쓴다. 헤더 전체가 선택 타깃. */
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
  const header = (
    <>
      <Box icon={placeGlyph(PLACE_TYPE_LABELS[stop.placeType])} size="card" />
      <span className="min-w-0 flex-1">
        <span className="block" style={{ fontSize: "var(--t-body)" }}>
          {PLACE_TYPE_LABELS[stop.placeType]}
          {!stop.confirmed ? " · 위치 확인 중" : ""}
        </span>
        <span
          className="block font-bold"
          style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em", lineHeight: 1.28 }}
        >
          {stop.name}
        </span>
        {stop.nameLocal ? (
          <span lang="ja" className="block" style={{ fontSize: "var(--t-meta)", opacity: 0.75 }}>
            {stop.nameLocal}
          </span>
        ) : null}
        {stop.address ? (
          <span className="block" style={{ fontSize: "var(--t-meta)" }}>
            {stop.cityName ? `${stop.cityName} · ` : ""}
            {stop.address}
          </span>
        ) : null}
      </span>
      {selectable ? (
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
      ) : null}
    </>
  );

  return (
    <Card active={active} className="flex flex-col gap-(--card-pad)">
      {selectable ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={active}
          className="flex w-full cursor-pointer items-center gap-4 text-left"
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center gap-4">{header}</div>
      )}

      {stop.summaryBullets.length > 0 ? (
        <ul
          className="flex flex-col gap-1.5"
          style={{ fontSize: "var(--t-body)", lineHeight: 1.6 }}
        >
          {stop.summaryBullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden style={{ opacity: 0.5 }}>
                ·
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : stop.summary ? (
        <p style={{ fontSize: "var(--t-body)", lineHeight: 1.6 }}>{stop.summary}</p>
      ) : null}
      {stop.priceHint ? <p style={{ fontSize: "var(--t-meta)" }}>{stop.priceHint}</p> : null}

      <Divider />

      <DataRow
        items={[
          { label: "클립", value: String(index) },
          { label: "영상", value: fmt(stop.timestampSec) },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Action icon="play" primary href={youtubeUrl(videoId, stop.timestampSec)}>
          {stop.timestampSec !== null ? `영상 ${fmt(stop.timestampSec)}` : "영상 보기"}
        </Action>
        {stop.mapUrl ? (
          <Action icon="pin" href={stop.mapUrl}>
            {/* 확정만 검수된 딥링크다 — 후보는 이름 검색이라 라벨로 정직하게 구분한다 */}
            {stop.confirmed ? "지도 열기" : "지도에서 검색"}
          </Action>
        ) : null}
      </div>
    </Card>
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
  const axisEnd = useMemo(() => {
    if (video.durationSec && video.durationSec > 0) return video.durationSec;
    const last = timed.length ? timed[timed.length - 1]!.timestampSec : 0;
    return Math.max(60, Math.round(last * 1.1));
  }, [video.durationSec, timed]);

  const [head, setHead] = useState(() => (timed.length ? timed[0]!.timestampSec : 0));
  const trackRef = useRef<HTMLDivElement>(null);
  const chipStripRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Array<HTMLDivElement | null>>([]);

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
    <div className="flex flex-col gap-(--stack)">
      {!soloLayout ? (
        <section className="flex flex-col gap-3">
          <Card>
            <DataRow
              items={[
                { label: "클립", value: String(timed.length) },
                { label: "현재", value: fmt(head) },
                {
                  label: video.durationSec ? "길이" : "길이(추정)",
                  value: fmt(axisEnd),
                },
              ]}
            />
          </Card>

          {/* 1차 선택 UI — 가로 칩. 스크러버 마커끼리 붙어도 손가락으로 고를 수 있다 */}
          <div
            ref={chipStripRef}
            className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:px-0"
            role="listbox"
            aria-label="장소 클립 목록"
          >
            {timed.map((s, i) => (
              <div
                key={s.placeId}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                role="option"
                aria-selected={i === activeIdx}
                className="shrink-0"
              >
                <Chip active={i === activeIdx} onClick={() => selectStop(s.timestampSec)}>
                  <span className="tnum font-bold">{fmt(s.timestampSec)}</span>
                  <span className="ml-2 max-w-[9.5rem] truncate sm:max-w-[12rem]">{s.name}</span>
                </Chip>
              </div>
            ))}
          </div>

          {/* 스크러버 — 출발 안내판의 진행 바. 정밀 선택은 위 칩이 담당 */}
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
            className="relative h-16 cursor-ew-resize touch-none select-none"
            style={{
              border: "var(--stroke-card) solid var(--hairline)",
              borderRadius: "var(--r-card)",
            }}
          >
            {/* 지나온 구간 — 검정 척추선이 여기까지 왔다는 표시 */}
            <div
              aria-hidden
              className="absolute inset-y-0 left-0"
              style={{
                width: `${(head / axisEnd) * 100}%`,
                background: "var(--ink)",
                opacity: 0.12,
                borderTopLeftRadius: "var(--r-card)",
                borderBottomLeftRadius: "var(--r-card)",
              }}
            />
            {/* 정거장 마커 — 게이트 번호판처럼 각진 사각. 히트 영역 44px */}
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
                  className="absolute top-0 bottom-0 w-11 -translate-x-1/2 cursor-pointer"
                  style={{ left: `${pct}%`, zIndex: on ? 3 : 1 }}
                >
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition"
                    style={{
                      width: on ? 16 : 11,
                      height: on ? 16 : 11,
                      borderRadius: 4,
                      background: on ? "var(--sign)" : "var(--ink)",
                      border: on ? "2.5px solid var(--ink)" : "none",
                      opacity: on ? 1 : 0.55,
                    }}
                  />
                </button>
              );
            })}
            {/* 재생 헤드 */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 z-[2] w-[2.5px] -translate-x-1/2"
              style={{ left: `${(head / axisEnd) * 100}%`, background: "var(--ink)" }}
            >
              <span
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "var(--ink)",
                  border: "2.5px solid var(--sign)",
                }}
              />
            </span>
          </div>

          <p style={{ fontSize: "var(--t-meta)", lineHeight: 1.6 }}>
            위 클립을 누르거나 바를 드래그하세요. 화살표 키로도 시간을 옮길 수 있습니다.
          </p>
        </section>
      ) : null}

      <div className="flex flex-col gap-(--stack)">
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
          <div
            className="flex flex-col gap-(--stack) p-(--card-pad)"
            style={{
              border: "var(--stroke-card) dashed var(--hairline)",
              borderRadius: "var(--r-card)",
            }}
          >
            <p className="ds-label">시각 미확인 {untimed.length}</p>
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
