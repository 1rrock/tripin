"use client";

/**
 * 전역 지도 캔버스. `/map` 은 전 구간, 지역·종류·채널은 데스크톱만.
 * 클릭·검색은 이 지도를 좁힌다. 종류·지역·채널은 필터.
 * 핀은 번호가 아니라 점 → 가까이서 상호. 누르면 상세.
 *
 * 모바일 문법(네이버 지도형):
 *   · 지도 전면 + 목록 바텀시트
 *   · 목록/핀 선택 → 장소 드로어 mid(지도 위 절반) — Image #1
 *   · 드로어 스크롤 → full — Image #2. 핸들·지도 클릭·뒤로 → mid
 *   · mid 에서 닫기/뒤로 → 맵+목록
 *   · 상세 URL `?place=` push — 엣지 스와이프·뒤로가기가 히스토리를 탄다
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import type { FeedCreator } from "@/shared/api/home";
import type { CityRow, HomeMapPlace } from "@/shared/api/cities";
import type { PlaceType } from "@/shared/api/database.types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import { Frame } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { Icon } from "@/shared/ui/icons";
import { MapView } from "@/shared/ui/MapView";
import { PlaceSheet, type PlaceDrawerSnap } from "@/shared/ui/PlaceSheet";
import { EmptyState } from "@/shared/ui/EmptyState";
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

export type CanvasLead = "home" | "region" | "channel" | "type";

/** 바텀시트 스냅 — 화면(캔버스) 높이 비율 % */
const SHEET_PEEK = 30;
const SHEET_MID = 52;
const SHEET_FULL = 88;
const SHEET_SNAPS = [SHEET_PEEK, SHEET_MID, SHEET_FULL] as const;

