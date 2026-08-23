"use client";

/**
 * 장소 상세.
 *
 * 모바일(네이버 문법):
 *   · 드로어 **하나**가 peek ↔ mid ↔ full 을 오간다. 전환은 FLIP(transform)
 *   · peek(내림): 제목 + 종류만. 더 내리면 닫힘
 *   · mid(중간, 선택 시): 절반 + 로딩 후 본문. 본문 스크롤은 잠김
 *   · full(전면): 애니 뒤에만 스크롤
 *   · 한 제스처에 한 단만 — peek에서 올리면 mid, mid에서 올리면 full
 *   · 뒤로: full→mid, mid/peek→맵
 *
 * 데스크톱: 지도 안 absolute 카드.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, Chip, Frame, Rule } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { Act, Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { SaveButton } from "@/shared/ui/SaveButton";
import { ShareButton } from "@/shared/ui/ShareButton";
import { useSaved } from "@/shared/ui/SavedContext";
import { SummaryBlock } from "@/shared/ui/SummaryBlock";
import { useLocale } from "@/shared/i18n/LocaleContext";
import type { SummaryDisplay } from "@/shared/i18n/display";
import type { MapLink } from "@/shared/lib/map-links";
import { placePath } from "@/shared/lib/place-path";
import { celebAnchor } from "@/shared/lib/celeb-anchor";

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
  /** `/place/[slug]` 공유 링크. `/map` 은 상세 응답에만 실려 오므로 오기 전엔 null —
      그동안 공유 버튼은 안 그린다(현재 URL 을 대신 공유하면 도시 화면 주소가 나간다). */
  slug: string | null;
  name: string;
  nameLocal: string | null;
  typeLabel: string;
  address: string | null;
  summary: SummaryDisplay;
  /** 열 수 있는 지도 앱 전부 — 첫 번째가 이 나라의 기본(shared/lib/map-links.ts) */
  mapLinks: MapLink[];
  sources: SheetSource[];
  /** 이 장소를 다녀간 연예인 — 상세 응답에만 실려 온다. 없거나 빈 배열이면 칩을 안 그린다 */
  celebrities?: { name: string; nameEn: string | null }[];
}

