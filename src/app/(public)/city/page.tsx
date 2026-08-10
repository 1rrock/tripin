import type { Metadata } from "next";
import Link from "next/link";
import { loadCityIndex } from "@/shared/api/cities";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName } from "@/shared/i18n/display";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Chip, Icon, Index, Rule } from "@/shared/ui/frame";


export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return {
    title: m.cityIndex.title,
    description: m.cityIndex.blurb,
    alternates: {
      canonical: localePath("/city", locale),
      languages: { ko: "/city", en: "/en/city" },
    },
  };
}

export default async function CityIndexPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const cities = await loadCityIndex();
  const totalPlaces = cities.reduce((sum, c) => sum + c.placeCount, 0);

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
          {m.cityIndex.title}
        </h1>
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          {t(m.cityIndex.stats, { cities: cities.length, places: totalPlaces })}
        </p>
        <p
          className="max-w-[42ch]"
          style={{
            fontSize: "var(--t-body)",
            color: "var(--dim)",
            lineHeight: 1.7,
          }}
        >
          {m.cityIndex.blurb}
        </p>
      </header>

      {cities.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.cityIndex.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {cities.map((c) => {
            const label = displayCityName({ name: c.name, nameEn: c.nameEn }, locale);
            return (
              <li key={c.slug}>
                <Rule />
                <Link
                  href={localePath(`/city/${c.slug}`, locale)}
                  className="flex items-center gap-3 py-3.5"
                  aria-label={t(m.cityIndex.openMap, {
                    name: label,
                    places: c.placeCount,
                    creators: c.creatorCount,
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
                      {locale === "en" ? c.name : c.nameEn}
                    </span>
                  </span>
                  <Index className="tnum shrink-0">
                    {t(m.cityIndex.placesChannels, {
                      places: c.placeCount,
                      creators: c.creatorCount,
                    })}
                  </Index>
                  <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
                </Link>

                {c.types.length > 1 ? (
                  <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) pb-3.5">
                    {c.types.map(({ type, count }) => (
                      <Chip
                        key={type}
                        href={localePath(`/city/${c.slug}?type=${type}`, locale)}
                      >
                        {m.placeTypes[type]}
                        <span className="tnum ml-1.5 opacity-60">{count}</span>
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
          <Rule />
        </ul>
      )}
    </main>
  );
}
