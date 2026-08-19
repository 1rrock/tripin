"use client";

/**
 * 인기 목적지.
 * 홈에서 누르면 `/map?city=` 로 가서 그 도시 필터가 켜진 지도를 본다.
 * 썸네일은 16:9 원본 — 4:5 로 자르면 유튜브 변형이 된다.
 */

import Link from "next/link";
import { Frame } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName } from "@/shared/i18n/display";
import type { CityRow } from "@/shared/api/cities";

function CityCard({
  city,
  i,
  wide = false,
}: {
  city: CityRow;
  i: number;
  wide?: boolean;
}) {
  const { messages: m, href, t, locale } = useLocale();
  const cut = city.recentVideos[0];
  const name = displayCityName(city, locale);
  const meta = t(m.cityIndex.placesChannels, {
    places: city.placeCount,
    creators: city.creatorCount,
  });

  return (
    <Link
      href={href(`/map?city=${city.slug}`)}
      prefetch={false}
      aria-label={`${name} ${meta}`}
      className="block transition-transform active:scale-95"
    >
      <Frame className="block w-full">
        {cut ? <Thumb youtubeId={cut.youtubeId} alt={cut.title} eager={i < 2} /> : null}
      </Frame>
      <p className={`mt-2.5 truncate font-semibold ${wide ? "text-[16px]" : "text-[14px]"}`}>
        {name}
      </p>
      <p className="text-[12px] text-(--dim)">{meta}</p>
    </Link>
  );
}

export function DestinationRail({ cities }: { cities: CityRow[] }) {
  const { messages: m, href } = useLocale();
  if (cities.length === 0) return null;

  return (
    <section aria-labelledby="rail-h" className="pt-5">
      <div className="flex items-baseline justify-between gap-3 px-(--gutter)">
        <h2 id="rail-h" className="text-xl font-bold tracking-[-0.03em]">
          {m.home.popular}
        </h2>
        <Link
          href={href("/map")}
          prefetch={false}
          className="text-[13px] font-medium text-(--dim) hover:text-(--paper)"
        >
          {m.home.allRegions}
        </Link>
      </div>
      <ul className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto px-(--gutter) pb-1">
        {cities.map((c, i) => (
          <li key={c.slug} className="w-[132px] shrink-0">
            <CityCard city={c} i={i} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DestinationGrid({ cities }: { cities: CityRow[] }) {
  const { messages: m, href } = useLocale();
  if (cities.length === 0) return null;

  return (
    <section aria-labelledby="grid-h" className="px-(--gutter) pt-2 pb-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="grid-h" className="text-2xl font-bold tracking-[-0.03em]">
          {m.home.popular}
        </h2>
        <Link
          href={href("/map")}
          prefetch={false}
          className="text-[13px] font-medium text-(--dim) hover:text-(--paper)"
        >
          {m.home.allRegions}
        </Link>
      </div>
      <ul className="mt-5 grid grid-cols-4 gap-x-4 gap-y-8">
        {cities.map((c, i) => (
          <li key={c.slug} className="min-w-0">
            <CityCard city={c} i={i} wide />
          </li>
        ))}
      </ul>
    </section>
  );
}
