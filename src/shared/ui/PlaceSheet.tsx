"use client";

/**
 * 장소 상세.
 *
 * 모바일(네이버 문법):
 *   · 드로어 **하나**가 peek ↔ mid ↔ full 을 오간다. 전환은 FLIP(transform)
 *   · peek: 핸들 + 상호만. 아래로 더 당기면 닫힘
 *   · mid: 핸들 + 상호·메타 + CTA. 위로 밀면 full, 아래로 내리면 peek
 *   · full: 상단 ← ♥ ✕. 본문 스크롤은 전면 애니 뒤에만 연다
 *   · 뒤로가기: full→mid(history), mid/peek→맵(onClose). full 의 ✕ 는 한 번에 닫는다
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

export type PlaceDrawerSnap = "peek" | "mid" | "full";

export const PLACE_DRAWER_PEEK_PCT = 26;
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const flipCleanupRef = useRef<(() => void) | null>(null);
  const onCloseRef = useRef(onClose);
  const onSnapChangeRef = useRef(onSnapChange);
  useEffect(() => {
    onCloseRef.current = onClose;
    onSnapChangeRef.current = onSnapChange;
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
  const [scrollReady, setScrollReady] = useState(false);
  const snapRef = useRef(snap);
  /* 렌더 중이 아니라 이펙트에서 넣는다(react-hooks/refs) — 읽는 곳은 전부
     사용자 이벤트 콜백이라 커밋 뒤다. 위 onCloseRef 와 같은 계약. */
  useEffect(() => {
    snapRef.current = snap;
  });
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

  /* peek↔mid↔full — 레이아웃은 한 번에 확정하고, 시각만 translateY 로 잇는다.
     height 를 CSS 로 보간하면 드로어·앱바·탭바가 매 프레임 레이아웃된다.
     본문 스크롤은 full 애니가 끝난 뒤에만 연다. */
  const flipSnap = useCallback(
    (next: PlaceDrawerSnap) => {
      if (snapRef.current === next) return;
      snapRef.current = next;
      if (next !== "full") {
        setScrollReady(false);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }
      const el = drawerRef.current;
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      flipCleanupRef.current?.();
      flipCleanupRef.current = null;
      const finish = () => {
        if (next === "full") setScrollReady(true);
      };
      if (!el || reduce) {
        setSnapBoth(next);
        finish();
        return;
      }
      const first = el.getBoundingClientRect();
      el.dataset.snap = next;
      const last = el.getBoundingClientRect();
      const dy = first.top - last.top;
      setSnapBoth(next);
      if (Math.abs(dy) < 1) {
        finish();
        return;
      }
      el.style.transition = "none";
      el.style.transform = `translate3d(0, ${dy}px, 0)`;
      el.style.willChange = "transform";
      let cancelled = false;
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          el.style.transition = "transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)";
          el.style.transform = "translate3d(0, 0, 0)";
        });
      });
      const done = (e?: TransitionEvent) => {
        if (e && e.propertyName !== "transform") return;
        el.style.transition = "";
        el.style.transform = "";
        el.style.willChange = "";
        el.removeEventListener("transitionend", done);
        if (flipCleanupRef.current === cleanup) flipCleanupRef.current = null;
        finish();
      };
      const cleanup = () => {
        cancelled = true;
        cancelAnimationFrame(raf1);
        el.removeEventListener("transitionend", done);
        el.style.transition = "";
        el.style.transform = "";
        el.style.willChange = "";
      };
      el.addEventListener("transitionend", done);
      flipCleanupRef.current = cleanup;
    },
    [setSnapBoth],
  );

  /* 장소가 바뀌면 렌더 중에 mid 로 되돌린다 — 이펙트로 미루면 새 장소가 이전
     스냅 높이로 한 프레임 그려진다. 부모 알림·스크롤 리셋은 커밋 뒤 일이라
     아래 이펙트에 남는다(react-hooks/set-state-in-effect). */
  const [prevPlaceId, setPrevPlaceId] = useState(place.id);
  if (prevPlaceId !== place.id) {
    setPrevPlaceId(place.id);
    setSnap("mid");
    setScrollReady(false);
  }
  useEffect(() => {
    flipCleanupRef.current?.();
    flipCleanupRef.current = null;
    onSnapChangeRef.current?.("mid");
    expandedByHistory.current = false;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [place.id]);

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
    flipSnap("full");
  }, [flipSnap]);

  const collapseMid = useCallback(
    (opts?: { fromPopstate?: boolean }) => {
      if (snapRef.current === "mid") return;
      if (!opts?.fromPopstate && expandedByHistory.current) {
        expandedByHistory.current = false;
        window.history.back();
        return;
      }
      expandedByHistory.current = false;
      flipSnap("mid");
    },
    [flipSnap],
  );

  const collapsePeek = useCallback(() => {
    if (snapRef.current === "peek") return;
    if (snapRef.current === "full" && expandedByHistory.current) {
      expandedByHistory.current = false;
      window.history.back();
      return;
    }
    flipSnap("peek");
  }, [flipSnap]);

  const stepLarger = useCallback(() => {
    if (snapRef.current === "peek") flipSnap("mid");
    else expandFull();
  }, [flipSnap, expandFull]);

  const stepSmaller = useCallback(() => {
    if (snapRef.current === "full") collapseMid();
    else if (snapRef.current === "mid") collapsePeek();
    else onCloseRef.current();
  }, [collapseMid, collapsePeek]);

  useEffect(() => {
    if (!isMobile) return;
    const onPop = () => {
      if (snapRef.current === "full") {
        expandedByHistory.current = false;
        flipSnap("mid");
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isMobile, flipSnap]);

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

  /* 접힌 동안은 본문을 스크롤하지 않는다. 위로 밀면 한 단 커지고, 전면이 된 뒤에만 스크롤. */
  const onSheetScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (snapRef.current !== "full") {
      el.scrollTop = 0;
    }
  };
  const onSheetTouchStart = (e: React.TouchEvent) => {
    pullStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onSheetTouchMove = (e: React.TouchEvent) => {
    const el = scrollRef.current;
    const y0 = pullStartY.current;
    const y = e.touches[0]?.clientY;
    if (!el || y0 == null || y == null) return;
    const dy = y - y0;
    if (snapRef.current !== "full") {
      if (dy < -32) {
        stepLarger();
        pullStartY.current = null;
      } else if (dy > 48) {
        stepSmaller();
        pullStartY.current = null;
      }
      return;
    }
    if (el.scrollTop <= 0 && dy > 48) {
      collapseMid();
      pullStartY.current = null;
    }
  };
  const onSheetWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (snapRef.current !== "full") {
      e.preventDefault();
      if (e.deltaY > 0) stepLarger();
      else if (e.deltaY < 0) stepSmaller();
      return;
    }
    if (el.scrollTop <= 0 && e.deltaY < 0) {
      e.preventDefault();
      collapseMid();
    }
  };

  const handleStartY = useRef<number | null>(null);
  const onHandlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handleStartY.current = e.clientY;
  };
  const onHandlePointerUp = (e: React.PointerEvent) => {
    const y0 = handleStartY.current;
    handleStartY.current = null;
    if (y0 == null) return;
    const dy = e.clientY - y0;
    if (dy < -32) stepLarger();
    else if (dy > 48) stepSmaller();
  };

  const onBackClick = () => {
    if (snapRef.current === "full") collapseMid();
    else onCloseRef.current();
  };

  useEffect(() => () => flipCleanupRef.current?.(), []);

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
              {/* 세 줄에서 끊는다 — 영상 제목이 그대로 이름인 장소가 있어서, 안 끊으면
                  제목 하나가 패널 첫 화면의 3분의 1을 먹고 사진과 본문을 아래로 민다.
                  전문은 title 속성에 남는다(핀 라벨과 같은 처방 — MapView 주석). */}
              <h2
                className="line-clamp-3 font-black"
                title={place.name}
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
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-label={t(m.map.detailAria, { name: place.name })}
      className={`place-drawer on-lightbox${scrollReady ? " is-scroll-ready" : ""}`}
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

      <div
        className="place-drawer-handle"
        aria-hidden
        onPointerDown={onHandlePointerDown}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerUp}
      />

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
        className="place-drawer-scroll min-h-0 flex-1 px-4"
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
          className="place-drawer-dock shrink-0 border-t bg-(--sheet) px-4 pt-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
          style={{ borderColor: "var(--hairline)" }}
        >
          {mapCta}
        </div>
      ) : null}
    </div>
  );
}
