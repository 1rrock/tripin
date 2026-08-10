"use client";

/**
 * 채널 지도 — 이 유튜버가 간 **모든 도시**의 장소를 한 지도에.
 *
 *   · 핀 → 상세 시트 (요약·출처)
 *   · 목록 행 → 출처 **영상 페이지** (`/c/.../v/...`) — 가짜 아코디언 금지
 *   · `?city=`·`?type=` 을 replace 로 동기화
 */

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PlaceType } from "@/shared/api/database.types";
import type { CreatorCityOption } from "@/shared/api/creator-hub";
import { MapView } from "@/shared/ui/MapView";
import { PlaceSheet } from "@/shared/ui/PlaceSheet";
import { Chip, FrameNo, Icon, Rule } from "@/shared/ui/frame";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  displayCityName,
  displayPlaceName,
  displayPlaceSecondary,
} from "@/shared/i18n/display";
import type { SummaryDisplay } from "@/shared/i18n/display";

export interface CreatorPlace {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PlaceType;
  lat: number;
  lng: number;
  address: string | null;
  summary: SummaryDisplay;
  mapUrl: string | null;
  citySlug: string;
  cityName: string;
  cityNameEn: string | null;
  sources: {
    youtubeId: string;
    videoTitle: string;
    timestampSec: number | null;
  }[];
}

/** 목록 행 목적지 — 첫 출처 영상. 없으면 도시 조각으로 물러난다. */
function placeHref(
  creatorSlug: string,
  place: CreatorPlace,
  href: (path: string) => string,
): string {
  const first = place.sources[0];
  if (first) return href(`/c/${creatorSlug}/v/${first.youtubeId}`);
  return href(`/c/${creatorSlug}/${place.citySlug}`);
}