export function HomeCanvas(props: {
  places: HomeMapPlace[];
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
  places: HomeMapPlace[];
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

  const city = sp.get("city");
  const channel = sp.get("channel");
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
  sheetPctRef.current = sheetPct;
  const dragRef = useRef<{ startY: number; startPct: number } | null>(null);
  const pendingPlaceMark = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const [collapseToken, setCollapseToken] = useState(0);
  /* 드로어 스냅 — full 이면 탭바를 물리고(is-place-full) 지도 컨트롤도 덮인다 */
  const [placeSnap, setPlaceSnap] = useState<PlaceDrawerSnap>("mid");
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
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [city, channel, type, q, region, savedOnly, listId, pathname, router],
  );

  const filtered = useMemo(
    () => places.filter((p) => placeMatchesMapFilter(p, axes, saved)),
    [places, axes, saved],
  );

  const inboundKey = `${city ?? ""}|${region ?? ""}|${channel ?? ""}|${type ?? ""}|${q}|${savedOnly ? "1" : "0"}|${listId ?? ""}`;
  const inboundSeen = useRef<string | null>(null);
  useEffect(() => {
    if ((savedOnly || listId) && !savedReady) return;
    if (inboundSeen.current === inboundKey) return;
    inboundSeen.current = inboundKey;
    if (q.trim()) return;
    if (filtered.length > 0) return;
    const next = reconcileMapFilter(places, axes, [], saved);
    if (
      next.city === city &&
      next.region === region &&
      next.channel === channel &&
      next.type === type
    ) {
      return;
    }
    replace({
      city: next.city,
      region: next.region,
      channel: next.channel,
      type: next.type,
    });
  }, [
    inboundKey,
    filtered.length,
    places,
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
  ]);

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

  /** 필터 밖 장소 id 가 URL 에 있어도 상세는 연다(공유 링크) */
  const detailPlace =
    (placeParam ? (filtered.find((p) => p.id === placeParam) ?? places.find((p) => p.id === placeParam)) : null) ??
    null;
  const detailOpen = Boolean(detailPlace);

  useEffect(() => {
    if (placeParam) setActiveId(placeParam);
    /* 장소가 바뀌거나 닫히면 스냅은 mid 부터 — 탭바가 헛돌아 사라지지 않게 */
    setPlaceSnap("mid");
  }, [placeParam]);

  /* push 로 연 상세만 history.state 에 표시 — 닫을 때 back, 공유 유입은 replace */
  useEffect(() => {
    if (!placeParam || !pendingPlaceMark.current) return;
    pendingPlaceMark.current = false;
    const st = window.history.state;
    window.history.replaceState({ ...(st && typeof st === "object" ? st : {}), __placeSheet: true }, "");
  }, [placeParam]);

  const buildUrl = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(sp.toString());
      mutate(params);
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [sp, pathname],
  );

  const closeDetail = useCallback(() => {
    if (!placeParam) return;
    const st = window.history.state;
    if (st && typeof st === "object" && (st as { __placeSheet?: boolean }).__placeSheet) {
      router.back();
      return;
    }
    router.replace(
      buildUrl((p) => {
        p.delete("place");
      }),
      { scroll: false },
    );
  }, [placeParam, router, buildUrl]);

  /**
   * 핀·목록 공통 — 장소 드로어 mid 로 연다(`?place=` push).
   * 같은 장소 재선택: 핀이면 닫기, 목록이면 포커스 유지.
   */
  const openDetail = useCallback(
    (id: string, opts?: { toggleClose?: boolean }) => {
      setActiveId(id);
      if (placeParam === id) {
        if (opts?.toggleClose) closeDetail();
        return;
      }
      const url = buildUrl((p) => {
        p.set("place", id);
      });
      if (placeParam) {
        router.replace(url, { scroll: false });
      } else {
        pendingPlaceMark.current = true;
        router.push(url, { scroll: false });
      }
    },
    [placeParam, closeDetail, buildUrl, router],
  );

  const onPinClick = useCallback(
    (id: string) => {
      openDetail(id, { toggleClose: true });
    },
    [openDetail],
  );

  /** 목록 행 → 지도 포커스 + 장소 드로어 mid (네이버처럼) */
  const onRowClick = useCallback(
    (id: string) => {
      openDetail(id);
    },
    [openDetail],
  );

  const onMapBackgroundClick = useCallback(() => {
    if (!detailOpen) return;
    setCollapseToken((n) => n + 1);
  }, [detailOpen]);

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
    setSheetPct(best);
  }, []);

  /* 바텀시트 핸들 드래그 — 스냅 포인트로 붙인다 */
  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startPct: sheetPctRef.current };
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    const root = rootRef.current;
    if (!drag || !root) return;
    const h = root.getBoundingClientRect().height;
    if (h <= 0) return;
    const dy = drag.startY - e.clientY; /* 위로 끌면 시트 커짐 */
    const next = Math.min(SHEET_FULL, Math.max(SHEET_PEEK, drag.startPct + (dy / h) * 100));
    setSheetPct(next);
  }, []);

  const onHandlePointerUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    snapListSheet(sheetPctRef.current);
  }, [snapListSheet]);

  /**
   * 목록 스크롤 → 드로어 자동 확장(Image #1 → #2).
   * 맨 위에서 더 당기면 mid/peek 로 접힘.
   */
  const onListScroll = useCallback(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const el = listScrollRef.current;
    if (!el) return;
    const { scrollTop } = el;
    if (scrollTop > 24 && sheetPctRef.current < SHEET_FULL - 2) {
      setSheetPct(SHEET_FULL);
    }
  }, []);

  const listTouchY = useRef<number | null>(null);
  const onListTouchStart = useCallback((e: React.TouchEvent) => {
    listTouchY.current = e.touches[0]?.clientY ?? null;
  }, []);
  const onListTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (window.matchMedia("(min-width: 1024px)").matches) return;
      const el = listScrollRef.current;
      const y0 = listTouchY.current;
      const y = e.touches[0]?.clientY;
      if (!el || y0 == null || y == null) return;
      const dy = y - y0;
      /* 손가락 위로 → 시트 확장 */
      if (dy < -40 && sheetPctRef.current < SHEET_FULL - 2) {
        setSheetPct(SHEET_FULL);
        listTouchY.current = null;
        return;
      }
      /* 맨 위에서 아래로 당김 → mid */
      if (el.scrollTop <= 0 && dy > 48 && sheetPctRef.current > SHEET_MID + 2) {
        setSheetPct(SHEET_MID);
        listTouchY.current = null;
      }
    },
    [],
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

  const sourcesFor = (place: HomeMapPlace) =>
    channel ? place.sources.filter((s) => s.creatorSlug === channel) : place.sources;

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
    for (const p of places) {
      if (!placeMatchesMapFilter(p, facet, saved)) continue;
      map.set(p.placeType, (map.get(p.placeType) ?? 0) + 1);
    }
    return map;
  }, [places, axes, saved]);

  const channelCounts = useMemo(() => {
    const facet = { ...axes, channel: null };
    const map = new Map<string, number>();
    for (const p of places) {
      if (!placeMatchesMapFilter(p, facet, saved)) continue;
      const seen = new Set<string>();
      for (const s of p.sources) {
        if (seen.has(s.creatorSlug)) continue;
        seen.add(s.creatorSlug);
        map.set(s.creatorSlug, (map.get(s.creatorSlug) ?? 0) + 1);
      }
    }
    return map;
  }, [places, axes, saved]);

  const channelOptions = useMemo(() => {
    const seen = new Set(creators.map((c) => c.slug));
    const extra: FeedCreator[] = [];
    for (const p of places) {
      for (const s of p.sources) {
        if (seen.has(s.creatorSlug)) continue;
        if (!(channelCounts.get(s.creatorSlug) ?? 0)) continue;
        seen.add(s.creatorSlug);
        extra.push({
          id: s.creatorSlug,
          slug: s.creatorSlug,
          displayName: s.creatorName,
          initials: s.initials,
          accentColor: s.accentColor,
          avatarUrl: s.avatarUrl,
          handle: null,
          bio: null,
          placeCount: channelCounts.get(s.creatorSlug) ?? 0,
          videoCount: 0,
          recentVideos: [],
          cities: [],
        });
      }
    }
    return extra.length ? [...creators, ...extra] : creators;
  }, [creators, places, channelCounts]);

  const modalCities = useMemo(() => {
    const pool = places.filter((p) =>
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
  }, [places, cities, axes, saved]);

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
            const reconciled = reconcileMapFilter(places, proposed, [], saved);
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
        const reconciled = reconcileMapFilter(places, proposed, keep, saved);
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
      style={
        surface === "page"
          ? ({ ["--map-sheet-h" as string]: `${sheetPct}%` } as React.CSSProperties)
          : undefined
      }
    >
      <div className="canvas-map">
        <MapView
          className="absolute inset-0 h-full w-full"
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
            return {
              top: 128,
              right: 24,
              bottom: Math.round((h * sheetPctRef.current) / 100) + 16,
              left: 24,
            };
          }}
        />
        {/* 지도 위 첫 줄 — /map 모바일에만. 헤더를 걷어낸 자리를 검색창과 필터가 받는다.
            아래 시트에는 목록만 남는다 — 시트를 조금만 올려도 필터가 가려지던 자리였다.
            상세가 열리면 검색·필터 대신 ←/✕ 만 남는다(네이버 장소 화면 문법). */}
        {surface === "page" && !detailOpen ? (
          <div className="canvas-topbar lg:hidden">
            {searchField(true)}
            {filters("floating")}
          </div>
        ) : null}
        {surface === "page" && detailOpen ? (
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

        {/* 상세: 모바일 place-drawer / 데스크톱 지도 안 카드 — 모두 map relative 기준 */}
        {detailOpen && detailPlace ? (
          <PlaceSheet
            index={detailIndex + 1}
            place={{
              id: detailPlace.id,
              name: displayPlaceName(detailPlace, locale),
              nameLocal: detailPlace.nameLocal,
              typeLabel: m.placeTypes[detailPlace.placeType],
              address: detailPlace.address,
              summary: detailPlace.summary,
              mapUrl: detailPlace.mapUrl,
              sources: sourcesFor(detailPlace),
            }}
            onClose={closeDetail}
            collapseToken={collapseToken}
            onSnapChange={setPlaceSnap}
          />
        ) : null}
      </div>

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
            ) : (
              <p className="index tnum" style={{ color: "var(--dim)" }}>
                {t(m.cityDetail.placesAll, { n: filtered.length })}
              </p>
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

          {filtered.length === 0 ? (
            <EmptyState message={m.home.empty} />
          ) : (
            <ul className="px-4 pb-6">
              {filtered.map((p, i) => {
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
                            alt={p.youtubeTitle ?? displayPlaceName(p, locale)}
                            eager={i < 2}
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
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
