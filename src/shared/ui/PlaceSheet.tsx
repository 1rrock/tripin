"use client";

/**
 * 장소 상세.
 *
 * 모바일(네이버 문법):
 *   · 드로어 **하나**가 mid(지도 위 절반) ↔ full(전면) 을 높이로 오간다 —
 *     화면이 갈리지 않고 같은 상자가 자라나 합체한다
 *   · mid: 핸들 + 상호·메타 + 미디어. 위로 끌거나 스크롤 → full
 *   · full: 상단에 ← ♥ ✕ 헤더가 펼쳐지고 탭바 자리까지 덮는 전면
 *   · 뒤로가기: full→mid(history), mid→맵(onClose). full 의 ✕ 는 한 번에 닫는다
 *
 * 데스크톱: 지도 안 absolute 카드.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, Frame } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { SaveButton } from "@/shared/ui/SaveButton";
import { useSaved } from "@/shared/ui/SavedContext";
import { SummaryBlock } from "@/shared/ui/SummaryBlock";
import { useLocale } from "@/shared/i18n/LocaleContext";
import type { SummaryDisplay } from "@/shared/i18n/display";

export type PlaceDrawerSnap = "mid" | "full";

export const PLACE_DRAWER_MID_PCT = 52;

export interface SheetSource {
  creatorSlug: string;
  creatorName: string;
  initials: string;
  accentColor: string;
  avatarUrl?: string | null;
  youtubeId: string;
  videoTitle: string;
  timestampSec: number | null;
}

export interface SheetPlace {
  id: string;
  name: string;
  nameLocal: string | null;
  typeLabel: string;
  address: string | null;
  summary: SummaryDisplay;
  mapUrl: string | null;
  sources: SheetSource[];
}

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

export function PlaceSheet({
  place,
  index: _index,
  onClose,
  collapseToken = 0,
  onSnapChange,
}: {
  place: SheetPlace;
  index: number;
  onClose: () => void;
  collapseToken?: number;
  onSnapChange?: (snap: PlaceDrawerSnap) => void;
}) {
  void _index;
  const { messages: m, t } = useLocale();
  const { lists, listsOf } = useSaved();
  const hero = place.sources[0] ?? null;
  const groups = lists.filter((l) => listsOf(place.id).has(l.id)).map((l) => l.name);

  const scrollRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023.98px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const [snap, setSnap] = useState<PlaceDrawerSnap>("mid");
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const expandedByHistory = useRef(false);
  const lastCollapseToken = useRef(collapseToken);
  const pullStartY = useRef<number | null>(null);

  const setSnapBoth = useCallback(
    (next: PlaceDrawerSnap) => {
      setSnap(next);
      onSnapChange?.(next);
    },
    [onSnapChange],
  );

  useEffect(() => {
    setSnapBoth("mid");
    expandedByHistory.current = false;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [place.id, setSnapBoth]);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, [place.id, snap]);

  const expandFull = useCallback(() => {
    if (snapRef.current === "full") return;
    window.history.pushState(
      {
        ...(typeof window.history.state === "object" && window.history.state
          ? window.history.state
          : {}),
        __placeSheet: true,
        __placeFull: true,
      },
      "",
    );
    expandedByHistory.current = true;
    setSnapBoth("full");
  }, [setSnapBoth]);

  const collapseMid = useCallback(
    (opts?: { fromPopstate?: boolean }) => {
      if (snapRef.current === "mid") return;
      if (!opts?.fromPopstate && expandedByHistory.current) {
        expandedByHistory.current = false;
        window.history.back();
        return;
      }
      expandedByHistory.current = false;
      setSnapBoth("mid");
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    },
    [setSnapBoth],
  );

  useEffect(() => {
    if (!isMobile) return;
    const onPop = () => {
      if (snapRef.current === "full") {
        expandedByHistory.current = false;
        setSnapBoth("mid");
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isMobile, setSnapBoth]);

  /**
   * full 의 ✕ — 히스토리로 쌓은 full 층을 먼저 걷어낸 뒤 닫는다.
   * 안 걷으면 닫기가 mid 로 접히는 것처럼 보인다(뒤로 한 번이 full 층만 빼서).
   */
  const closeAll = useCallback(() => {
    if (snapRef.current === "full" && expandedByHistory.current) {
      expandedByHistory.current = false;
      window.addEventListener("popstate", () => onCloseRef.current(), { once: true });
      window.history.back();
      return;
    }
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (collapseToken === lastCollapseToken.current) return;
    lastCollapseToken.current = collapseToken;
    if (snapRef.current === "full") collapseMid();
    else onCloseRef.current();
  }, [collapseToken, collapseMid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (snapRef.current === "full") collapseMid();
      else onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapseMid]);

  useEffect(() => {
    if (!isMobile || snap !== "full") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, snap]);

  /* 스크롤 상자는 하나 — mid 에서 스크롤·위로 끌기 → full, full 맨 위에서 당기면 → mid */
  const onSheetScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (snapRef.current === "mid" && el.scrollTop > 16) expandFull();
  };
  const onSheetTouchStart = (e: React.TouchEvent) => {
    pullStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onSheetTouchMove = (e: React.TouchEvent) => {
    const el = scrollRef.current;
    const y0 = pullStartY.current;
    const y = e.touches[0]?.clientY;
    if (!el || y0 == null || y == null) return;
    if (snapRef.current === "mid") {
      /* 위로 스와이프 → full */
      if (y - y0 < -32) {
        expandFull();
        pullStartY.current = null;
      }
      return;
    }
    /* full: 최상단에서 더 당기면 mid */
    if (el.scrollTop <= 0 && y - y0 > 48) {
      collapseMid();
      pullStartY.current = null;
    }
  };
  const onSheetWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el || snapRef.current !== "full") return;
    if (el.scrollTop <= 0 && e.deltaY < 0) {
      e.preventDefault();
      collapseMid();
    }
  };

  const onBackClick = () => {
    if (snapRef.current === "full") collapseMid();
    else onCloseRef.current();
  };

  const meta = (
    <>
      <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
        {place.typeLabel}
        {place.nameLocal ? (
          <>
            {" · "}
            <span lang="ja">{place.nameLocal}</span>
          </>
        ) : null}
      </p>
      {place.address ? (
        <p className="mt-1" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
          {place.address}
        </p>
      ) : null}
      {groups.length > 0 ? (
        <p className="mt-1.5 truncate" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
          {groups.join(" · ")}
        </p>
      ) : null}
    </>
  );

  const heroBlock = hero ? (
    <OutboundA
      href={youtubeUrl(hero.youtubeId, hero.timestampSec)}
      title={hero.videoTitle}
      className="mt-3 block"
    >
      <Frame className="block w-full">
        <Thumb key={hero.youtubeId} youtubeId={hero.youtubeId} alt={hero.videoTitle} eager />
      </Frame>
      <span className="mt-2 block text-[13px] font-medium leading-snug">{hero.videoTitle}</span>
    </OutboundA>
  ) : null;

  const sourcesBlock = (
    <div className="mt-5 flex flex-col gap-3">
      {place.sources.map((s, i) => (
        <OutboundA
          key={`${s.youtubeId}-${i}`}
          href={youtubeUrl(s.youtubeId, s.timestampSec)}
          title={s.videoTitle}
          className="flex gap-3"
        >
          <Frame className="w-[120px] shrink-0">
            <Thumb key={s.youtubeId} youtubeId={s.youtubeId} alt={s.videoTitle} eager={i === 0} />
          </Frame>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <Avatar
                initials={s.initials}
                accent={s.accentColor}
                src={s.avatarUrl}
                size={20}
              />
              <span className="truncate text-[12px] font-semibold">{s.creatorName}</span>
            </span>
            <span className="mt-1 block text-[13px] leading-snug font-medium">{s.videoTitle}</span>
            <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-(--wax)">
              <Icon.play className="size-3.5" />
              {s.timestampSec !== null
                ? t(m.common.watchAt, { ts: fmt(s.timestampSec) })
                : m.common.watchVideo}
            </span>
          </span>
        </OutboundA>
      ))}
    </div>
  );

  const mapCta = place.mapUrl ? (
    <OutboundA
      href={place.mapUrl}
      className="flex h-12 w-full items-center justify-center gap-1.5 font-bold"
      style={{
        fontSize: "var(--t-body)",
        borderRadius: "var(--r-frame)",
        background: "var(--paper)",
        color: "var(--sheet)",
      }}
    >
      <Icon.out className="size-4" />
      {m.map.openInMapApp}
    </OutboundA>
  ) : null;

  /* ── 데스크톱 ── */
  if (!isMobile) {
    return (
      <div
        role="dialog"
        aria-label={t(m.map.detailAria, { name: place.name })}
        className="rise-in on-lightbox absolute inset-y-4 right-4 left-auto z-40 flex w-[min(460px,calc(100vw-520px))] flex-col overflow-hidden"
        style={{
          background: "var(--sheet)",
          color: "var(--paper)",
          borderRadius: "var(--r-control)",
          boxShadow: "var(--lift)",
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2
                className="font-black"
                style={{
                  fontSize: "var(--t-screen)",
                  letterSpacing: "-0.035em",
                  lineHeight: 1.2,
                }}
              >
                {place.name}
              </h2>
              <div className="mt-1.5">{meta}</div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <SaveButton placeId={place.id} placeName={place.name} bare />
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label={m.map.closeDetail}
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full active:bg-(--hover)"
                style={{ color: "var(--dim)" }}
              >
                <Icon.close className="size-[18px]" style={{ color: "var(--paper)" }} />
              </button>
            </div>
          </div>
          {heroBlock}
          <SummaryBlock className="mt-4" display={place.summary} dimColor="var(--dim)" />
          {sourcesBlock}
        </div>
        {mapCta ? (
          <div className="shrink-0 border-t p-4" style={{ borderColor: "var(--hairline)" }}>
            {mapCta}
          </div>
        ) : null}
      </div>
    );
  }

  /* ── 모바일: 드로어 하나 — mid ↔ full 을 높이로 오가며 합체한다 ── */
  const full = snap === "full";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(m.map.detailAria, { name: place.name })}
      className="place-drawer on-lightbox"
      data-snap={snap}
      style={{ background: "var(--sheet)", color: "var(--paper)" }}
    >
      {/* full 헤더 — mid 에선 높이 0 으로 접혀 있다. 드로어가 자라며 함께 펼쳐진다 */}
      <div className="place-drawer-appbar" inert={!full}>
        <button
          ref={full ? closeBtnRef : undefined}
          type="button"
          onClick={onBackClick}
          aria-label={m.map.backToMap}
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors active:bg-(--hover)"
        >
          <Icon.back className="size-5" />
        </button>
        <div className="min-w-0 flex-1" />
        <SaveButton placeId={place.id} placeName={place.name} bare />
        <button
          type="button"
          onClick={closeAll}
          aria-label={m.map.closeDetail}
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors active:bg-(--hover)"
        >
          <Icon.close className="size-[18px]" />
        </button>
      </div>

      <div className="place-drawer-handle" aria-hidden />

      <div className="flex shrink-0 items-start gap-2 px-4 pb-1">
        <div className="min-w-0 flex-1">
          <h2
            className="truncate font-black"
            style={{
              fontSize: "var(--t-screen)",
              letterSpacing: "-0.035em",
              lineHeight: 1.2,
            }}
          >
            {place.name}
          </h2>
          <div className="mt-1">{meta}</div>
        </div>
        {/* mid 의 하트·닫기 — full 로 자라면 헤더의 같은 버튼에 자리를 넘긴다 */}
        <div className="place-drawer-titletools mt-0.5 flex shrink-0 items-center gap-0.5" inert={full}>
          <SaveButton placeId={place.id} placeName={place.name} bare />
          <button
            ref={full ? undefined : closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={m.map.closeDetail}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full active:bg-(--hover)"
            style={{ color: "var(--dim)" }}
          >
            <Icon.close className="size-[18px]" style={{ color: "var(--paper)" }} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="place-drawer-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
        onScroll={onSheetScroll}
        onTouchStart={onSheetTouchStart}
        onTouchMove={onSheetTouchMove}
        onWheel={onSheetWheel}
      >
        {heroBlock}
        <SummaryBlock className="mt-4" display={place.summary} dimColor="var(--dim)" />
        {sourcesBlock}
        {/* 스크롤 여유 — 당겨 올리면 full 로 넘어감 */}
        <div className="h-16" />
      </div>

      {mapCta ? (
        <div
          className="shrink-0 border-t bg-(--sheet) px-4 pt-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
          style={{ borderColor: "var(--hairline)" }}
        >
          {mapCta}
        </div>
      ) : null}
    </div>
  );
}
