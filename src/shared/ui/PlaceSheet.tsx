"use client";

/**
 * 장소 상세.
 *
 * 모바일(네이버 문법):
 *   · mid 드로어 — 지도 위 절반. 상호·미디어·요약·출처, **지도에서 열기는 맨 아래**
 *   · full 페이지 모달 — 스크롤 내리면 페이지 전환처럼 전면. 맨 위 오버스크롤·아래로 당기기 → mid
 *   · 뒤로가기: full→mid(history), mid→맵(onClose)
 *
 * 데스크톱: 지도 안 absolute 카드.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppBar, AppBarButton } from "@/shared/ui/AppBar";
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

  const midScrollRef = useRef<HTMLDivElement>(null);
  const fullScrollRef = useRef<HTMLDivElement>(null);
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
  const pulling = useRef(false);

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
    if (midScrollRef.current) midScrollRef.current.scrollTop = 0;
    if (fullScrollRef.current) fullScrollRef.current.scrollTop = 0;
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
      if (midScrollRef.current) midScrollRef.current.scrollTop = 0;
      if (fullScrollRef.current) fullScrollRef.current.scrollTop = 0;
    },
    [setSnapBoth],
  );

  useEffect(() => {
    if (!isMobile) return;
    const onPop = () => {
      if (snapRef.current === "full") {
        expandedByHistory.current = false;
        setSnapBoth("mid");
        if (midScrollRef.current) midScrollRef.current.scrollTop = 0;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isMobile, setSnapBoth]);

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

  /* mid: 스크롤 내리면 페이지 모달로 */
  const onMidScroll = () => {
    const el = midScrollRef.current;
    if (!el || snapRef.current !== "mid") return;
    if (el.scrollTop > 16) expandFull();
  };

  const onMidTouchStart = (e: React.TouchEvent) => {
    pullStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onMidTouchMove = (e: React.TouchEvent) => {
    const y0 = pullStartY.current;
    const y = e.touches[0]?.clientY;
    if (y0 == null || y == null) return;
    /* 위로 스와이프 → full */
    if (y - y0 < -32) {
      expandFull();
      pullStartY.current = null;
    }
  };

  /* full: 최상단에서 더 당기면 mid */
  const onFullTouchStart = (e: React.TouchEvent) => {
    const el = fullScrollRef.current;
    pullStartY.current = e.touches[0]?.clientY ?? null;
    pulling.current = Boolean(el && el.scrollTop <= 0);
  };
  const onFullTouchMove = (e: React.TouchEvent) => {
    const el = fullScrollRef.current;
    const y0 = pullStartY.current;
    const y = e.touches[0]?.clientY;
    if (!el || y0 == null || y == null) return;
    if (el.scrollTop <= 0 && y - y0 > 48) {
      collapseMid();
      pullStartY.current = null;
      pulling.current = false;
    }
  };
  const onFullScroll = () => {
    /* wheel 등: 최상단에서 더 이상 못 갈 때 내려가려는 제스처는 touch 로 처리.
       일부 브라우저 overscroll — scrollTop 0 유지 시 wheel delta 로 접기 */
  };
  const onFullWheel = (e: React.WheelEvent) => {
    const el = fullScrollRef.current;
    if (!el) return;
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

  /* ── 모바일 full: 페이지 전환형 전면 모달 ── */
  const fullPage =
    snap === "full" ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(m.map.detailAria, { name: place.name })}
        className="place-page rise-in on-lightbox fixed inset-0 z-[70] flex flex-col bg-(--sheet) text-(--paper)"
      >
        {/* 공용 머리말 — 지도·저장·마이의 상단 바와 같은 조각(AppBar) */}
        <AppBar
          className="shrink-0 border-b px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2"
          style={{ borderColor: "var(--hairline)" }}
          titleAs="h2"
          title={place.name}
          leading={
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onBackClick}
              aria-label={m.map.backToMap}
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors active:bg-(--hover)"
              style={{ color: "var(--paper)" }}
            >
              <Icon.back className="size-5" />
            </button>
          }
          actions={
            <>
              <SaveButton placeId={place.id} placeName={place.name} bare />
              <AppBarButton label={m.map.closeDetail} onClick={onClose}>
                <Icon.close className="size-[18px]" />
              </AppBarButton>
            </>
          }
        />

        <div
          ref={fullScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3"
          onTouchStart={onFullTouchStart}
          onTouchMove={onFullTouchMove}
          onScroll={onFullScroll}
          onWheel={onFullWheel}
        >
          <div className="mb-1">{meta}</div>
          {heroBlock}
          <SummaryBlock className="mt-4" display={place.summary} dimColor="var(--dim)" />
          {sourcesBlock}
          {/* 하단 CTA 가 스크롤 끝에 오도록 여백 */}
          <div className="h-24" />
        </div>

        {mapCta ? (
          <div
            className="shrink-0 border-t bg-(--sheet) px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            style={{ borderColor: "var(--hairline)" }}
          >
            {mapCta}
          </div>
        ) : null}
      </div>
    ) : null;

  /* ── 모바일 mid 드로어 ── */
  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(m.map.detailAria, { name: place.name })}
        className="place-drawer on-lightbox"
        style={{
          height: `${PLACE_DRAWER_MID_PCT}%`,
          background: "var(--sheet)",
          color: "var(--paper)",
          /* full 일 때도 지도 위 자리 유지(밑에서 포탈 모달이 덮음) */
          visibility: snap === "full" ? "hidden" : "visible",
          pointerEvents: snap === "full" ? "none" : "auto",
        }}
      >
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
          {/* 우측: 하트 · 닫기(예전 ⋯ 자리). ⋯ 메뉴는 하트가 그룹 시트를 열어서 불필요 */}
          <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
            <SaveButton placeId={place.id} placeName={place.name} bare />
            <button
              ref={snap === "mid" ? closeBtnRef : undefined}
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
          ref={midScrollRef}
          className="place-drawer-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
          onScroll={onMidScroll}
          onTouchStart={onMidTouchStart}
          onTouchMove={onMidTouchMove}
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

      {fullPage ? createPortal(fullPage, document.body) : null}
    </>
  );
}
