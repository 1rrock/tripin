"use client";

import Link from "next/link";
import type { TypeRow } from "@/shared/api/place-types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName } from "@/shared/i18n/display";
import { typeIcon } from "@/shared/ui/type-icons";
import { ResultRow } from "@/shared/ui/ResultRow";
import { EmptyState } from "@/shared/ui/EmptyState";

export function TypeIndex({ types }: { types: TypeRow[] }) {
  const { messages: m, href, t, locale } = useLocale();

  if (types.length === 0) {
    return <EmptyState message={m.typeIndex.empty} />;
  }

  return (
    <div>
      <header className="px-(--gutter) pt-4 pb-3">
        <h1 className="text-xl font-bold tracking-[-0.03em]">{m.nav.type}</h1>
        <p className="sr-only">{m.typeIndex.srHeading}</p>
      </header>

      <nav className="grid grid-cols-4 gap-y-3.5 px-(--gutter) pb-5 sm:grid-cols-5">
        {types.map((row) => {
          const Glyph = typeIcon(row.type);
          return (
            <Link
              key={row.type}
              href={href(`/type/${row.type}`)}
              className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--halo)">
                <Glyph className="text-[#383838]" size={22} weight="duotone" />
              </span>
              <span className="break-keep text-center text-[12px] font-medium text-[#383838]">
                {m.placeTypes[row.type]}
              </span>
            </Link>
          );
        })}
      </nav>

      <hr className="rule mx-(--gutter)" />

      <ul>
        {types.map((row, i) => {
          const cut = row.recentVideos[0];
          const city = row.cities[0];
          return (
            <li key={row.type} className="border-b border-(--hairline)">
              <ResultRow
                href={href(`/type/${row.type}`)}
                youtubeId={cut?.youtubeId ?? null}
                thumbAlt={cut?.title ?? m.placeTypes[row.type]}
                eyebrow={m.placeTypes[row.type]}
                eyebrowType={row.type}
                title={t(m.typeIndex.placesUnit, { n: row.placeCount })}
                meta={
                  city
                    ? `${displayCityName(city, locale)} · ${t(m.typeIndex.citiesChannels, {
                        cities: row.cityCount,
                        creators: row.creatorCount,
                      })}`
                    : t(m.typeIndex.placesUnit, { n: row.placeCount })
                }
                eager={i === 0}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
