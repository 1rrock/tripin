"use client";

/**
 * 홈 본문 섹션 — 도시 다음으로 깔리는 세 덩어리.
 * 최근 영상 · 채널 롤 · 조각(채널×도시).
 * 각각 다른 단위라 탭으로 갈아끼우지 않는다.
 */

import Link from "next/link";
import type { FeedCreator, FeedPiece, FeedVideo } from "@/shared/api/home";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName } from "@/shared/i18n/display";
import { Frame, Avatar, Index } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

const VIDEOS = 8;
const PIECES = 8;

function Head({
  id,
  title,
  moreHref,
  moreLabel,
}: {
  id: string;
  title: string;
  moreHref: string;
  moreLabel: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-(--gutter)">
      <h2 id={id} className="text-xl font-bold tracking-[-0.03em] lg:text-2xl">
        {title}
      </h2>
      <Link href={moreHref} className="text-[13px] font-medium text-(--dim) hover:text-(--paper)">
        {moreLabel}
      </Link>
    </div>
  );
}

export function VideoFeed({ videos }: { videos: FeedVideo[] }) {
  const { messages: m, href, locale } = useLocale();
  const list = videos.slice(0, VIDEOS);
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="videos-h" className="pt-8 lg:pt-12">
      <Head id="videos-h" title={m.home.recentVideos} moreHref={href("/map")} moreLabel={m.home.moreFeed} />
      <ul className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-(--gutter) pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {list.map((v, i) => {
          const place = v.placeNames[0];
          const rest = v.placeNames.slice(1, 3);
          const city = v.cities[0];
          return (
            <li key={v.youtubeId} className="w-[220px] shrink-0 lg:w-auto">
              <Link href={href(`/c/${v.creatorSlug}/v/${v.youtubeId}`)} className="block active:scale-[0.99]">
                <Frame className="block w-full">
                  <Thumb youtubeId={v.youtubeId} alt={v.title} eager={i < 4} />
                </Frame>
                <p className="mt-2.5 truncate text-[15px] font-semibold tracking-[-0.01em]">
                  {place ?? v.title}
                </p>
                {rest.length > 0 ? (
                  <p className="mt-0.5 truncate text-[13px] text-(--dim)">{rest.join(" · ")}</p>
                ) : null}
                <p className="mt-0.5 truncate text-[12px] text-(--dim)">
                  {[v.creatorName, city ? displayCityName(city, locale) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ChannelFeed({ creators }: { creators: FeedCreator[] }) {
  const { messages: m, href, t, locale } = useLocale();
  if (creators.length === 0) return null;

  return (
    <section aria-labelledby="channels-h" className="pt-8 lg:pt-12">
      <Head
        id="channels-h"
        title={m.home.feedChannels}
        moreHref={href("/map")}
        moreLabel={m.home.moreFeed}
      />
      <ul className="mt-4 flex flex-col">
        {creators.map((c, i) => (
          <li key={c.slug} className="border-b border-(--hairline)">
            <Link
              href={href(`/c/${c.slug}`)}
              className="block px-(--gutter) py-4 active:bg-(--hover)"
              aria-label={t(m.home.openChannel, { name: c.displayName })}
            >
              <span className="flex items-center gap-3.5">
                <Avatar initials={c.initials} accent={c.accentColor} src={c.avatarUrl} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[15px] font-bold tracking-[-0.02em]">
                      {c.displayName}
                    </span>
                    <Index className="shrink-0">
                      {t(m.home.placesUnit, { n: c.placeCount })}
                    </Index>
                  </span>
                  <span className="mt-0.5 block truncate">
                    <Index>
                      {c.cities
                        .slice(0, 4)
                        .map((x) => displayCityName(x, locale))
                        .join(" · ")}
                    </Index>
                  </span>
                </span>
              </span>
              {c.recentVideos.length > 0 ? (
                <span className="mt-3 grid grid-cols-4 gap-2">
                  {c.recentVideos.slice(0, 4).map((v, vi) => (
                    <Frame key={v.youtubeId} className="block w-full">
                      <Thumb youtubeId={v.youtubeId} alt={v.title} eager={i === 0 && vi === 0} />
                    </Frame>
                  ))}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PieceFeed({ pieces }: { pieces: FeedPiece[] }) {
  const { messages: m, href, t, locale } = useLocale();
  const list = pieces.slice(0, PIECES);
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="pieces-h" className="pt-8 pb-4 lg:pt-12 lg:pb-6">
      <Head
        id="pieces-h"
        title={m.home.piecesHeading}
        moreHref={href("/map")}
        moreLabel={m.home.moreFeed}
      />
      <ul className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-(--gutter) pb-1">
        {list.map((p, i) => (
          <li key={`${p.creatorSlug}:${p.city.slug}`} className="w-[168px] shrink-0 lg:w-[200px]">
            <Link
              href={href(`/c/${p.creatorSlug}/${p.city.slug}`)}
              className="block active:scale-[0.99]"
            >
              <Frame className="block w-full">
                {p.cut ? (
                  <Thumb youtubeId={p.cut.youtubeId} alt={p.cut.title} eager={i < 3} />
                ) : null}
              </Frame>
              <p className="mt-2.5 truncate text-[15px] font-semibold tracking-[-0.01em]">
                {displayCityName(p.city, locale)}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-(--dim)">
                {p.creatorName} · {t(m.home.placesUnit, { n: p.placeCount })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
