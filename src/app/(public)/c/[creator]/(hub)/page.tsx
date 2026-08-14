import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCreatorVideos } from "@/shared/api/videos";
import { loadCreatorMap } from "@/shared/api/creator-hub";
import { VideoList } from "../VideoList";
import { CreatorExplorer, type CreatorPlace } from "../CreatorExplorer";
import type { PlaceType } from "@/shared/api/database.types";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { Avatar } from "@/shared/ui/frame"
import { Act, Icon } from "@/shared/ui/icons";
import { SubscribeButton } from "@/shared/ui/SaveButton";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { displayCityName, displaySummary } from "@/shared/i18n/display";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, linkList } from "@/shared/seo/json-ld";

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
  /* 제목·설명 모두 검색결과에서 잘린다(제목 ~60자, 설명은 한글 ~80자).
     비밀이야는 도시가 13곳이라 전부 나열하면 제목은 브랜드 접미사(`| Eatripin`)가,
     설명은 끝의 가치 문구("출처 영상 링크")가 통째로 밀려 나갔다. 둘 다 상한을 둔다. */
  const cityLabel = (n: number) =>
    data.cities.slice(0, n).map((g) => displayCityName(g, locale)).join(", ");
  const titleCities = cityLabel(3);
  const more = data.cities.length - 3;
  const descCities = cityLabel(6);
  const descMore = data.cities.length - 6;
  const bare = `/c/${creatorSlug}`;
  const title =
    locale === "en"
      ? `${data.creator.display_name} travel map — ${titleCities}${more > 0 ? ` +${more}` : ""}`
      : `${data.creator.display_name} 여행 지도 — ${titleCities}${more > 0 ? ` 외 ${more}곳` : ""}`;
  const description =
    locale === "en"
      ? `${data.creator.display_name} visited ${data.cities.length} cities — ${descCities}${descMore > 0 ? ` and ${descMore} more` : ""}. Places to eat and see, each linking back to its source video.`
      : /* 조사 폴백 「이(가)」 금지 — 스니펫에 그대로 나간다. `의`로 받침을 피한다 */
        `${data.creator.display_name}의 여행 도시 ${data.cities.length}곳 — ${descCities}${descMore > 0 ? ` 외 ${descMore}곳` : ""}. 맛집·명소마다 출처 영상 링크가 있습니다.`;
  return publicMeta({ locale, title, description, bare });
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
    <main className="flex flex-col gap-(--stack)">
      <JsonLd
        data={[
          breadcrumbList([
            { name: m.common.home, url: absoluteUrl("/", locale) },
            { name: m.nav.map, url: absoluteUrl("/map", locale) },
            {
              name: creator.display_name,
              url: absoluteUrl(`/c/${creatorSlug}`, locale),
            },
          ]),
          linkList(
            creator.display_name,
            cities.map((c) => ({
              name: displayCityName(c, locale),
              url: absoluteUrl(`/c/${creatorSlug}/${c.slug}`, locale),
            })),
          ),
        ]}
      />
      <header className="flex flex-col gap-2.5 px-(--gutter) pt-4 pb-0 lg:hidden">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
            {m.common.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <Link
            href={localePath("/map", locale)}
            className="underline-offset-4 hover:underline"
          >
            {m.nav.map}
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
            {/* 구독은 이 서비스 안의 구독이다. 유튜브로 나가는 링크를 밀어내지 않는다 —
                "나가는 길이 본업"(PRODUCT.md 원칙 4) 이라 둘을 나란히 둔다. */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Act icon="out" href={channelUrl}>
                {m.hub.channelLink}
              </Act>
              <SubscribeButton creatorId={creator.id} creatorName={creator.display_name} />
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
