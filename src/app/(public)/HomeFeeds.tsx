/**
 * 홈 본문 섹션 — 도시 다음으로 깔리는 네 덩어리.
 * 연예인 스팟 · 최근 영상 · 채널 롤 · 조각(채널×도시).
 * 서버 컴포넌트. 썸네일은 HTML 에 바로 실려 LCP 가 JS 를 기다리지 않는다.
 */

import Link from "next/link";
import type { FeedCelebritySpot, FeedCreator, FeedPiece, FeedVideo } from "@/shared/api/home";
import type { Locale } from "@/shared/i18n/config";
import type { Messages } from "@/shared/i18n/messages/ko";
import { t } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/paths";
import { displayCityName } from "@/shared/i18n/display";
import { Frame, Avatar, Index } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

const VIDEOS = 8;
const PIECES = 8;
const CELEB_SPOTS = 8;

type LocaleProps = {
  locale: Locale;
  messages: Messages;
};

function Head({
  id,
  title,
  moreHref,
  moreLabel,
}: {
  id: string;
  title: string;
  /** 없으면 제목만 — 연예인 레일처럼 v1 에 더보기 목적지가 없는 섹션용 */
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-(--gutter)">
      <h2 id={id} className="text-xl font-bold tracking-[-0.03em] lg:text-2xl">
        {title}
      </h2>
      {moreHref && moreLabel ? (
        <Link
          href={moreHref}
          className="text-[13px] font-medium text-(--dim) hover:text-(--paper)"
        >
          {moreLabel}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * 연예인이 간 장소 — 카드 단위는 장소다. 인물 단위로 하면 바로 아래
 * 채널 롤과 같은 물건이 된다. 배지의 인물은 채널 주인일 수도(성시경),
 * 남의 영상이 언급한 제3자일 수도(백종원) 있다. v1 은 더보기 없음.
 */
export function CelebrityFeed({
  spots,
  locale,
  messages: m,
}: { spots: FeedCelebritySpot[] } & LocaleProps) {
  const href = (path: string) => localePath(path, locale);
  const list = spots.slice(0, CELEB_SPOTS);
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="celeb-h" className="pt-8 lg:pt-12">
      <Head id="celeb-h" title={m.home.celebHeading} />
      <ul className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-(--gutter) pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {list.map((s) => {
          const person = locale === "ko" ? s.personName : (s.personNameEn ?? s.personName);
          return (
            <li key={s.placeSlug} className="w-[220px] shrink-0 lg:w-auto">
              <Link href={href(`/place/${s.placeSlug}`)} className="block active:scale-[0.99]">
                <Frame className="block w-full">
                  <Thumb youtubeId={s.cut.youtubeId} alt={s.cut.title} />
                </Frame>
                <p className="mt-2.5 truncate text-[15px] font-semibold tracking-[-0.01em]">
                  {s.placeName}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-(--dim)">
                  {person} · {displayCityName(s.city, locale)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function VideoFeed({
  videos,
  locale,
  messages: m,
}: { videos: FeedVideo[] } & LocaleProps) {
  const href = (path: string) => localePath(path, locale);
  const list = videos.slice(0, VIDEOS);
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="videos-h" className="pt-8 lg:pt-12">
      <Head id="videos-h" title={m.home.recentVideos} moreHref={href("/map")} moreLabel={m.home.moreFeed} />
      <ul className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-(--gutter) pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {list.map((v) => {
          const place = v.placeNames[0];
          const rest = v.placeNames.slice(1, 3);
          const city = v.cities[0];
          return (
            <li key={v.youtubeId} className="w-[220px] shrink-0 lg:w-auto">
              <Link href={href(`/c/${v.creatorSlug}/v/${v.youtubeId}`)} className="block active:scale-[0.99]">
                <Frame className="block w-full">
                  <Thumb youtubeId={v.youtubeId} alt={v.title} />
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

export function ChannelFeed({
  creators,
  locale,
  messages: m,
}: { creators: FeedCreator[] } & LocaleProps) {
  const href = (path: string) => localePath(path, locale);
  if (creators.length === 0) return null;

  return (
    <section aria-labelledby="channels-h" className="pt-8 lg:pt-12">
      <Head
        id="channels-h"
        title={m.home.feedChannels}
        moreHref={href("/channels")}
        moreLabel={m.home.moreFeed}
      />
      <ul className="mt-4 flex flex-col">
        {creators.map((c) => (
          <li key={c.slug} className="border-b border-(--hairline)">
            <Link
              href={href(`/c/${c.slug}`)}
              aria-label={`${c.displayName} ${t(m.home.placesUnit, { n: c.placeCount })} ${c.cities
                .slice(0, 4)
                .map((x) => displayCityName(x, locale))
                .join(" · ")}`}
              className="block px-(--gutter) py-4 active:bg-(--hover)"
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
                  {c.recentVideos.slice(0, 4).map((v) => (
                    <Frame key={v.youtubeId} className="block w-full">
                      <Thumb youtubeId={v.youtubeId} alt={v.title} />
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

export function PieceFeed({
  pieces,
  locale,
  messages: m,
}: { pieces: FeedPiece[] } & LocaleProps) {
  const href = (path: string) => localePath(path, locale);
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
        {list.map((p) => (
          <li key={`${p.creatorSlug}:${p.city.slug}`} className="w-[168px] shrink-0 lg:w-[200px]">
            <Link
              href={href(`/c/${p.creatorSlug}/${p.city.slug}`)}
              className="block active:scale-[0.99]"
            >
              <Frame className="block w-full">
                {p.cut ? (
                  <Thumb youtubeId={p.cut.youtubeId} alt={p.cut.title} />
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