export function CreatorExplorer({
  creatorSlug,
  creatorName,
  creatorInitials,
  creatorAccent,
  creatorAvatar,
  places,
  cities,
  initialType,
  initialCity,
}: {
  creatorSlug: string;
  creatorName: string;
  creatorInitials: string;
  creatorAccent: string;
  creatorAvatar: string | null;
  places: CreatorPlace[];
  cities: CreatorCityOption[];
  initialType: PlaceType | null;
  initialCity: string | null;
}) {
  const { messages: m, href, t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [type, setType] = useState<PlaceType | null>(initialType);
  const [city, setCity] = useState<string | null>(initialCity);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rowRefs = useRef<globalThis.Map<string, HTMLLIElement>>(new globalThis.Map());

  const syncQuery = useCallback(
    (nextType: PlaceType | null, nextCity: string | null) => {
      const params = new URLSearchParams();
      if (nextType) params.set("type", nextType);
      if (nextCity) params.set("city", nextCity);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const selectType = (next: PlaceType | null) => {
    setType(next);
    syncQuery(next, city);
  };

  const selectCity = (next: string | null) => {
    setCity(next);
    syncQuery(type, next);
  };

  const shown = useMemo(
    () =>
      places.filter((p) => {
        if (type && p.placeType !== type) return false;
        if (city && p.citySlug !== city) return false;
        return true;
      }),
    [places, type, city],
  );

  const visibleActiveId =
    activeId !== null && shown.some((p) => p.id === activeId) ? activeId : null;

  const pins = useMemo(
    () =>
      shown.map((p, i) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        index: i + 1,
      })),
    [shown],
  );

  const presentTypes = FILTERABLE_TYPES.filter((t) =>
    places.some((p) => p.placeType === t),
  );

  const onPinClick = useCallback(
    (id: string) => {
      if (activeId === id && sheetOpen) {
        setSheetOpen(false);
        setActiveId(null);
        return;
      }
      setActiveId(id);
      setSheetOpen(true);
      const el = rowRefs.current.get(id);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    },
    [activeId, sheetOpen],
  );

  const activeIndex = shown.findIndex((p) => p.id === visibleActiveId);
  const activePlace = activeIndex >= 0 ? shown[activeIndex]! : null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start lg:gap-5 lg:px-(--gutter) lg:pt-2">
      <div className="relative lg:sticky lg:top-4 lg:order-2">
        <MapView
          className="h-[40dvh] w-full lg:h-[calc(100dvh-2rem)]"
          pins={pins}
          activeId={visibleActiveId}
          onPinClick={onPinClick}
          cluster
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
              sources: activePlace.sources.map((s) => ({
                creatorSlug,
                creatorName,
                initials: creatorInitials,
                accentColor: creatorAccent,
                avatarUrl: creatorAvatar,
                youtubeId: s.youtubeId,
                videoTitle: s.videoTitle,
                timestampSec: s.timestampSec,
              })),
            }}
            onClose={() => setSheetOpen(false)}
          />
        ) : null}
      </div>

      <section className="lg:order-1">
        <div className="flex flex-col gap-2 px-(--gutter) pt-3 pb-2 lg:px-0 lg:pt-0">
          {cities.length > 1 ? (
            <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
              <Chip active={city === null} onClick={() => selectCity(null)}>
                {m.hub.allCities}
              </Chip>
              {cities.map((c) => (
                <Chip
                  key={c.slug}
                  active={city === c.slug}
                  onClick={() => selectCity(city === c.slug ? null : c.slug)}
                >
                  {displayCityName(c, locale)}
                  <span className="tnum ml-1.5 opacity-60">{c.placeCount}</span>
                </Chip>
              ))}
            </div>
          ) : null}

          {presentTypes.length > 1 ? (
            <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
              <Chip active={type === null} onClick={() => selectType(null)}>
                {m.hub.allTypes}
              </Chip>
              {presentTypes.map((tKey) => (
                <Chip
                  key={tKey}
                  active={type === tKey}
                  onClick={() => selectType(type === tKey ? null : tKey)}
                >
                  {m.placeTypes[tKey]}
                </Chip>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="index tnum" style={{ color: "var(--dim)" }}>
              {shown.length === places.length
                ? t(m.hub.placesAll, { n: places.length })
                : t(m.hub.placesFiltered, {
                    shown: shown.length,
                    total: places.length,
                  })}
              {m.hub.pinHint}
            </p>
            {city ? (
              <Link
                href={href(`/c/${creatorSlug}/${city}`)}
                className="index underline-offset-4 hover:underline"
                style={{ color: "var(--wax)" }}
              >
                {m.hub.onlyThisCity}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col px-(--gutter) pb-10 lg:px-0">
          {shown.length === 0 ? (
            <div className="flex flex-col items-start gap-2 pt-2">
              <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
                {m.hub.noMatch}
              </p>
              <Chip
                onClick={() => {
                  setType(null);
                  setCity(null);
                  syncQuery(null, null);
                }}
              >
                {m.hub.clearFilters}
              </Chip>
            </div>
          ) : (
            <ol>
              {shown.map((place, index) => {
                const active = place.id === visibleActiveId;
                const cityLabel = displayCityName(
                  { name: place.cityName, nameEn: place.cityNameEn },
                  locale,
                );
                const secondary = displayPlaceSecondary(place, locale);
                return (
                  <li
                    key={place.id}
                    ref={(el: HTMLLIElement | null) => {
                      if (el) rowRefs.current.set(place.id, el);
                      else rowRefs.current.delete(place.id);
                    }}
                  >
                    <Rule />
                    <Link
                      href={placeHref(creatorSlug, place, href)}
                      className="-mx-2.5 flex items-start gap-3 px-2.5 py-2.5 transition-colors"
                      style={{
                        background: active ? "var(--sheet)" : undefined,
                        borderRadius: active ? "var(--r-control)" : undefined,
                      }}
                      aria-label={t(m.hub.openVideoAria, {
                        name: displayPlaceName(place, locale),
                      })}
                    >
                      <FrameNo n={index + 1} active={active} />
                      <span className="min-w-0 flex-1">
                        <span
                          className="block font-bold"
                          style={{
                            fontSize: "var(--t-title)",
                            letterSpacing: "-0.025em",
                            lineHeight: 1.3,
                          }}
                        >
                          {displayPlaceName(place, locale)}
                        </span>
                        <span
                          className="mt-0.5 block"
                          style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                        >
                          {cityLabel}
                          {" · "}
                          {m.placeTypes[place.placeType]}
                          {secondary ? (
                            <>
                              {" · "}
                              <span lang={locale === "en" ? "ko" : "ja"}>{secondary}</span>
                            </>
                          ) : null}
                        </span>
                      </span>
                      <Icon.chevron
                        className="mt-1 size-4 shrink-0"
                        style={{ color: "var(--dim)" }}
                      />
                    </Link>
                  </li>
                );
              })}
              <Rule />
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
