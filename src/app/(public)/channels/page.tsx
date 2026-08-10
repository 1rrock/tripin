import type { Metadata } from "next";
import Link from "next/link";
import { loadHomeFeed } from "@/shared/api/home";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { displayCityName } from "@/shared/i18n/display";
import { Avatar, Chip, Icon, Index, Rule } from "@/shared/ui/frame";


export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const { totals } = await loadHomeFeed();
  return {
    title: m.channels.title,
    description: t(m.channels.stats, {
      creators: totals.creators,
      places: totals.places,
      cities: totals.cities,
    }),
    alternates: {
      canonical: localePath("/channels", locale),
      languages: { ko: "/channels", en: "/en/channels" },
    },
  };
}

export default async function ChannelsPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const { creators } = await loadHomeFeed();

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">

      {creators.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.channels.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {creators.map((c) => (
            <li key={c.slug}>
              <Rule />
              <Link
                href={localePath(`/c/${c.slug}`, locale)}
                className="flex items-center gap-3.5 py-4"
                aria-label={t(m.channels.openChannel, {
                  name: c.displayName,
                  places: c.placeCount,
                })}
              >
                <Avatar
                  initials={c.initials}
                  accent={c.accentColor}
                  src={c.avatarUrl}
                  size={42}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate font-bold"
                    style={{ fontSize: "var(--t-title)", letterSpacing: "-0.025em" }}
                  >
                    {c.displayName}
                  </span>
                  <span
                    className="mt-1 block truncate"
                    style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                  >
                    {c.cities.map((x) => displayCityName(x, locale)).join(" · ")}
                  </span>
                </span>
                <Index className="tnum shrink-0">
                  {t(m.channels.placesUnit, { n: c.placeCount })}
                </Index>
                <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
              </Link>

              {c.cities.length > 1 ? (
                <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) pb-4">
                  {c.cities.map((city) => (
                    <Chip
                      key={city.slug}
                      href={localePath(`/c/${c.slug}/${city.slug}`, locale)}
                    >
                      {displayCityName(city, locale)}
                    </Chip>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
          <Rule />
        </ul>
      )}
    </main>
  );
}
