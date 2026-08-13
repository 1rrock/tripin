"use client";

/**
 * 인기 목적지 가로 레일.
 * 썸네일은 16:9 원본 — 4:5 로 자르면 유튜브 변형이 된다.
 */

import Link from "next/link";
import { Frame } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName } from "@/shared/i18n/display";
import type { CityRow } from "@/shared/api/cities";

export function DestinationRail({ cities }: { cities: CityRow[] }) {
  const { messages: m, href, t, locale } = useLocale();
  if (cities.length === 0) return null;

  return (
    <section aria-labelledby="rail-h" className="pt-5">
      <div className="flex items-baseline justify-between gap-3 px-(--gutter)">
        <h2 id="rail-h" className="text-xl font-bold tracking-[-0.03em]">
          {m.home.popular}
        </h2>
        <Link
          href={href("/city")}
          className="text-[13px] font-medium text-(--dim) hover:text-(--paper)"
        >
          {m.home.allRegions}
        </Link>
      </div>
      <ul className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto px-(--gutter) pb-1">
        {cities.map((c, i) => {
          const cut = c.recentVideos[0];
          return (
            <li key={c.slug} className="w-[132px] shrink-0">
              <Link
                href={href(`/city/${c.slug}`)}
                className="block transition-transform active:scale-95"
                aria-label={t(m.cityIndex.openMap, {
                  name: displayCityName(c, locale),
                  places: c.placeCount,
                  creators: c.creatorCount,
                })}
              >
                <Frame className="block w-full">
                  {cut ? (
                    <Thumb youtubeId={cut.youtubeId} alt={cut.title} eager={i < 3} />
                  ) : null}
                </Frame>
                <p className="mt-2.5 truncate text-[14px] font-semibold">
                  {displayCityName(c, locale)}
                </p>
                <p className="text-[12px] text-(--dim)">
                  {t(m.home.placesUnit, { n: c.placeCount })}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
