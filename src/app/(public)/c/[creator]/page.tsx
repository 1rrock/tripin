import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCreatorVideos } from "@/shared/api/videos";
import { VideoList } from "./VideoList";
import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import type { PlaceType } from "@/shared/api/database.types";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { Act, Avatar, Chip, Icon, Index, Rule } from "@/shared/ui/frame";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { displayCityName } from "@/shared/i18n/display";

/**
 * 채널 허브 — 콘택트 시트의 "롤" 한 통.
 *
 * 두 축이 있다: 도시(→ 지도)와 영상(→ 타임라인).
 * 도시에는 이미지가 없으므로 프레임이 아니라 **라벨 행**으로 놓는다. 없는 그림을
 * 픽토그램으로 대신 채우려던 것이 직전 월드가 무너진 자리다.
 *
 * anon 클라이언트 → RLS 가 is_published=true 만 내려준다.
 */

interface CityGroup {
  slug: string;
  name: string;
  nameEn: string | null;
  placeCount: number;
  types: { type: PlaceType; count: number }[];
}

/** generateMetadata 와 페이지가 같은 캐시 항목을 나눠 쓴다 — 로케일 무관한 행만. */
const loadCreatorHub = cachePublic(async function loadCreatorHub(creatorSlug: string) {
  const { data: creator } = await supabase
    .from("creators")
    .select("id, slug, display_name, initials, accent_color, avatar_url, youtube_channel_id, youtube_handle")
    .eq("slug", creatorSlug)
    .single();
  if (!creator) return null;

  const { data: videos } = await supabase.from("videos").select("id").eq("creator_id", creator.id);
  const videoIds = (videos ?? []).map((v) => v.id);
  const { data: links } = videoIds.length
    ? await supabase.from("video_places").select("video_id, place_id").in("video_id", videoIds)
    : { data: [] };
  const placeIds = [...new Set((links ?? []).map((l) => l.place_id))];
  const { data: places } = placeIds.length
    ? await supabase
        .from("places")
        .select("id, city_id, place_type, map_status")
        .in("id", placeIds)
        .eq("map_status", "confirmed")
    : { data: [] };

  const cityIds = [...new Set((places ?? []).map((p) => p.city_id))];
  const { data: cities } = cityIds.length
    ? await supabase.from("cities").select("id, slug, name, name_en").in("id", cityIds)
    : { data: [] };

  const groups: CityGroup[] = (cities ?? [])
    .map((city) => {
      const cityPlaces = (places ?? []).filter((p) => p.city_id === city.id);
      const typeCount = new Map<PlaceType, number>();
      for (const p of cityPlaces) {
        typeCount.set(p.place_type, (typeCount.get(p.place_type) ?? 0) + 1);
      }
      return {
        slug: city.slug,
        name: city.name,
        nameEn: city.name_en,
        placeCount: cityPlaces.length,
        types: [...typeCount.entries()]
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
      };
    })
    // 공개 게이트 — 확정 핀이 모자란 조각은 허브 목록에서도 뺀다
    .filter((g) => g.placeCount >= MIN_CONFIRMED_PINS)
    .sort((a, b) => b.placeCount - a.placeCount);
  // 남은 조각이 하나도 없으면 이 채널은 아직 공개되지 않은 것 → 호출부에서 notFound()
  if (groups.length === 0) return null;

  return { creator, groups };
}, ["creator:hub"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { creator: creatorSlug } = await params;
  const data = await loadCreatorHub(creatorSlug);
  if (!data) return { title: "Not found" };
  const cityNames = data.groups.map((g) => displayCityName(g, locale)).join(", ");
  const bare = `/c/${creatorSlug}`;
  const alternates = {
    canonical: localePath(bare, locale),
    languages: { ko: bare, en: `/en${bare}` },
  };
  if (locale === "en") {
    return {
      title: `${data.creator.display_name} travel map — ${cityNames}`,
      description: `${data.creator.display_name} visited ${data.groups.length} cities (${cityNames}): places to eat and see. Each place links to its source video.`,
      alternates,
    };
  }
  return {
    title: `${data.creator.display_name} 여행 지도 — ${cityNames}`,
    description: `${data.creator.display_name}이(가) 다녀간 도시 ${data.groups.length}곳(${cityNames})의 맛집·명소 지도. 모든 장소에 출처 영상 링크 포함.`,
    alternates,
  };
}

export default async function CreatorHubPage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const { creator: creatorSlug } = await params;
  const [data, videoData] = await Promise.all([
    loadCreatorHub(creatorSlug),
    loadCreatorVideos(creatorSlug),
  ]);
  if (!data) notFound();
  // 도시가 하나여도 리다이렉트하지 않는다 — 영상 축이 생겨서 이 화면에 볼 것이 있다.

  const { creator, groups } = data;
  const videos = videoData?.videos ?? [];
  const totalPlaces = groups.reduce((sum, g) => sum + g.placeCount, 0);
  const channelUrl = creator.youtube_handle
    ? `https://www.youtube.com/${creator.youtube_handle}`
    : `https://www.youtube.com/channel/${creator.youtube_channel_id}`;

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
        <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
          {m.common.home}
        </Link>
        <Icon.chevron className="size-2.5" />
        <span style={{ color: "var(--paper)" }}>{creator.display_name}</span>
      </nav>

      <header className="flex items-center gap-4">
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
            {t(m.hub.stats, { places: totalPlaces, cities: groups.length, videos: videos.length })}
          </p>
          <div className="mt-2">
            <Act icon="out" href={channelUrl}>
              {m.hub.channelLink}
            </Act>
          </div>
        </div>
      </header>

      {/* 도시 축 — 지도로 가는 문. 이미지가 없으므로 라벨 행으로 놓는다 */}
      <section aria-labelledby="city-h" className="flex flex-col gap-(--stack)">
        <h2 id="city-h" className="index" style={{ color: "var(--dim)" }}>
          {t(m.hub.citiesHeading, { n: groups.length })}
        </h2>
        <ul className="md:grid md:grid-cols-2 md:gap-x-(--block)">
          {groups.map((g) => (
            <li key={g.slug}>
              <Rule />
              <Link
                href={localePath(`/c/${creatorSlug}/${g.slug}`, locale)}
                className="flex items-center gap-3 py-3.5"
                aria-label={t(m.hub.cityMapAria, {
                  name: displayCityName(g, locale),
                  places: g.placeCount,
                })}
              >
                <Icon.pin className="size-[18px] shrink-0" style={{ color: "var(--wax)" }} />
                <span
                  className="min-w-0 flex-1 truncate font-bold"
                  style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em" }}
                >
                  {displayCityName(g, locale)}
                </span>
                <Index className="tnum shrink-0">{t(m.home.placesUnit, { n: g.placeCount })}</Index>
                <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
              </Link>

              {/* 유형별 바로 진입 — 지도를 미리 걸러 연다 */}
              {g.types.length > 1 ? (
                <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) pb-3.5 md:mx-0 md:flex-wrap md:px-0">
                  {g.types.map(({ type, count }) => (
                    <Chip key={type} href={localePath(`/c/${creatorSlug}/${g.slug}?type=${type}`, locale)}>
                      {m.placeTypes[type]}
                      <span className="tnum ml-1.5 opacity-60">{count}</span>
                    </Chip>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {videos.length > 0 ? (
        <section aria-labelledby="video-h" className="flex flex-col gap-(--stack)">
          <h2 id="video-h" className="index" style={{ color: "var(--dim)" }}>
            {t(m.hub.videosHeading, { n: videos.length })}
          </h2>
          <VideoList videos={videos} creatorSlug={creatorSlug} />
        </section>
      ) : null}
    </main>
  );
}
