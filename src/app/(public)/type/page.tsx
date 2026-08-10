import type { Metadata } from "next";
import Link from "next/link";
import { loadTypeIndex } from "@/shared/api/place-types";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Icon, Index, Rule } from "@/shared/ui/frame";


export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return {
    title: m.typeIndex.title,
    description: m.typeIndex.blurb,
    alternates: {
      canonical: localePath("/type", locale),
      languages: { ko: "/type", en: "/en/type" },
    },
  };
}

export default async function TypeIndexPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const types = await loadTypeIndex();
  const totalPlaces = types.reduce((s, row) => s + row.placeCount, 0);

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <header className="flex flex-col gap-3.5">
        <h1
          className="font-black"
          style={{
            fontSize: "var(--t-display)",
            letterSpacing: "-0.045em",
            lineHeight: 1.12,
          }}
        >
          {m.typeIndex.title}
        </h1>
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          {t(m.typeIndex.stats, { types: types.length, places: totalPlaces })}
        </p>
        <p
          className="max-w-[42ch]"
          style={{
            fontSize: "var(--t-body)",
            color: "var(--dim)",
            lineHeight: 1.7,
          }}
        >
          {m.typeIndex.blurb}
        </p>
      </header>

      {types.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.typeIndex.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {types.map((row) => {
            const label = m.placeTypes[row.type];
            return (
              <li key={row.type}>
                <Rule />
                <Link
                  href={localePath(`/type/${row.type}`, locale)}
                  className="flex items-center gap-3 py-3.5"
                  aria-label={t(m.typeIndex.openType, {
                    label,
                    places: row.placeCount,
                    cities: row.cityCount,
                  })}
                >
                  <Icon.pin className="size-[18px] shrink-0" style={{ color: "var(--wax)" }} />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate font-bold"
                      style={{
                        fontSize: "var(--t-title)",
                        letterSpacing: "-0.025em",
                      }}
                    >
                      {label}
                    </span>
                    <span className="index mt-1 block" style={{ color: "var(--dim)" }}>
                      {t(m.typeIndex.citiesChannels, {
                        cities: row.cityCount,
                        creators: row.creatorCount,
                      })}
                    </span>
                  </span>
                  <Index className="tnum shrink-0">
                    {t(m.typeIndex.placesUnit, { n: row.placeCount })}
                  </Index>
                  <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
                </Link>
              </li>
            );
          })}
          <Rule />
        </ul>
      )}
    </main>
  );
}
