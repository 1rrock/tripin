"use client";

/**
 * 데스크톱 홈 — 맵 캔버스. 클릭·검색은 이 지도를 좁힌다.
 * 종류는 전 지역 장소 목록. 지역은 모달에서 골라 필터에 붙인다.
 * 핀은 번호가 아니라 점 → 가까이서 상호. 누르면 상세.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import type { FeedCreator } from "@/shared/api/home";
import type { CityRow, HomeMapPlace } from "@/shared/api/cities";
import type { PlaceType } from "@/shared/api/database.types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import { Avatar, Chip } from "@/shared/ui/frame";
import { MapView } from "@/shared/ui/MapView";
import { PlaceSheet } from "@/shared/ui/PlaceSheet";
import { EmptyState } from "@/shared/ui/EmptyState";
import { HOME_TYPES, typeIcon } from "@/shared/ui/type-icons";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { choseong, isChoseongQuery } from "@/shared/lib/search";
import {
  HOME_REGION_ORDER,
  homeRegionForCountry,
  isHomeRegionId,
  type HomeRegionId,
} from "@/shared/lib/geo-regions";

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
  return <ExplorerCanvas lead="home" {...props} />;
}

export function ExplorerCanvas({
  places,
  cities,
  creators,
  lead = "home",
}: {
  places: HomeMapPlace[];
  cities: CityRow[];
  creators: FeedCreator[];
  lead?: CanvasLead;
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

  const [draft, setDraft] = useState(q);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);

  useEffect(() => {
    setDraft(q);
  }, [q]);

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

  const applyDraft = (value: string) => {
    setDraft(value);
    replace({ q: value });
  };

  const sourcesFor = (place: HomeMapPlace) =>
    channel ? place.sources.filter((s) => s.creatorSlug === channel) : place.sources;

  const browsing =
    (lead === "region" && !city && !region) ||
    (lead === "channel" && !channel) ||
    (lead === "type" && !type);

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
    <div className="canvas-page hidden lg:block">
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
          <label className="relative flex h-10 w-full items-center rounded-xl bg-(--hover) pr-3 pl-9">
            <MagnifyingGlass
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--dim)"
            />
            <input
              value={draft}
              onChange={(e) => applyDraft(e.target.value)}
              placeholder={m.home.goWhere}
              className="w-full bg-transparent text-base outline-none placeholder:text-(--dim)"
            />
            {draft ? (
              <button
                type="button"
                aria-label={m.search.close}
                onClick={() => applyDraft("")}
                className="grid size-7 place-items-center rounded-full text-(--dim) hover:bg-white"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>
        </div>

        {lead !== "type" || type ? (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
            {lead !== "region" || city || region ? (
              <Chip active={Boolean(city || region)} onClick={() => setRegionOpen(true)}>
                {regionLabel}
              </Chip>
            ) : null}
            {lead !== "type" ? (
              <>
                <Chip active={type === null} onClick={() => replace({ type: null })}>
                  {m.cityDetail.allTypes}
                </Chip>
                {HOME_TYPES.map((key) => (
                  <Chip
                    key={key}
                    active={type === key}
                    onClick={() => replace({ type: type === key ? null : key })}
                  >
                    {m.placeTypes[key]}
                  </Chip>
                ))}
              </>
            ) : type ? (
              <Chip active onClick={() => replace({ type: null })}>
                {m.placeTypes[type]}
              </Chip>
            ) : null}
          </div>
        ) : null}

        {lead !== "channel" && creators.length > 1 ? (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
            <Chip active={channel === null} onClick={() => replace({ channel: null })}>
              {m.cityDetail.allChannels}
            </Chip>
            {creators.map((c) => (
              <Chip
                key={c.slug}
                active={channel === c.slug}
                onClick={() => replace({ channel: channel === c.slug ? null : c.slug })}
              >
                <Avatar initials={c.initials} accent={c.accentColor} src={c.avatarUrl} size={18} />
                {c.displayName}
              </Chip>
            ))}
          </div>
        ) : null}

        {lead === "channel" && channel ? (
          <div className="px-4 pb-3">
            <Chip active onClick={() => replace({ channel: null })}>
              {selectedChannel?.displayName ?? channel}
            </Chip>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 px-4 pb-2">
          <p className="index tnum" style={{ color: "var(--dim)" }}>
            {t(m.cityDetail.placesAll, { n: filtered.length })}
            {selectedChannel && lead !== "channel" ? ` · ${selectedChannel.displayName}` : ""}
          </p>
          {hasFilter ? (
            <button
              type="button"
              className="index text-(--wax) underline-offset-4 hover:underline"
              onClick={() => {
                setDraft("");
                setActiveId(null);
                setSheetOpen(false);
                replace({ city: null, channel: null, type: null, q: "", region: null });
              }}
            >
              {m.cityDetail.clearFilters}
            </button>
          ) : null}
        </div>

        {browsing && lead === "region" ? (
          <div className="px-4 pb-6">
            {modalCities.map((group) => (
              <section key={group.id} className="mb-5">
                <button
                  type="button"
                  className="mb-2 flex w-full items-baseline justify-between text-left"
                  onClick={() => replace({ region: group.id, city: null })}
                >
                  <h2 className="text-[15px] font-bold tracking-[-0.02em]">
                    {m.home.homeRegions[group.id]}
                  </h2>
                  <span className="index text-(--dim)">
                    {t(m.home.placesUnit, {
                      n: group.items.reduce((s, c) => s + c.placeCount, 0),
                    })}
                  </span>
                </button>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((c) => (
                    <Chip key={c.slug} onClick={() => replace({ city: c.slug, region: null })}>
                      {displayCityName(c, locale)}
                      <span className="tnum opacity-60">{c.placeCount}</span>
                    </Chip>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : browsing && lead === "channel" ? (
          <ul>
            {creators.map((c) => {
              const n = channelCounts.get(c.slug) ?? 0;
              if (n === 0) return null;
              return (
                <li key={c.slug} className="border-b border-(--hairline)">
                  <button
                    type="button"
                    onClick={() => replace({ channel: c.slug })}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-(--hover)"
                  >
                    <Avatar initials={c.initials} accent={c.accentColor} src={c.avatarUrl} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">
                        {c.displayName}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-(--dim)">
                        {t(m.home.placesUnit, { n })}
                        {c.cities[0]
                          ? ` · ${displayCityName(c.cities[0], locale)}`
                          : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : browsing && lead === "type" ? (
          <nav className="grid grid-cols-3 gap-x-2 gap-y-4 px-4 pb-6">
            {HOME_TYPES.map((key) => {
              const n = typeCounts.get(key) ?? 0;
              const Glyph = typeIcon(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={n === 0}
                  onClick={() => replace({ type: key })}
                  className="flex flex-col items-center gap-1.5 disabled:opacity-40"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--halo)">
                    <Glyph className="text-[#383838]" size={22} weight="duotone" />
                  </span>
                  <span className="text-center text-[12px] font-medium">{m.placeTypes[key]}</span>
                  <span className="index text-(--dim)">{t(m.home.placesUnit, { n })}</span>
                </button>
              );
            })}
          </nav>
        ) : filtered.length === 0 ? (
          <EmptyState message={m.home.empty} />
        ) : (
          <ul>
            {filtered.map((p) => {
              const on = p.id === activeId;
              return (
                <li key={p.id} className="border-b border-(--hairline)">
                  <button
                    type="button"
                    onClick={() => onPinClick(p.id)}
                    aria-pressed={on}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left"
                    style={{ background: on ? "var(--hover)" : undefined }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">
                        {displayPlaceName(p, locale)}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-(--dim)">
                        {m.placeTypes[p.placeType]}
                        {" · "}
                        {displayCityName({ name: p.cityName, nameEn: p.cityNameEn }, locale)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {regionOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={m.search.close}
            className="absolute inset-0 bg-black/30"
            onClick={() => setRegionOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={m.home.regionPick}
            className="absolute top-1/2 left-[calc(92px+200px)] w-[min(420px,calc(100vw-140px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-[0_16px_60px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-center justify-between border-b border-(--hairline) px-5 py-3.5">
              <strong className="text-[17px] tracking-[-0.03em]">{m.home.regionPick}</strong>
              <button
                type="button"
                aria-label={m.search.close}
                onClick={() => setRegionOpen(false)}
                className="grid size-8 place-items-center rounded-full hover:bg-(--hover)"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[min(68vh,560px)] overflow-auto px-5 py-4">
              <button
                type="button"
                className="chip mb-4"
                data-active={!city && !region ? "true" : undefined}
                onClick={() => {
                  replace({ city: null, region: null });
                  setRegionOpen(false);
                }}
              >
                {m.home.regionAll}
              </button>
              {modalCities.map((group) => (
                <section key={group.id} className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[15px] font-bold tracking-[-0.02em]">
                      {m.home.homeRegions[group.id]}
                    </h2>
                    <button
                      type="button"
                      className="index text-(--dim) underline-offset-4 hover:underline"
                      onClick={() => {
                        replace({ region: group.id, city: null });
                        setRegionOpen(false);
                      }}
                    >
                      {m.home.regionFilter}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((c) => (
                      <Chip
                        key={c.slug}
                        active={city === c.slug}
                        onClick={() => {
                          replace({ city: c.slug, region: null });
                          setRegionOpen(false);
                        }}
                      >
                        {displayCityName(c, locale)}
                        <span className="tnum opacity-60">{c.placeCount}</span>
                      </Chip>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
