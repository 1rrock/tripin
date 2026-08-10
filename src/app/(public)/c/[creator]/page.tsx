import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCreatorVideos } from "@/shared/api/videos";
import { loadCreatorMap } from "@/shared/api/creator-hub";
import { VideoList } from "./VideoList";
import { CreatorExplorer, type CreatorPlace } from "./CreatorExplorer";
import type { PlaceType } from "@/shared/api/database.types";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { Act, Avatar, Icon } from "@/shared/ui/frame";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { displayCityName, displaySummary } from "@/shared/i18n/display";

/**
 * 채널 허브 — 콘택트 시트의 "롤" 한 통.
 *
 * 지도가 본체: 이 유튜버가 간 모든 장소를 한 지도에 올리고,
 * 지역·종류 칩으로 걸러 본다(도시 교차 화면의 대칭).
 * 영상 목록은 그 아래 2차 축.
 */

function parseType(v: string | undefined): PlaceType | null {
  return v && (FILTERABLE_TYPES as string[]).includes(v) ? (v as PlaceType) : null;
}

function parseCity(v: string | undefined, cities: { slug: string }[]): string | null {
  if (!v) return null;
  return cities.some((c) => c.slug === v) ? v : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { creator: creatorSlug } = await params;
  const data = await loadCreatorMap(creatorSlug);
  if (!data) return { title: "Not found" };
  const cityNames = data.cities.map((g) => displayCityName(g, locale)).join(", ");
  const bare = `/c/${creatorSlug}`;
  const alternates = {
    canonical: localePath(bare, locale),
    languages: { ko: bare, en: `/en${bare}` },
  };
  if (locale === "en") {
    return {
      title: `${data.creator.display_name} travel map — ${cityNames}`,
      description: `${data.creator.display_name} visited ${data.cities.length} cities (${cityNames}): places to eat and see. Each place links to its source video.`,
      alternates,
    };
  }
  return {
    title: `${data.creator.display_name} 여행 지도 — ${cityNames}`,
    description: `${data.creator.display_name}이(가) 다녀간 도시 ${data.cities.length}곳(${cityNames})의 맛집·명소 지도. 모든 장소에 출처 영상 링크 포함.`,
    alternates,
  };
}

export default async function CreatorHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ creator: string }>;
  searchParams: Promise<{ type?: string; city?: string }>;
}) {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const { creator: creatorSlug } = await params;
  const sp = await searchParams;
  const [data, videoData] = await Promise.all([
    loadCreatorMap(creatorSlug),
    loadCreatorVideos(creatorSlug),
  ]);
  if (!data) notFound();

  const { creator, places: rawPlaces, cities } = data;
  const videos = videoData?.videos ?? [];
  const channelUrl = creator.youtube_handle
    ? `https://www.youtube.com/${creator.youtube_handle}`
    : `https://www.youtube.com/channel/${creator.youtube_channel_id}`;

  const places: CreatorPlace[] = rawPlaces.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameLocal: p.nameLocal,
    placeType: p.placeType,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    summary: displaySummary(p, locale),
    mapUrl: p.mapUrl,
    citySlug: p.citySlug,
    cityName: p.cityName,
    cityNameEn: p.cityNameEn,
    sources: p.sources,
  }));

  return (
    <main className="flex flex-col gap-(--stack) pb-20">
      <header className="flex flex-col gap-2.5 px-(--gutter) pt-2 pb-0">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
            {m.common.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <Link
            href={localePath("/channels", locale)}
            className="underline-offset-4 hover:underline"
          >
            {m.hub.channelNav}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{creator.display_name}</span>
        </nav>

        <div className="flex items-center gap-4">
          <Avatar
            initials={creator.initials}
            accent={creator.accent_color}
            src={creator.avatar_url}
            size={54}
          />
          <div className="min-w-0 flex-1">
            <h1
              className="font-black"
              style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
            >
              {creator.display_name}
            </h1>
            <p className="index tnum mt-1.5" style={{ color: "var(--dim)" }}>
              {t(m.hub.stats, {
                places: places.length,
                cities: cities.length,
                videos: videos.length,
              })}
            </p>
            <div className="mt-2">
              <Act icon="out" href={channelUrl}>
                {m.hub.channelLink}
              </Act>
            </div>
          </div>
        </div>
      </header>

      <CreatorExplorer
        creatorSlug={creatorSlug}
        creatorName={creator.display_name}
        creatorInitials={creator.initials}
        creatorAccent={creator.accent_color}
        creatorAvatar={creator.avatar_url}
        places={places}
        cities={cities}
        initialType={parseType(sp.type)}
        initialCity={parseCity(sp.city, cities)}
      />

      {videos.length > 0 ? (
        <section
          aria-labelledby="video-h"
          className="flex flex-col gap-(--stack) px-(--gutter)"
        >
          <h2 id="video-h" className="index" style={{ color: "var(--dim)" }}>
            {t(m.hub.videosHeading, { n: videos.length })}
          </h2>
          <VideoList videos={videos} creatorSlug={creatorSlug} />
        </section>
      ) : null}
    </main>
  );
}
