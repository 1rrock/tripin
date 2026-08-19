"use client";

/**
 * 전역 지도 캔버스. `/map` 은 전 구간, 지역·종류·채널은 데스크톱만.
 * 클릭·검색은 이 지도를 좁힌다. 종류·지역·채널은 필터.
 * 핀은 번호가 아니라 점 → 가까이서 상호. 누르면 상세.
 *
 * 모바일 문법(네이버 지도형):
 *   · 지도 전면 + 목록 바텀시트
 *   · 목록/핀 선택 → 즉시 mid 로딩 카드 + 핀으로 이동. Next 라우터는 안 탄다
 *   · peek(제목+종류) / mid(중간) / full(전면). 한 제스처에 한 단만
 *   · 목록도 전면으로 올린 뒤에만 스크롤. 상세에서 돌아와도 시트 높이는 유지
 *   · 지도 클릭·핸들로 목록을 내린다
 *   · 상세 URL 은 history.pushState — 엣지 스와이프·뒤로가기가 히스토리를 탄다
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon as MagnifyingGlass, XIcon as X } from "@phosphor-icons/react";
import type { FeedCreator } from "@/shared/api/home";
import type { CityRow, MapCanvasPlace, MapPlaceDetail } from "@/shared/api/cities";
import type { PlaceType } from "@/shared/api/database.types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import { Frame } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { Icon } from "@/shared/ui/icons";
import dynamic from "next/dynamic";
import { PlaceSheet, type PlaceDrawerSnap } from "@/shared/ui/PlaceSheet";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Bone, BoneFrame } from "@/shared/ui/skeleton/bones";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import {
  HOME_REGION_ORDER,
  homeRegionForCountry,
  isHomeRegionId,
  type HomeRegionId,
} from "@/shared/lib/geo-regions";
import {
  keepAxesForApply,
  placeMatchesMapFilter,
  reconcileMapFilter,
  type MapFilterAxes,
} from "@/shared/lib/map-filters";
import { CanvasFilters } from "./CanvasFilters";
import { SavedMapChips } from "./SavedMapChips";
import { useSaved } from "@/shared/ui/SavedContext";

const MapView = dynamic(
  () => import("@/shared/ui/MapView").then((mod) => ({ default: mod.MapView })),
  { ssr: false },
);

export type CanvasLead = "home" | "region" | "channel" | "type";

/** 바텀시트 스냅 — 화면(캔버스) 높이 비율 % */
const SHEET_PEEK = 30;
const SHEET_MID = 52;
const SHEET_FULL = 88;
/** 목록 시트가 한 번에 그리는 행 수 — 나머지는 스크롤 꼬리(ListMore)가 이어 연다 */
const LIST_CHUNK = 48;
const SHEET_SNAPS = [SHEET_PEEK, SHEET_MID, SHEET_FULL] as const;

export function HomeCanvas(props: {
  places: MapCanvasPlace[];
  cities: CityRow[];
  creators: FeedCreator[];
}) {
  return <ExplorerCanvas lead="home" surface="page" {...props} />;
}