/** 아웃링크 — 유튜브는 타임스탬프 포함(&t=초). 목록 행과 같은 문법. */
function youtubeUrl(videoId: string, sec: number | null): string {
  return `https://www.youtube.com/watch?v=${videoId}${sec !== null ? `&t=${Math.floor(sec)}s` : ""}`;
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

/** 상세를 받기 전에 목록이 이미 아는 것 — 대표 컷은 뼈 대신 진짜를 깐다.
 *  제목은 없다. 인덱스에서 뺐다(cities.ts MapCanvasPlace 주석) — 상세가 오면 채워진다. */
export interface SheetHeroHint {
  creatorSlug: string;
  youtubeId: string;
}

export function PlaceSheet({
  place,
  index: _index,
  onClose,
  collapseToken = 0,
  onSnapChange,
  onSelectChannel,
  loading = false,
  heroHint = null,
}: {
  place: SheetPlace;
  index: number;
  onClose: () => void;
  collapseToken?: number;
  onSnapChange?: (snap: PlaceDrawerSnap) => void;
  onSelectChannel?: (creatorSlug: string) => void;
  /** 요약·출처를 아직 못 받았다 — 본문 자리에 뼈를 세운다 */
  loading?: boolean;
  heroHint?: SheetHeroHint | null;
}) {
  void _index;
  const { locale, messages: m, t, href } = useLocale();
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
  const [booting, setBooting] = useState(true);
  const gestureLockRef = useRef(false);
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
    setBooting(true);
  }
  useEffect(() => {
    flipCleanupRef.current?.();
    flipCleanupRef.current = null;
    onSnapChangeRef.current?.("mid");
    expandedByHistory.current = false;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [place.id]);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setBooting(false), reduce ? 0 : 240);
    return () => window.clearTimeout(t);
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
    gestureLockRef.current = false;
  };
  const onSheetTouchMove = (e: React.TouchEvent) => {
    const el = scrollRef.current;
    const y0 = pullStartY.current;
    const y = e.touches[0]?.clientY;
    if (!el || y0 == null || y == null || gestureLockRef.current) return;
    const dy = y - y0;
    if (snapRef.current !== "full") {
      if (dy < -32) {
        gestureLockRef.current = true;
        stepLarger();
        pullStartY.current = null;
      } else if (dy > 48) {
        gestureLockRef.current = true;
        stepSmaller();
        pullStartY.current = null;
      }
      return;
    }
    if (el.scrollTop <= 0 && dy > 48) {
      gestureLockRef.current = true;
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
    gestureLockRef.current = false;
  };
  const onHandlePointerUp = (e: React.PointerEvent) => {
    const y0 = handleStartY.current;
    handleStartY.current = null;
    if (y0 == null || gestureLockRef.current) return;
    const dy = e.clientY - y0;
    if (dy < -32) {
      gestureLockRef.current = true;
      stepLarger();
    } else if (dy > 48) {
      gestureLockRef.current = true;
      stepSmaller();
    }
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
      ) : loading ? (
        <p className="mt-1" style={{ fontSize: "var(--t-meta)" }}>
          <span className="bone-line inline-block w-[62%] align-middle" />
        </p>
      ) : null}
      {groups.length > 0 ? (
        <p className="mt-1.5 truncate" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
          {groups.join(" · ")}
        </p>
      ) : null}
    </>
  );

  /* 대표 컷은 "그냥 보고 싶다"를 받는다 — 눌러서 유튜브로 바로 나간다.
     타임라인이 있는 우리 영상 화면은 아래 출처 줄의 "영상 상세보기"가 맡는다. */
  const heroShown:
    | { creatorSlug: string; youtubeId: string; videoTitle?: string; timestampSec?: number | null }
    | null = hero ?? (loading ? heroHint : null);
  const heroBlock = heroShown ? (
    <OutboundA
      href={youtubeUrl(heroShown.youtubeId, heroShown.timestampSec ?? null)}
      title={heroShown.videoTitle ?? place.name}
      className="mt-3 block"
    >
      <Frame className="block w-full">
        <Thumb
          key={heroShown.youtubeId}
          youtubeId={heroShown.youtubeId}
          alt={heroShown.videoTitle ?? place.name}
          eager
          variant="hero"
        />
      </Frame>
      <span className="mt-2 block text-[13px] font-medium leading-snug">
        {heroShown.videoTitle ?? <span className="bone-line inline-block w-[70%] align-middle" />}
      </span>
    </OutboundA>
  ) : loading ? (
    <span className="mt-3 block" aria-hidden>
      <span className="frame block w-full">
        <span className="bone" />
      </span>
      <span className="mt-2 block text-[13px] leading-snug">
        <span className="bone-line inline-block w-[70%] align-middle" />
      </span>
    </span>
  ) : null;

  /** 요약·출처 자리 — 본문이 오기 전 같은 높이를 잡아 두어 도착해도 안 튄다 */
  const bodyBones = (
    <div aria-hidden>
      <div className="mt-4 flex flex-col gap-2">
        {["94%", "82%", "60%"].map((w, i) => (
          <span key={i} className="block" style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}>
            <span className="bone-line inline-block align-middle" style={{ width: w }} />
          </span>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3">
            <span className="w-[120px] shrink-0">
              <span className="frame block w-full">
                <span className="bone" />
              </span>
            </span>
            <span className="min-w-0 flex-1 pt-1">
              <span className="block">
                <span className="bone-line inline-block w-[46%] align-middle" />
              </span>
              <span className="mt-2 block">
                <span className="bone-line inline-block w-[88%] align-middle" />
              </span>
              <span className="mt-2 block">
                <span className="bone-line inline-block w-[34%] align-middle" />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  /**
   * 출처 영상 — **한 장에 한 영상.**
   *
   * 예전 모양은 `[썸네일 120px][채널 · 제목 · 링크 두 개]` 한 줄이었고, 세 가지가
   * 동시에 어긋났다. 채널 버튼이 터치 크기(min-h-11)를 세로로 먹어 제목이 썸네일
   * 중간부터 시작했고, 글줄 높이가 썸네일보다 커서 아래가 들쭉날쭉했고, 무엇보다
   * 첫 출처의 썸네일은 바로 위 대표 컷과 **같은 그림**이라 같은 장면이 두 번 나왔다.
   *
   * 그래서 줄을 층으로 바꾼다: 채널 / 영상 / 행동. 각 층은 자기 높이만 쓴다.
   *   · 채널 이름 → 채널 페이지. 지도를 그 채널로 좁히는 건 옆의 별도 버튼이다
   *     (이름을 누르면 필터가 걸리던 동작은 "이동"으로 읽혀 매번 어긋났다)
   *   · 대표 컷이 이미 보여 준 영상이면 썸네일을 다시 깔지 않는다
   *   · 행동은 둘 다 버튼으로 세운다 — 유튜브(왁스)와 우리 영상 화면(외곽선)
   */
  /* 연예인 역링크 — 장소 상세 페이지·영상 페이지의 "OO 간 곳 전부 보기" 칩과
     같은 문법(`size="md" tone="wax"`). 지도가 주요 발견 경로인데 드로어에서만
     이 신호가 사라지면 안 된다. 손으로 적던 사본은 계산 높이가 32px 이라
     같은 역할의 칩이 화면마다 32/36 으로 갈렸다 — 봉인된 규격으로 맞춘다. */
  const celebBlock =
    place.celebrities && place.celebrities.length > 0 ? (
      <div className="mt-4 flex flex-wrap gap-2">
        {place.celebrities.map((c) => (
          <Chip key={c.name} size="md" tone="wax" href={href(`/celebs#${celebAnchor(c.name)}`)}>
            {t(m.placeDetail.celebMore, {
              person: locale === "ko" ? c.name : (c.nameEn ?? c.name),
            })}
            <Icon.chevron className="size-2.5" />
          </Chip>
        ))}
      </div>
    ) : null;

  const sourcesBlock = place.sources.length > 0 ? (
    <div className="mt-5">
      <h3 className="index mb-1" style={{ color: "var(--dim)" }}>
        {m.map.sourcesHeading}
      </h3>
      {place.sources.map((s, i) => {
        const videoHref = href(`/c/${s.creatorSlug}/v/${s.youtubeId}`);
        const heroShowsThis = heroShown?.youtubeId === s.youtubeId;
        return (
          <div key={`${s.youtubeId}-${i}`}>
            <Rule />
            <div className="flex flex-col gap-2.5 py-3">
              {/* 채널 줄 — 왼쪽은 **이동**(채널 페이지), 오른쪽은 이 지도를 좁히는 필터.
                  예전엔 이름을 누르면 필터가 걸렸다. 이름 옆에 아바타가 붙은 줄은
                  어느 앱에서나 "그리로 간다"로 읽혀서, 누를 때마다 기대가 어긋났다. */}
              <div className="flex items-center gap-2">
                <Link
                  href={href(`/c/${s.creatorSlug}`)}
                  title={t(m.map.openChannel, { creator: s.creatorName })}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <Avatar initials={s.initials} accent={s.accentColor} src={s.avatarUrl} size={22} />
                  <span className="truncate text-[13px] font-bold">{s.creatorName}</span>
                  <Icon.chevron className="size-2.5 shrink-0" style={{ color: "var(--dim)" }} />
                </Link>
                {onSelectChannel ? (
                  <Chip className="shrink-0" onClick={() => onSelectChannel(s.creatorSlug)}>
                    {m.map.filterByChannel}
                  </Chip>
                ) : null}
              </div>

              {/* 영상 줄 — 대표 컷이 같은 영상을 이미 띄웠으면 썸네일을 겹치지 않는다 */}
              <Link href={videoHref} title={s.videoTitle} className="flex items-start gap-3">
                {heroShowsThis ? null : (
                  <span className="w-[104px] shrink-0">
                    <Frame className="block w-full">
                      <Thumb key={s.youtubeId} youtubeId={s.youtubeId} alt={s.videoTitle} />
                    </Frame>
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-[13px] leading-snug font-medium">
                    {s.videoTitle}
                  </span>
                  {s.timestampSec !== null ? (
                    <span className="tnum mt-1 block text-[12px]" style={{ color: "var(--dim)" }}>
                      {fmt(s.timestampSec)}
                    </span>
                  ) : null}
                </span>
              </Link>

              {/* 두 갈래를 다 세운다 — 유튜브로 바로 나갈 사람과, 타임라인이 붙은
                  우리 영상 화면을 볼 사람. 예전엔 12px 글자 링크라 손가락으로 짚기
                  어려웠다. 알약은 이 월드가 이미 쓰는 행동 문법이다(Act). */}
              <div className="flex flex-wrap gap-2">
                <Act icon="play" href={youtubeUrl(s.youtubeId, s.timestampSec)} title={s.videoTitle}>
                  {s.timestampSec !== null
                    ? t(m.common.watchOnYoutubeAt, { ts: fmt(s.timestampSec) })
                    : m.common.watchOnYoutube}
                </Act>
                <Act icon="clock" href={videoHref}>
                  {m.common.videoDetail}
                </Act>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  /* 지도는 하나로 정하지 않고 고르게 한다 — 같은 가게라도 구글엔 사진·영업시간이,
     네이버엔 한글 리뷰·길찾기가 있다. 첫 번째가 그 나라의 기본이라 칠해 둔다. */
  const mapCta = loading && place.mapLinks.length === 0 ? (
    <span
      aria-hidden
      className="bone-line block w-full"
      style={{ height: 48, borderRadius: "var(--r-frame)" }}
    />
  ) : place.mapLinks.length > 0 ? (
    <div role="group" aria-label={m.map.openInMapApp} className="flex w-full gap-2">
      {place.mapLinks.map((link, i) => (
        <OutboundA
          key={link.app}
          href={link.url}
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 font-bold"
          style={{
            fontSize: place.mapLinks.length > 2 ? "var(--t-meta)" : "var(--t-body)",
            borderRadius: "var(--r-frame)",
            background: i === 0 ? "var(--paper)" : "transparent",
            color: i === 0 ? "var(--sheet)" : "var(--paper)",
            boxShadow: i === 0 ? undefined : "inset 0 0 0 1px var(--hairline)",
          }}
        >
          {place.mapLinks.length === 1 ? <Icon.out className="size-4" /> : null}
          <span className="truncate">{m.map.mapApps[link.app]}</span>
        </OutboundA>
      ))}
    </div>
  ) : null;

  /* ── 데스크톱 ── */
  if (!isMobile) {
    return (
      <div
        role="dialog"
        aria-label={t(m.map.detailAria, { name: place.name })}
        aria-busy={loading || undefined}
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
              {place.slug ? (
                <ShareButton title={place.name} path={placePath(place.slug)} bare />
              ) : null}
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
          {loading ? (
            bodyBones
          ) : (
            <>
              <SummaryBlock className="mt-4" display={place.summary} dimColor="var(--dim)" />
              {celebBlock}
              {sourcesBlock}
            </>
          )}
        </div>
        {mapCta ? (
          <div className="shrink-0 border-t p-4" style={{ borderColor: "var(--hairline)" }}>
            {mapCta}
          </div>
        ) : null}
      </div>
    );
  }

  /* ── 모바일: peek(하단 카드) ↔ mid ↔ full ── */
  const peek = snap === "peek";
  const full = snap === "full";
  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-label={t(m.map.detailAria, { name: place.name })}
      aria-busy={loading || undefined}
      className={`place-drawer on-lightbox${scrollReady ? " is-scroll-ready" : ""}${booting ? " is-booting" : ""}`}
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
        {place.slug ? <ShareButton title={place.name} path={placePath(place.slug)} bare /> : null}
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

      {/* peek — 제목 + 종류만. 컷·CTA 는 중간(mid) 부터. */}
      <div
        className="place-drawer-peekcard px-4 pb-3"
        onTouchStart={onSheetTouchStart}
        onTouchMove={onSheetTouchMove}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2
              className="line-clamp-2 font-black"
              title={place.name}
              style={{
                fontSize: "var(--t-title)",
                letterSpacing: "-0.03em",
                lineHeight: 1.25,
              }}
            >
              {place.name}
            </h2>
            <p className="mt-1" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              {place.typeLabel}
            </p>
          </div>
          <button
            ref={peek ? closeBtnRef : undefined}
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

      {booting && !peek ? (
        <div className="place-drawer-midboot px-4 pb-6">
          <span className="block pt-1">
            <span className="bone-line" style={{ width: "72%" }} />
          </span>
          <span className="mt-2 block">
            <span className="bone-line" style={{ width: "38%" }} />
          </span>
          <span
            className="bone mt-4 block"
            style={{ width: "100%", height: 160, borderRadius: "var(--r-frame)" }}
          />
        </div>
      ) : null}

      <div className="place-drawer-midhead flex shrink-0 items-start gap-2 px-4 pb-1">
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
          {place.slug ? <ShareButton title={place.name} path={placePath(place.slug)} bare /> : null}
          <SaveButton placeId={place.id} placeName={place.name} bare />
          <button
            ref={full || peek ? undefined : closeBtnRef}
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
        {loading ? (
          bodyBones
        ) : (
          <>
            <SummaryBlock className="mt-4" display={place.summary} dimColor="var(--dim)" />
            {celebBlock}
            {sourcesBlock}
          </>
        )}
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
