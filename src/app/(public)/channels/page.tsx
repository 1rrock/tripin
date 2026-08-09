import type { Metadata } from "next";
import Link from "next/link";
import { loadHomeFeed } from "@/shared/api/home";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Avatar, Chip, Icon, Index, Rule } from "@/shared/ui/frame";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return {
    title: m.channels.title,
    description: m.channels.empty,
    alternates: { languages: { ko: "/channels", en: "/en/channels" } },
  };
}

export default async function ChannelsPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const { creators, totals } = await loadHomeFeed();

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <header className="flex flex-col gap-3.5">
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-display)", letterSpacing: "-0.045em", lineHeight: 1.12 }}
        >
          {locale === "en" ? "Who to follow?" : "누구 따라갈까요?"}
        </h1>
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          {t(m.channels.stats, {
            creators: totals.creators,
            places: totals.places,
            cities: totals.cities,
          })}
        </p>
      </header>

      {creators.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.channels.empty}</p>
      ) : (
        <ul className="md:grid md:grid-cols-2 md:gap-x-(--block)">
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
                    {c.cities.map((x) => x.name).join(" · ")}
                  </span>
                </span>
                <Index className="tnum shrink-0">
                  {t(m.channels.placesUnit, { n: c.placeCount })}
                </Index>
                <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
              </Link>

              {c.cities.length > 1 ? (
                <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) pb-4 md:mx-0 md:flex-wrap md:px-0">
                  {c.cities.map((city) => (
                    <Chip
                      key={city.slug}
                      href={localePath(`/c/${c.slug}/${city.slug}`, locale)}
                    >
                      {city.name}
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