export function ExplorerCanvas({
  places,
  cities,
  creators,
  lead = "home",
  surface = "overlay",
}: {
  places: MapCanvasPlace[];
  cities: CityRow[];
  creators: FeedCreator[];
  lead?: CanvasLead;
  /** page = /map 전 구간. overlay = 지역·종류·채널 데스크톱만. */
  surface?: "page" | "overlay";
}) {
  const { messages: m, t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const sp = useSearchParams();
  /* /map 은 장소 전체를 HTML 에 안 싣는다. 앞 몇 줄은 SSR 로 남겨 LCP
     썸네일이 문서에 있게 하고, 나머지는 마운트 뒤 JSON 으로 받는다.

     ⚠️ 예전엔 이걸 requestIdleCallback(timeout 1800) 뒤로 미뤘다. Lighthouse
     점수는 좋아졌는데 실제로는 진입 후 1~2초 동안 지도도 목록도 없는 흰
     화면이 떴다. 지금은 마운트 즉시 받는다 — 단 priority:"low" 로 내려
     preload 한 LCP 썸네일이 대역폭을 먼저 가져간다.
     지도를 뒤로 미루는 일은 MapView 한 곳에서만 한다(거기 rAF+타이머). */
  const [fetchedPlaces, setFetchedPlaces] = useState<MapCanvasPlace[] | null>(
    surface === "page" ? null : places,
  );
  const livePlaces = fetchedPlaces ?? places;
  const placesReady = surface !== "page" || fetchedPlaces !== null;
  useEffect(() => {
    if (surface !== "page") return;
    let alive = true;
    fetch("/api/map/index", { priority: "low" } as RequestInit)
      .then((res) => (res.ok ? res.json() : { places: [] }))
      .then((data: { places?: MapCanvasPlace[] }) => {
        if (alive) setFetchedPlaces(data.places ?? []);
      })
      .catch(() => {
        if (alive) setFetchedPlaces([]);
      });
    return () => {
      alive = false;
    };
  }, [surface]);

  const city = sp.get("city");
  const regionRaw = sp.get("region");
  const region = isHomeRegionId(regionRaw) ? regionRaw : null;
  const typeRaw = sp.get("type");
  const type =
    typeRaw && (FILTERABLE_TYPES as string[]).includes(typeRaw) ? (typeRaw as PlaceType) : null;
  const q = sp.get("q") ?? "";
  /* 저장 필터 — 지도를 하나로 두기 위해 /saved 대신 여기서 푼다(SavedMapChips 주석 참조) */
  const savedOnly = sp.get("saved") === "1";
  const listId = sp.get("list");
  /* 전체화면 상세 — URL 이 진실. push 로 열어 뒤로가기·스와이프가 맵으로 돌아온다 */
  const placeParam = sp.get("place");

  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetPct, setSheetPct] = useState(SHEET_MID);
  const sheetPctRef = useRef(sheetPct);
  const dragRef = useRef<{ startY: number; startPct: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const [collapseToken, setCollapseToken] = useState(0);
  /* 드로어 스냅 — full 이면 탭바를 물리고(is-place-full) 지도 컨트롤도 덮인다 */
  const [placeSnap, setPlaceSnap] = useState<PlaceDrawerSnap>("mid");
  /* 상세 id 는 로컬이 진실. router.push(?place=) 는 /map loading.tsx 가
     페이지를 2~3초 스켈레톤으로 갈아엎어 아무 반응이 없는 것처럼 보인다.
     URL 은 history.pushState 로만 맞춰 뒤로가기는 살린다. */
  const [localPlace, setLocalPlace] = useState<string | null>(placeParam);
  const [placeDetail, setPlaceDetail] = useState<MapPlaceDetail | null>(null);
  /* 어느 장소의 상세를 **받아봤는지**. null 하나로는 "아직 로딩" 과 "없더라(404)"
     를 구분 못 해 뼈가 영영 안 걷힌다. */
  const [detailSettledFor, setDetailSettledFor] = useState<string | null>(null);
  const [detailFor, setDetailFor] = useState<string | null>(localPlace);
  if (detailFor !== localPlace) {
    setDetailFor(localPlace);
    setPlaceDetail(null);
    setDetailSettledFor(null);
  }
  const detailLoading = Boolean(localPlace) && detailSettledFor !== localPlace;
  /* 드로어가 켠 채널은 sticky. popstate 는 place/스냅만 되돌리고,
     채널은 칩을 지울 때까지 로컬이 진실이다. router.replace 는 loading.tsx 를 연다. */
  const [localChannel, setLocalChannel] = useState<string | null>(sp.get("channel"));
  const channel = localChannel;
  const placePushedRef = useRef(false);
  const localPlaceRef = useRef(localPlace);
  const localChannelRef = useRef(localChannel);
  /* 렌더 중이 아니라 이펙트에서 넣는다(react-hooks/refs) — 읽는 곳은
     popstate·드로어 콜백이라 커밋 뒤다. PlaceSheet onCloseRef 와 같은 계약. */
  useEffect(() => {
    if (!localPlace) return;
    const id = localPlace;
    let alive = true;
    const settle = (row: MapPlaceDetail | null) => {
      if (!alive) return;
      setPlaceDetail(row);
      setDetailSettledFor(id);
    };
    /* `?l=` — 라우트 응답이 CDN 에 s-maxage 로 앉는데, proxy 헤더는 캐시 키에
       안 들어간다. 로케일을 URL 로 갈라야 KO 요약이 EN 에 안 나간다. */
    fetch(`/api/map/place/${id}?l=${locale}`, { priority: "high" } as RequestInit)
      .then((res) => (res.ok ? res.json() : null))
      .then((row: MapPlaceDetail | null) => settle(row))
      .catch(() => settle(null));
    return () => {
      alive = false;
    };
  }, [localPlace, locale]);

  useEffect(() => {
    localPlaceRef.current = localPlace;
    localChannelRef.current = localChannel;
  });

  /* 시트 높이는 CSS 변수로만 그린다. 드래그 중 setState 하면 HomeCanvas 전체가
     프레임마다 다시 그려져(지도·썸네일 48장) 모바일 크롬이 멈춘다.
     커밋된 스냅만 state 에 남기고, 드래그 중 값은 DOM 에 직접 쓴다. */
  const writeSheetPct = useCallback((pct: number) => {
    sheetPctRef.current = pct;
    if (surface === "page") {
      rootRef.current?.style.setProperty("--map-sheet-h", String(pct));
    }
  }, [surface]);
  const commitSheetPct = useCallback((pct: number) => {
    writeSheetPct(pct);
    setSheetPct(pct);
  }, [writeSheetPct]);
  useLayoutEffect(() => {
    if (!dragRef.current) sheetPctRef.current = sheetPct;
    if (surface !== "page") return;
    rootRef.current?.style.setProperty("--map-sheet-h", String(sheetPctRef.current));
  });
  /* 데스크톱 여부는 리스너로 한 번만 갱신한다 — 드래그·스크롤 핸들러가 초당
     수십 번 matchMedia 객체를 새로 만들며 GC 를 조르지 않게. */
  const desktopRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      desktopRef.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const { isSaved, listsOf, ready: savedReady, lists: savedLists } = useSaved();
  /** 첫 진입의 시작점 — 현재 위치. 못 받으면 null 이고 평소대로 전체 핀에 맞춘다. */
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);

  const saved = useMemo(() => ({ isSaved, listsOf }), [isSaved, listsOf]);
  const axes = useMemo<MapFilterAxes>(
    () => ({ city, region, channel, type, q, savedOnly, listId }),
    [city, region, channel, type, q, savedOnly, listId],
  );

  const selectedCity = cities.find((c) => c.slug === city) ?? null;

  const replace = useCallback(
    (next: {
      city?: string | null;
      channel?: string | null;
      type?: string | null;
      q?: string;
      region?: string | null;
      saved?: boolean;
      list?: string | null;
    }) => {
      const params = new URLSearchParams();
      const c = "city" in next ? next.city : city;
      const ch = "channel" in next ? next.channel : channel;
      const tp = "type" in next ? next.type : type;
      const query = "q" in next ? next.q : q;
      const rg = "region" in next ? next.region : region;
      const sv = "saved" in next ? next.saved : savedOnly;
      const ls = "list" in next ? next.list : listId;
      if (c) params.set("city", c);
      else if (rg) params.set("region", rg);
      if (ch) params.set("channel", ch);
      if (tp) params.set("type", tp);
      if (query?.trim()) params.set("q", query.trim());
      /* 그룹이 있으면 saved 는 자명하므로 URL 에 둘 다 싣지 않는다 */
      if (ls) params.set("list", ls);
      else if (sv) params.set("saved", "1");
      setLocalChannel(ch ?? null);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [city, channel, type, q, region, savedOnly, listId, pathname, router],
  );

  const filtered = useMemo(
    () => livePlaces.filter((p) => placeMatchesMapFilter(p, axes, saved)),
    [livePlaces, axes, saved],
  );

  const inboundKey = `${city ?? ""}|${region ?? ""}|${channel ?? ""}|${type ?? ""}|${q}|${savedOnly ? "1" : "0"}|${listId ?? ""}`;

  /* 목록은 48개씩 끊어 그린다 — 필터 없는 /map 은 장소 전부가 목록인데,
     1000행짜리 <ul> 은 첫 커밋에서 DOM 만으로 모바일을 누른다. 핀·지도는
     여전히 전체를 받는다(filtered) — 잘리는 건 시트의 행 뿐이다. */
  const [listCap, setListCap] = useState(LIST_CHUNK);
  const [prevListKey, setPrevListKey] = useState(inboundKey);
  if (prevListKey !== inboundKey) {
    /* 필터가 바뀌면 캡도 처음부터 — 렌더 중 조정(react-hooks/set-state-in-effect) */
    setPrevListKey(inboundKey);
    setListCap(LIST_CHUNK);
  }
  /* 지도 핀으로 고른 행이 캡 밖이면 그 행까지 연다 — 목록 스크롤 동기화가 깨지지 않게 */
  const activeIdx = activeId ? filtered.findIndex((p) => p.id === activeId) : -1;
  if (activeIdx >= listCap) {
    setListCap(Math.ceil((activeIdx + 1) / LIST_CHUNK) * LIST_CHUNK);
  }
  const listRows = filtered.length > listCap ? filtered.slice(0, listCap) : filtered;
  const inboundSeen = useRef<string | null>(null);

  /**
   * 첫 진입은 **내 자리**에서 시작한다.
   *
   * 전체 핀에 맞추면 일본·한국·대만이 한 화면에 들어오느라 줌이 세계 수준까지 빠져,
   * 지도가 "어디도 아닌 곳"이 된다. 그래서 필터도 상세도 없이 그냥 들어온 경우에만
   * 현재 위치를 묻고, 오면 그 자리로 한 번 옮긴다.
   *
   * 거부·미지원·시간초과는 전부 조용히 지나간다 — 위치는 있으면 좋은 것이지
   * 이 화면이 서기 위한 조건이 아니다. 링크로 들어온 필터/상세는 그 화면이 답이므로
   * 묻지 않는다(권한 팝업이 남의 링크를 열자마자 뜨는 것도 무례하다).
   */
  useEffect(() => {
    if (surface !== "page") return;
    if (city || region || channel || type || q.trim() || savedOnly || listId || placeParam) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let alive = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (alive) setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
    return () => {
      alive = false;
    };
    /* 첫 진입 한 번 — 이후 필터가 바뀐다고 다시 물으면 팝업이 반복된다 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pins = useMemo(
    () =>
      filtered.map((p) => ({
        id: p.id,
        name: displayPlaceName(p, locale),
        lat: p.lat,
        lng: p.lng,
      })),
    [filtered, locale],
  );

  const detailPlace =
    (localPlace ? (filtered.find((p) => p.id === localPlace) ?? livePlaces.find((p) => p.id === localPlace)) : null) ??
    null;
  const detailOpen = Boolean(detailPlace);

  useEffect(() => {
    if ((savedOnly || listId) && !savedReady) return;
    if (detailOpen) return;
    if (!placesReady) return;
    if (inboundSeen.current === inboundKey) return;
    inboundSeen.current = inboundKey;
    if (q.trim()) return;
    if (filtered.length > 0) return;
    const next = reconcileMapFilter(livePlaces, axes, [], saved);
    if (
      next.city === city &&
      next.region === region &&
      next.channel === channel &&
      next.type === type
    ) {
      return;
    }
    /* 빈 교집합을 URL 과 로컬 채널에 같이 맞춘다. replace() 가 setLocalChannel
       을 쓰므로 이펙트 안 setState 경고가 난다 — 의도된 한 번의 보정이다. */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- inbound empty-filter reconcile
    replace({
      city: next.city,
      region: next.region,
      channel: next.channel,
      type: next.type,
    });
  }, [
    inboundKey,
    filtered.length,
    livePlaces,
    placesReady,
    axes,
    saved,
    city,
    region,
    channel,
    type,
    q,
    replace,
    savedOnly,
    listId,
    savedReady,
    detailOpen,
  ]);

  /* 탭바는 html 클래스 한 번으로 물린다 — :has() 는 문서 전체 스타일 재계산. */
  useEffect(() => {
    if (surface !== "page") return;
    document.documentElement.classList.toggle("is-place-open", detailOpen);
    document.documentElement.classList.toggle(
      "is-place-full",
      detailOpen && placeSnap === "full",
    );
    return () => {
      document.documentElement.classList.remove("is-place-open");
      document.documentElement.classList.remove("is-place-full");
    };
  }, [surface, detailOpen, placeSnap]);

  const [prevLocalPlace, setPrevLocalPlace] = useState(localPlace);
  if (prevLocalPlace !== localPlace) {
    setPrevLocalPlace(localPlace);
    if (localPlace) setActiveId(localPlace);
    setPlaceSnap("mid");
  }

  useEffect(() => {
    const onPop = () => {
      /* 지도를 떠나는 back 은 덮지 않는다. 언마운트보다 popstate 가 먼저라
         도착지 쿼리에 channel 을 붙이고 URL 을 /map 으로 되돌리는 사고가 난다. */
      if (window.location.pathname !== pathname) return;
      const params = new URLSearchParams(window.location.search);
      const p = params.get("place");
      setLocalPlace(p);
      localPlaceRef.current = p;
      if (!p) placePushedRef.current = false;
      const want = localChannelRef.current;
      if (want && params.get("channel") !== want) {
        params.set("channel", want);
        const qs = params.toString();
        const url = qs ? `${pathname}?${qs}` : pathname;
        const st = window.history.state;
        window.history.replaceState(
          { ...(st && typeof st === "object" ? st : {}) },
          "",
          url,
        );
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [pathname]);

  const buildUrl = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(window.location.search);
      mutate(params);
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname],
  );

  const applyChannelFromDrawer = useCallback(
    (slug: string) => {
      if (slug === localChannelRef.current) return;
      setLocalChannel(slug);
      localChannelRef.current = slug;
      const url = buildUrl((p) => {
        p.set("channel", slug);
        const place = localPlaceRef.current;
        if (place) p.set("place", place);
      });
      const st = window.history.state;
      window.history.replaceState(
        { ...(st && typeof st === "object" ? st : {}) },
        "",
        url,
      );
    },
    [buildUrl],
  );

  const closeDetail = useCallback(() => {
    const url = buildUrl((p) => {
      p.delete("place");
    });
    if (placePushedRef.current) {
      placePushedRef.current = false;
      window.history.back();
      return;
    }
    setLocalPlace(null);
    const st = window.history.state;
    window.history.replaceState(
      { ...(st && typeof st === "object" ? st : {}) },
      "",
      url,
    );
  }, [buildUrl]);

  /**
   * 핀·목록 공통 — 드로어를 즉시 mid 로 연다. Next 라우터는 타지 않는다.
   */
  const openDetail = useCallback(
    (id: string, opts?: { toggleClose?: boolean }) => {
      setActiveId(id);
      if (localPlace === id) {
        if (opts?.toggleClose) closeDetail();
        return;
      }
      const url = buildUrl((p) => {
        p.set("place", id);
      });
      const st = {
        ...(typeof window.history.state === "object" && window.history.state
          ? window.history.state
          : {}),
        __placeSheet: true,
      };
      if (localPlace) {
        window.history.replaceState(st, "", url);
      } else {
        window.history.pushState(st, "", url);
        placePushedRef.current = true;
      }
      setLocalPlace(id);
      setPlaceSnap("mid");
    },
    [localPlace, closeDetail, buildUrl],
  );

  const onPinClick = useCallback(
    (id: string) => {
      openDetail(id, { toggleClose: true });
    },
    [openDetail],
  );

  /** 목록 행 → 지도 포커스 + 장소 드로어 mid */
  const onRowClick = useCallback(
    (id: string) => {
      openDetail(id);
    },
    [openDetail],
  );

  const onMapBackgroundClick = useCallback(() => {
    if (detailOpen) {
      setCollapseToken((n) => n + 1);
      return;
    }
    if (sheetPctRef.current > SHEET_MID + 2) commitSheetPct(SHEET_MID);
  }, [detailOpen, commitSheetPct]);

  const snapListSheet = useCallback((pct: number) => {
    let best: number = SHEET_SNAPS[0];
    let bestDist = Math.abs(pct - best);
    for (const s of SHEET_SNAPS) {
      const d = Math.abs(pct - s);
      if (d < bestDist) {
        best = s;
        bestDist = d;
      }
    }
    commitSheetPct(best);
  }, [commitSheetPct]);

  /* 바텀시트 핸들 드래그 — 스냅 포인트로 붙인다.
     움직이는 동안은 DOM 변수만 고친다. transition 은 is-sheet-dragging 으로 끈다. */
  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    if (desktopRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startPct: sheetPctRef.current };
    rootRef.current?.classList.add("is-sheet-dragging");
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    const root = rootRef.current;
    if (!drag || !root) return;
    const h = root.getBoundingClientRect().height;
    if (h <= 0) return;
    const dy = drag.startY - e.clientY; /* 위로 끌면 시트 커짐 */
    const next = Math.min(SHEET_FULL, Math.max(SHEET_PEEK, drag.startPct + (dy / h) * 100));
    writeSheetPct(next);
  }, [writeSheetPct]);

  const onHandlePointerUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    rootRef.current?.classList.remove("is-sheet-dragging");
    snapListSheet(sheetPctRef.current);
  }, [snapListSheet]);

  const sheetWasFullRef = useRef(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || surface !== "page") return;
    const full = sheetPct >= SHEET_FULL - 2;
    root.classList.toggle("is-sheet-full", full);
    root.classList.toggle("is-sheet-peek", sheetPct <= SHEET_PEEK + 2);
    if (!full) {
      sheetWasFullRef.current = false;
      root.classList.remove("is-sheet-scrollable");
      if (listScrollRef.current) listScrollRef.current.scrollTop = 0;
      return;
    }
    if (detailOpen) return;
    const alreadyFull = sheetWasFullRef.current;
    sheetWasFullRef.current = true;
    if (alreadyFull) {
      root.classList.add("is-sheet-scrollable");
      return;
    }
    const panel = root.querySelector(".canvas-panel");
    if (!(panel instanceof HTMLElement)) {
      root.classList.add("is-sheet-scrollable");
      return;
    }
    let done = false;
    const enable = () => {
      if (done) return;
      done = true;
      root.classList.add("is-sheet-scrollable");
    };
    const onEnd = (e: Event) => {
      if (e instanceof TransitionEvent && e.propertyName !== "transform") return;
      enable();
    };
    panel.addEventListener("transitionend", onEnd);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fallback = window.setTimeout(enable, reduce ? 0 : 320);
    return () => {
      panel.removeEventListener("transitionend", onEnd);
      window.clearTimeout(fallback);
    };
  }, [sheetPct, surface, detailOpen]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || surface !== "page") return;
    root.classList.toggle("is-place-raised", detailOpen && placeSnap !== "peek");
  }, [detailOpen, placeSnap, surface]);

  const onListScroll = useCallback(() => {
    if (desktopRef.current) return;
    const el = listScrollRef.current;
    if (!el) return;
    if (sheetPctRef.current < SHEET_FULL - 2) el.scrollTop = 0;
  }, []);

  const listTouchY = useRef<number | null>(null);
  const onListTouchStart = useCallback((e: React.TouchEvent) => {
    listTouchY.current = e.touches[0]?.clientY ?? null;
  }, []);
  const onListTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (desktopRef.current) return;
      const el = listScrollRef.current;
      const y0 = listTouchY.current;
      const y = e.touches[0]?.clientY;
      if (!el || y0 == null || y == null) return;
      const dy = y - y0;
      if (sheetPctRef.current < SHEET_FULL - 2) {
        if (dy < -40) {
          commitSheetPct(SHEET_FULL);
          listTouchY.current = null;
        } else if (dy > 48 && sheetPctRef.current > SHEET_PEEK + 2) {
          commitSheetPct(
            sheetPctRef.current > SHEET_MID + 2 ? SHEET_MID : SHEET_PEEK,
          );
          listTouchY.current = null;
        }
        return;
      }
      /* 전면 맨 위에서 아래로 당김 → mid */
      if (el.scrollTop <= 0 && dy > 48) {
        commitSheetPct(SHEET_MID);
        listTouchY.current = null;
      }
    },
    [commitSheetPct],
  );

  const detailIndex = detailPlace
    ? Math.max(
        0,
        filtered.findIndex((p) => p.id === detailPlace.id),
      )
    : -1;
  const hasFilter = Boolean(city || region || channel || type || q.trim() || savedOnly || listId);

  /**
   * 저장/그룹으로 들어온 화면 — 목록 위에 "무엇을 보고 있는지" 를 세운다.
   *
   * `/saved` 의 그룹 행은 여기로 온다(지도는 하나뿐 — SavedMapChips 주석). 그러면
   * 지도만 덩그러니 뜨고 이름이 없어, 목록 이름과 개수를 그 자리에 세운다.
   * 이름은 칩에도 있지만 칩은 "고르는 것" 이고 머리말은 "지금 이것" 이다.
   *
   * 뒤로가기는 두지 않는다 — 저장 탭이 탭바·레일에 늘 서 있어 한 번이면 돌아간다.
   */
  const savedLead = Boolean(savedOnly || listId);
  const savedTitle = listId
    ? (savedLists.find((l) => l.id === listId)?.name ?? m.saved.title)
    : m.saved.title;

  const EMPTY_SUMMARY = {
    bullets: [] as string[],
    summary: null,
    priceHint: null,
    isMachine: false,
    original: null,
  };
  const sourcesFor = () => {
    const all = placeDetail?.sources ?? [];
    return channel ? all.filter((s) => s.creatorSlug === channel) : all;
  };

  /**
   * 검색창 한 벌 — 자리만 둘이다.
   *
   *   모바일: 지도 위 최상단에 떠 있는 판(`floating`) — 헤더가 없으니 이게 첫 줄이다.
   *   데스크톱: 목록 시트 안. 시트가 이미 지도 위에 뜬 카드라 또 띄울 이유가 없다.
   *
   * 같은 마크업을 두 번 쓰는 대신 함수 하나로 둔다 — 한쪽만 고치는 일을 막는다.
   */
  const searchField = (floating = false) => (
    <div className="relative flex h-11 w-full items-center lg:h-10">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("tripin:open-search"))}
        className={`relative flex h-full min-w-0 flex-1 items-center rounded-xl pr-3 pl-9 text-left ${
          floating ? "bg-(--sheet)" : "bg-(--hover)"
        }`}
        style={floating ? { boxShadow: "0 4px 16px rgb(0 0 0 / 0.14)" } : undefined}
      >
        <MagnifyingGlass
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--dim)"
        />
        <span className={`truncate text-base ${q ? "text-(--paper)" : "text-(--dim)"}`}>
          {q || m.home.goWhere}
        </span>
      </button>
      {q ? (
        <button
          type="button"
          aria-label={m.search.close}
          onClick={() => {
            setActiveId(null);
            replace({ q: "" });
          }}
          className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-(--dim) hover:bg-(--hover)"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );

  const title =
    lead === "region" ? m.nav.region : lead === "channel" ? m.nav.channel : lead === "type" ? m.nav.type : m.home.srHeading;

  const regionLabel = city
    ? displayCityName(selectedCity ?? { name: city }, locale)
    : region
      ? m.home.homeRegions[region]
      : m.home.regionFilter;

  const typeCounts = useMemo(() => {
    const facet = { ...axes, type: null };
    const map = new Map<PlaceType, number>();
    for (const p of livePlaces) {
      if (!placeMatchesMapFilter(p, facet, saved)) continue;
      map.set(p.placeType, (map.get(p.placeType) ?? 0) + 1);
    }
    return map;
  }, [livePlaces, axes, saved]);

  const channelCounts = useMemo(() => {
    const facet = { ...axes, channel: null };
    const map = new Map<string, number>();
    for (const p of livePlaces) {
      if (!placeMatchesMapFilter(p, facet, saved)) continue;
      const seen = new Set<string>();
      for (const s of p.sources) {
        if (seen.has(s.creatorSlug)) continue;
        seen.add(s.creatorSlug);
        map.set(s.creatorSlug, (map.get(s.creatorSlug) ?? 0) + 1);
      }
    }
    return map;
  }, [livePlaces, axes, saved]);

  const channelOptions = creators;

  const modalCities = useMemo(() => {
    const pool = livePlaces.filter((p) =>
      placeMatchesMapFilter(p, { ...axes, city: null, region: null }, saved),
    );
    const byCity = new Map<
      string,
      { slug: string; name: string; nameEn: string | null; countryCode: string; placeCount: number }
    >();
    for (const p of pool) {
      const row = byCity.get(p.citySlug);
      if (row) row.placeCount += 1;
      else {
        const meta = cities.find((c) => c.slug === p.citySlug);
        byCity.set(p.citySlug, {
          slug: p.citySlug,
          name: p.cityName,
          nameEn: p.cityNameEn,
          countryCode: p.countryCode || meta?.countryCode || "",
          placeCount: 1,
        });
      }
    }
    const groups = new Map<HomeRegionId, typeof byCity extends Map<string, infer V> ? V[] : never>();
    for (const row of byCity.values()) {
      const id = homeRegionForCountry(row.countryCode);
      const list = groups.get(id) ?? [];
      list.push(row);
      groups.set(id, list);
    }
    return HOME_REGION_ORDER.flatMap((id) => {
      const items = groups.get(id);
      if (!items || items.length === 0) return [];
      items.sort((a, b) => b.placeCount - a.placeCount);
      return [{ id, items }];
    });
  }, [livePlaces, cities, axes, saved]);

  /**
   * 필터 줄 — 검색창과 같은 이유로 자리가 둘이다(모바일은 지도 위, 데스크톱은 시트 안).
   *
   * 두 벌을 그리게 되지만 한 번에 보이는 건 하나다. 하나만 두고 CSS 로 옮길 수는
   * 없다 — 지도와 시트는 서로 다른 상자이고, 시트는 스크롤 컨테이너라 밖으로 못 나온다.
   */
  const filters = (variant: "sheet" | "floating") => (
    <CanvasFilters
      variant={variant}
      region={region}
      city={city}
      type={type}
      channel={channel}
      regionLabel={regionLabel}
      typeLabel={type ? m.placeTypes[type] : m.nav.type}
      channelLabel={channelOptions.find((c) => c.slug === channel)?.displayName ?? m.nav.channel}
      groups={modalCities}
      creators={channelOptions}
      channelCounts={channelCounts}
      typeCounts={typeCounts}
      trailing={
        <SavedMapChips
          savedOnly={savedOnly}
          listId={listId}
          onChange={(next) => {
            setActiveId(null);
            const proposed = { ...axes, savedOnly: next.saved, listId: next.list };
            const reconciled = reconcileMapFilter(livePlaces, proposed, [], saved);
            replace({
              saved: next.saved,
              list: next.list,
              region: reconciled.region,
              city: reconciled.city,
              type: reconciled.type,
              channel: reconciled.channel,
            });
          }}
        />
      }
      onApply={(next) => {
        setActiveId(null);
        const proposed = {
          city: next.city,
          region: next.region,
          channel: next.channel,
          type: next.type,
          q,
          savedOnly,
          listId,
        };
        const keep = keepAxesForApply(axes, proposed);
        const reconciled = reconcileMapFilter(livePlaces, proposed, keep, saved);
        replace({
          region: reconciled.region,
          city: reconciled.city,
          type: reconciled.type,
          channel: reconciled.channel,
        });
      }}
    />
  );


  return (
    <div
      ref={rootRef}
      className={
        surface === "page"
          ? `canvas-page canvas-root${detailOpen ? " is-place-open" : ""}${
              detailOpen && placeSnap === "full" ? " is-place-full" : ""
            }`
          : "canvas-page hidden lg:block"
      }
    >
      <div className="canvas-map">
        <MapView
          className="absolute inset-0 h-full w-full"
          flush
          pins={pins}
          activeId={activeId}
          onPinClick={onPinClick}
          onMapClick={onMapBackgroundClick}
          cluster
          nameWhenClose
          focusAt={here}
          /* 지도 위에 뜬 것들만큼 비운다 — 안 그러면 핀이 검색 줄과 바텀시트 밑에
             깔려서 "위아래가 잘린" 것처럼 보인다. 시트 높이는 끌 때마다 달라지므로
             값이 아니라 함수로 넘긴다(맞추는 순간에 잰다). */
          fitPadding={() => {
            const desktop =
              typeof window !== "undefined" &&
              window.matchMedia("(min-width: 1024px)").matches;
            if (desktop) {
              /* 왼쪽 레일(88) + 시트(400) + 여백 */
              return { top: 48, right: 48, bottom: 48, left: 520 };
            }
            const h = rootRef.current?.getBoundingClientRect().height ?? 0;
            const drawer = rootRef.current?.querySelector(".place-drawer");
            const drawerH =
              drawer instanceof HTMLElement ? drawer.getBoundingClientRect().height : 0;
            return {
              top: 128,
              right: 24,
              bottom: Math.round((detailOpen && drawerH > 0 ? drawerH : (h * sheetPctRef.current) / 100) + 16),
              left: 24,
            };
          }}
        />
        {/* 상세: 모바일 place-drawer / 데스크톱 지도 안 카드 — 모두 map relative 기준 */}
        {detailOpen && detailPlace ? (
          <PlaceSheet
            index={detailIndex + 1}
            place={{
              id: detailPlace.id,
              name: displayPlaceName(detailPlace, locale),
              nameLocal: detailPlace.nameLocal,
              typeLabel: m.placeTypes[detailPlace.placeType],
              address: placeDetail?.address ?? null,
              summary: placeDetail?.summary ?? EMPTY_SUMMARY,
              mapUrl: placeDetail?.mapUrl ?? null,
              sources: sourcesFor(),
            }}
            loading={detailLoading}
            heroHint={
              detailPlace.youtubeId && detailPlace.sources[0]
                ? {
                    creatorSlug: detailPlace.sources[0].creatorSlug,
                    youtubeId: detailPlace.youtubeId,
                  }
                : null
            }
            onClose={closeDetail}
            collapseToken={collapseToken}
            onSnapChange={setPlaceSnap}
            onSelectChannel={applyChannelFromDrawer}
          />
        ) : null}
      </div>

      {/* 지도 위 첫 줄 — /map 모바일에만. 헤더를 걷어낸 자리를 검색창과 필터가 받는다.
          아래 시트에는 목록만 남는다 — 시트를 조금만 올려도 필터가 가려지던 자리였다.
          상세가 열리면 검색·필터 대신 ←/✕ 만 남는다(네이버 장소 화면 문법).
          지도 상자 밖에 세운다 — 안에 두면 `.canvas-map`(z:0)이 쌓임 맥락을 만들어
          필터 드롭다운이 아무리 z 를 올려도 목록 시트(z:20) 밑에 깔린다. */}
      {surface === "page" && !detailOpen ? (
        <div className="canvas-topbar lg:hidden">
          {searchField(true)}
          {filters("floating")}
        </div>
      ) : null}
      {surface === "page" && detailOpen && placeSnap === "peek" ? (
        <div className="canvas-topbar lg:hidden">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={closeDetail}
              aria-label={m.map.backToMap}
              className="grid size-10 cursor-pointer place-items-center rounded-full bg-(--sheet) text-(--paper)"
              style={{ boxShadow: "0 4px 16px rgb(0 0 0 / 0.2)" }}
            >
              <Icon.back className="size-5" />
            </button>
            <button
              type="button"
              onClick={closeDetail}
              aria-label={m.map.closeDetail}
              className="grid size-10 cursor-pointer place-items-center rounded-full bg-(--sheet) text-(--paper)"
              style={{ boxShadow: "0 4px 16px rgb(0 0 0 / 0.2)" }}
            >
              <Icon.close className="size-[18px]" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="canvas-sheet-clip">
      <section className="canvas-panel" aria-label={title}>
        <div
          className="canvas-panel-handle"
          role="separator"
          aria-orientation="horizontal"
          aria-valuemin={SHEET_PEEK}
          aria-valuemax={SHEET_FULL}
          aria-valuenow={Math.round(sheetPct)}
          aria-label={m.map.sheetHandle}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        />
        <div
          ref={listScrollRef}
          className="canvas-panel-scroll"
          onScroll={onListScroll}
          onTouchStart={onListTouchStart}
          onTouchMove={onListTouchMove}
          onWheel={(e) => {
            if (desktopRef.current) return;
            if (sheetPctRef.current >= SHEET_FULL - 2) return;
            e.preventDefault();
            if (e.deltaY > 0) commitSheetPct(SHEET_FULL);
            else if (e.deltaY < 0 && sheetPctRef.current > SHEET_PEEK + 2) {
              commitSheetPct(sheetPctRef.current > SHEET_MID + 2 ? SHEET_MID : SHEET_PEEK);
            }
          }}
        >
          <h1 className="sr-only">{title}</h1>
          {lead !== "home" ? (
            <div className="px-4 pt-2 pb-1">
              <p className="text-xl font-bold tracking-[-0.03em]">{title}</p>
            </div>
          ) : null}

          {savedLead ? (
            <div className="flex flex-col gap-0.5 px-4 pt-2 pb-1">
              <p className="truncate text-xl font-bold tracking-[-0.03em]">{savedTitle}</p>
              <p className="index tnum" style={{ color: "var(--dim)" }}>
                {t(m.saved.listCount, { n: filtered.length })}
              </p>
            </div>
          ) : null}

          {/* 모바일에서는 이 검색창이 지도 위 최상단으로 올라간다(위 canvas-topbar).
              시트 안에도 한 벌 두면 같은 문이 한 화면에 둘이라, 여기서는 lg 부터 선다. */}
          <div className={`hidden px-4 pb-3 lg:block ${lead === "home" ? "pt-1" : "pt-2"}`}>
            {searchField()}
          </div>

          <div className="hidden lg:block">{filters("sheet")}</div>

          <div className="flex items-center justify-between gap-3 px-4 pb-2">
            {/* 머리말이 이미 개수를 들고 있으면 같은 숫자를 두 번 쓰지 않는다 */}
            {savedLead ? (
              <span aria-hidden />
            ) : placesReady || livePlaces.length > 0 ? (
              <p className="index tnum" style={{ color: "var(--dim)" }}>
                {t(m.cityDetail.placesAll, { n: filtered.length })}
              </p>
            ) : (
              <span aria-hidden />
            )}
            {hasFilter ? (
              <button
                type="button"
                className="index text-(--wax) underline-offset-4 hover:underline"
                onClick={() => {
                  setActiveId(null);
                  replace({
                    city: null,
                    channel: null,
                    type: null,
                    q: "",
                    region: null,
                    saved: false,
                    list: null,
                  });
                }}
              >
                {m.cityDetail.clearFilters}
              </button>
            ) : null}
          </div>

          {!placesReady && livePlaces.length === 0 ? (
            /* 인덱스가 오기 전 — 필터를 달고 들어오면 SSR 씨앗이 비어 있다.
               여기서 null 을 두면 목록 자리가 통째로 흰 화면이 된다. */
            <ul className="px-4 pb-6" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className={i > 0 ? "mt-5" : ""}>
                  <span className="inline-block w-full overflow-hidden text-left">
                    <BoneFrame className="block w-full" />
                    <span className="mt-2.5 block text-[15px] font-semibold tracking-[-0.01em]">
                      <Bone w="60%" />
                    </span>
                    <span className="mt-0.5 block text-[13px]">
                      <Bone w="45%" />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : filtered.length === 0 ? (
            <EmptyState message={m.home.empty}>
              {/* 막다른 화면 금지(EmptyState.tsx 주석) — 위 헤더의 지우기 버튼은
                  빈 상태에서 눈에 안 들어온다. 같은 동작을 본문에 다시 세운다. */}
              {hasFilter ? (
                <button
                  type="button"
                  className="index cursor-pointer text-(--wax) underline-offset-4 hover:underline"
                  onClick={() => {
                    setActiveId(null);
                    replace({
                      city: null,
                      channel: null,
                      type: null,
                      q: "",
                      region: null,
                      saved: false,
                      list: null,
                    });
                  }}
                >
                  {m.cityDetail.clearFilters}
                </button>
              ) : null}
            </EmptyState>
          ) : (
            <ul className="px-4 pb-6">
              {listRows.map((p, i) => {
                const on = p.id === activeId;
                return (
                  <li key={p.id} className={i > 0 ? "mt-5" : ""}>
                    <button
                      type="button"
                      onClick={() => onRowClick(p.id)}
                      aria-pressed={on}
                      className="w-full text-left"
                    >
                      <Frame className={`block w-full ${on ? "waxed" : ""}`}>
                        {p.youtubeId ? (
                          <Thumb
                            youtubeId={p.youtubeId}
                            alt={displayPlaceName(p, locale)}
                            eager={i === 0}
                          />
                        ) : null}
                      </Frame>
                      <span className="mt-2.5 block truncate text-[15px] font-semibold tracking-[-0.01em]">
                        {displayPlaceName(p, locale)}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-(--dim)">
                        {m.placeTypes[p.placeType]}
                        {" · "}
                        {displayCityName({ name: p.cityName, nameEn: p.cityNameEn }, locale)}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length > listCap ? (
                <ListMore
                  key={listCap}
                  label={m.home.loadMore}
                  onMore={() => setListCap((c) => c + LIST_CHUNK)}
                />
              ) : null}
            </ul>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

/** 목록 꼬리 — 화면에 들어오면 다음 묶음을 연다. IO 가 없거나 못 미더운 환경을
 *  위해 같은 동작의 버튼을 겸한다. key={listCap} 로 묶음마다 새로 관찰한다. */
function ListMore({ label, onMore }: { label: string; onMore: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) onMore();
    });
    io.observe(el);
    return () => io.disconnect();
    /* onMore 는 setState 래퍼라 안정적이다 — 렌더마다 재관찰하지 않는다 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <li ref={ref} className="mt-5">
      <button
        type="button"
        onClick={onMore}
        className="index w-full cursor-pointer py-3 text-center text-(--dim)"
      >
        {label}
      </button>
    </li>
  );
}
