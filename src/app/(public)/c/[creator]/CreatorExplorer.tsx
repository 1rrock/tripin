"use client";

/**
 * 채널이 간 곳 목록 — 지역·종류로 걸러 본다.
 *
 * 🔴 **여기에 지도를 두지 않는다.** `/channels` 와 같은 규율이다.
 *
 *   · Google Maps 는 **로드당 과금**이다. 화면마다 지도를 두면 코드도 비용도
 *     그대로 늘어난다 (커밋 c197783 에서 같은 이유로 지도를 /map 하나로 모았다).
 *   · 이 화면이 답하는 질문은 "이 채널이 어디를 다녔나" 이고, 그건 도시 칩과
 *     목록이 더 빨리 답한다. 핀을 뿌려 봐야 채널이 구분되지 않는다.
 *   · 지도가 필요한 순간에는 `/map?channel=…` 으로 넘긴다. 지금 걸어둔
 *     지역·종류 필터를 그대로 들고 가므로 화면이 끊기지 않는다.
 *
 * 목록 행 → 출처 **영상 페이지**(`/c/.../v/...`). 가짜 아코디언 금지.
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PlaceType } from "@/shared/api/database.types";
import type { CreatorCityOption } from "@/shared/api/creator-hub";
import { Chip, FrameNo, Rule } from "@/shared/ui/frame"
import { Icon } from "@/shared/ui/icons";
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
  places,
  cities,
  initialType,
  initialCity,
}: {
  creatorSlug: string;
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

  const presentTypes = FILTERABLE_TYPES.filter((t) =>
    places.some((p) => p.placeType === t),
  );

  /* 지금 화면의 필터를 그대로 지도로 넘긴다. /map 은 channel·city·type 을
     같은 이름으로 읽는다(`HomeCanvas.tsx`) — 여기서 이름을 바꾸면 조용히 무시된다. */
  const mapHref = useMemo(() => {
    const params = new URLSearchParams({ channel: creatorSlug });
    if (city) params.set("city", city);
    if (type) params.set("type", type);
    return href(`/map?${params.toString()}`);
  }, [creatorSlug, city, type, href]);

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col px-(--gutter) lg:max-w-3xl">
      <div className="flex flex-col gap-2 pt-1 pb-2">
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

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="index tnum" style={{ color: "var(--dim)" }}>
            {shown.length === places.length
              ? t(m.hub.placesAll, { n: places.length })
              : t(m.hub.placesFiltered, {
                  shown: shown.length,
                  total: places.length,
                })}
            {m.hub.pinHint}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {city ? (
              <Link
                href={href(`/c/${creatorSlug}/${city}`)}
                className="index underline-offset-4 hover:underline"
                style={{ color: "var(--wax)" }}
              >
                {m.hub.onlyThisCity}
              </Link>
            ) : null}
            {/* 지도는 /map 의 것이다. 필터를 들고 넘어간다. */}
            <Link
              href={mapHref}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 px-3.5 font-bold"
              style={{
                fontSize: "var(--t-meta)",
                borderRadius: "var(--r-frame)",
                background: "var(--halo)",
                color: "var(--halo-ink)",
              }}
            >
              <Icon.map className="size-4" />
              {m.hub.openMap}
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col pb-10">
        {shown.length === 0 ? (
          <div className="flex flex-col items-start gap-2 pt-2">
            <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.hub.noMatch}</p>
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
              const cityLabel = displayCityName(
                { name: place.cityName, nameEn: place.cityNameEn },
                locale,
              );
              const secondary = displayPlaceSecondary(place, locale);
              return (
                <li key={place.id} id={place.slug}>
                  <Rule />
                  <Link
                    href={placeHref(creatorSlug, place, href)}
                    className="roll -mx-2.5 flex items-start gap-3 rounded-(--r-control) px-2.5 py-2.5"
                    aria-label={t(m.hub.openVideoAria, {
                      name: displayPlaceName(place, locale),
                    })}
                  >
                    <FrameNo n={index + 1} />
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
  );
}
