import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { loadHomeFeed } from "@/shared/api/home";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { displayCityName } from "@/shared/i18n/display";
import { Avatar, Frame, Index, Rule } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

/**
 * 채널 인덱스 — 필름 롤 (채널 하나가 롤 하나).
 *
 * 이름·숫자만으로는 채널이 구분되지 않는다 — 곽튜브와 성시경의 차이는
 * 컷 4장이 이름보다 빨리 말해 준다. 이 월드에서 롤 = 채널이라는 정의
 * (globals.css 방향 계약)를 목록 문법으로 그대로 옮긴 화면이다.
 */

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
    <main className="flex flex-col px-(--gutter) pt-2 pb-20">
      {creators.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.channels.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {creators.map((c, i) => (
            <li key={c.slug} className="develop" style={{ "--i": i } as CSSProperties}>
              <Rule />
              <Link
                href={localePath(`/c/${c.slug}`, locale)}
                className="group block py-(--stack)"
                aria-label={t(m.channels.openChannel, {
                  name: c.displayName,
                  places: c.placeCount,
                })}
              >
                <span className="flex items-center gap-3.5">
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
                    <span className="mt-1.5 block truncate">
                      <Index>
                        {[c.handle, ...c.cities.map((x) => displayCityName(x, locale))]
                          .filter(Boolean)
                          .join(" · ")}
                      </Index>
                    </span>
                  </span>
                  <Index className="tnum shrink-0">
                    {t(m.channels.rollMeta, { videos: c.videoCount, places: c.placeCount })}
                  </Index>
                </span>

                <span className="no-scrollbar -mx-(--gutter) mt-3 flex gap-2 overflow-x-auto px-(--gutter) sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
                  {c.recentVideos.map((v) => (
                    <Frame
                      key={v.youtubeId}
                      className="w-[46%] shrink-0 transition-[box-shadow] duration-200 group-hover:shadow-[inset_0_0_0_1px_var(--edge)] sm:w-auto"
                    >
                      <Thumb youtubeId={v.youtubeId} alt={v.title} />
                    </Frame>
                  ))}
                </span>
              </Link>
            </li>
          ))}
          <Rule />
        </ul>
      )}
    </main>
  );
}
