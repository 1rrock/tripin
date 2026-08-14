"use client";

/**
 * 전역 지도 캔버스. `/map` 은 전 구간, 지역·종류·채널은 데스크톱만.
 * 클릭·검색은 이 지도를 좁힌다. 종류·지역·채널은 필터.
 * 핀은 번호가 아니라 점 → 가까이서 상호. 누르면 상세.
 */

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import type { FeedCreator } from "@/shared/api/home";
import type { CityRow, HomeMapPlace } from "@/shared/api/cities";
import type { PlaceType } from "@/shared/api/database.types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import { Frame } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { MapView } from "@/shared/ui/MapView";
import { PlaceSheet } from "@/shared/ui/PlaceSheet";
import { EmptyState } from "@/shared/ui/EmptyState";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { choseong, isChoseongQuery } from "@/shared/lib/search";
import {
  HOME_REGION_ORDER,
  homeRegionForCountry,
  isHomeRegionId,
  type HomeRegionId,
} from "@/shared/lib/geo-regions";
import { CanvasFilters } from "./CanvasFilters";

function matchesQuery(hay: string, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (hay.includes(needle)) return true;
  return isChoseongQuery(needle) && choseong(hay).includes(needle);
}

export type CanvasLead = "home" | "region" | "channel" | "type";

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

  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedChannel = creators.find((c) => c.slug === channel) ?? null;
  const selectedCity = cities.find((c) => c.slug === city) ?? null;

  const replace = useCallback(
    (next: {
      city?: string | null;
      channel?: string | null;
      type?: string | null;
      q?: string;
      region?: string | null;
    }) => {
      const params = new URLSearchParams();
      const c = "city" in next ? next.city : city;
      const ch = "channel" in next ? next.channel : channel;
      const tp = "type" in next ? next.type : type;
      const query = "q" in next ? next.q : q;
      const rg = "region" in next ? next.region : region;
      if (c) params.set("city", c);
      else if (rg) params.set("region", rg);
      if (ch) params.set("channel", ch);
      if (tp) params.set("type", tp);
      if (query?.trim()) params.set("q", query.trim());
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [city, channel, type, q, region, pathname, router],
  );

  const filtered = useMemo(() => {
    return places.filter((p) => {
      if (city && p.citySlug !== city) return false;
      if (!city && region && homeRegionForCountry(p.countryCode) !== region) return false;
      if (channel && !p.sources.some((s) => s.creatorSlug === channel)) return false;
      if (type && p.placeType !== type) return false;
      if (q && !matchesQuery(p.searchText, q)) return false;
      return true;
    });
  }, [places, city, region, channel, type, q]);

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

  const onPinClick = (id: string) => {
    if (activeId === id && sheetOpen) {
      setSheetOpen(false);
      setActiveId(null);
      return;
    }
    setActiveId(id);
    setSheetOpen(true);
  };

  const activePlace = filtered.find((p) => p.id === activeId) ?? null;
  const activeIndex = activePlace ? filtered.findIndex((p) => p.id === activePlace.id) : -1;
  const hasFilter = Boolean(city || region || channel || type || q.trim());

  const sourcesFor = (place: HomeMapPlace) =>
    channel ? place.sources.filter((s) => s.creatorSlug === channel) : place.sources;

  const title =
    lead === "region" ? m.nav.region : lead === "channel" ? m.nav.channel : lead === "type" ? m.nav.type : m.home.srHeading;

  const regionLabel = city
    ? displayCityName(selectedCity ?? { name: city }, locale)
    : region
      ? m.home.homeRegions[region]
      : m.home.regionFilter;

  const typeCounts = useMemo(() => {
    const map = new Map<PlaceType, number>();
    for (const p of places) {
      if (city && p.citySlug !== city) continue;
      if (!city && region && homeRegionForCountry(p.countryCode) !== region) continue;
      if (channel && !p.sources.some((s) => s.creatorSlug === channel)) continue;
      if (q && !matchesQuery(p.searchText, q)) continue;
      map.set(p.placeType, (map.get(p.placeType) ?? 0) + 1);
    }
    return map;
  }, [places, city, region, channel, q]);

  const channelCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of places) {
      if (city && p.citySlug !== city) continue;
      if (!city && region && homeRegionForCountry(p.countryCode) !== region) continue;
      if (type && p.placeType !== type) continue;
      if (q && !matchesQuery(p.searchText, q)) continue;
      const seen = new Set<string>();
      for (const s of p.sources) {
        if (seen.has(s.creatorSlug)) continue;
        seen.add(s.creatorSlug);
        map.set(s.creatorSlug, (map.get(s.creatorSlug) ?? 0) + 1);
      }
    }
    return map;
  }, [places, city, region, type, q]);

  const modalCities = useMemo(() => {
    const pool = places.filter((p) => {
      if (channel && !p.sources.some((s) => s.creatorSlug === channel)) return false;
      if (type && p.placeType !== type) return false;
      if (q && !matchesQuery(p.searchText, q)) return false;
      return true;
    });
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
  }, [places, cities, channel, type, q]);

  return (
    <div className={surface === "page" ? "canvas-page canvas-root" : "canvas-page hidden lg:block"}>
      <div className="canvas-map">
        <MapView
          className="absolute inset-0 h-full w-full"
          pins={pins}
          activeId={activeId}
          onPinClick={onPinClick}
          cluster
          nameWhenClose
        />
        {sheetOpen && activePlace ? (
          <PlaceSheet
            index={activeIndex + 1}
            place={{
              id: activePlace.id,
              name: displayPlaceName(activePlace, locale),
              nameLocal: activePlace.nameLocal,
              typeLabel: m.placeTypes[activePlace.placeType],
              address: activePlace.address,
              summary: activePlace.summary,
              mapUrl: activePlace.mapUrl,
              sources: sourcesFor(activePlace),
            }}
            onClose={() => setSheetOpen(false)}
          />
        ) : null}
      </div>

      <section className="canvas-panel">
        <h1 className="sr-only">{title}</h1>
        {lead !== "home" ? (
          <div className="px-4 pt-4 pb-1">
            <p className="text-xl font-bold tracking-[-0.03em]">{title}</p>
          </div>
        ) : null}

        <div className={`px-4 pb-3 ${lead === "home" ? "pt-4" : "pt-3"}`}>
          <div className="relative flex h-10 w-full items-center">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("tripin:open-search"))}
              className="relative flex h-10 min-w-0 flex-1 items-center rounded-xl bg-(--hover) pr-3 pl-9 text-left"
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
                  setSheetOpen(false);
                  replace({ q: "" });
                }}
                className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-(--dim) hover:bg-white"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <CanvasFilters
          region={region}
          city={city}
          type={type}
          channel={channel}
          regionLabel={regionLabel}
          typeLabel={type ? m.placeTypes[type] : m.nav.type}
          channelLabel={selectedChannel?.displayName ?? m.nav.channel}
          groups={modalCities}
          creators={creators}
          channelCounts={channelCounts}
          typeCounts={typeCounts}
          onApply={(next) => {
            setActiveId(null);
            setSheetOpen(false);
            replace({
              region: next.region,
              city: next.city,
              type: next.type,
              channel: next.channel,
            });
          }}
        />

        <div className="flex items-center justify-between gap-3 px-4 pb-2">
          <p className="index tnum" style={{ color: "var(--dim)" }}>
            {t(m.cityDetail.placesAll, { n: filtered.length })}
          </p>
          {hasFilter ? (
            <button
              type="button"
              className="index text-(--wax) underline-offset-4 hover:underline"
              onClick={() => {
                setActiveId(null);
                setSheetOpen(false);
                replace({ city: null, channel: null, type: null, q: "", region: null });
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
                    onClick={() => onPinClick(p.id)}
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
      </section>
    </div>
  );
}
