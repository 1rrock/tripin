import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import { chunkedIn } from "@/shared/api/chunked-in";
import type { PlaceType } from "@/shared/api/database.types";
import { primaryMapLink } from "@/shared/lib/map-links";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import type { EnSource } from "@/shared/i18n/display";

/**
 * 채널 허브 지도 — "이 유튜버가 간 곳" 전체.
 *
 * 도시 축(`/city/[city]`)이 채널 필터를 얹듯, 여기는 채널 고정 + **도시·종류 필터**.
 * 도시 리스트만 늘어놓던 허브를 지도 퍼스트로 바꾼다.
 */

export interface CreatorPlaceSource {
  youtubeId: string;
  videoTitle: string;
  timestampSec: number | null;
}

export interface CreatorMapPlaceRaw {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PlaceType;
  lat: number;
  lng: number;
  address: string | null;
  summary: string | null;
  summaryBullets: string[];
  priceHint: string | null;
  summaryEn: string | null;
  summaryBulletsEn: string[];
  priceHintEn: string | null;
  enSource: EnSource;
  mapUrl: string | null;
  citySlug: string;
  cityName: string;
  cityNameEn: string | null;
  sources: CreatorPlaceSource[];
}

export interface CreatorCityOption {
  slug: string;
  name: string;
  nameEn: string | null;
  placeCount: number;
}

export interface CreatorMapDetail {
  creator: {
    id: string;
    slug: string;
    display_name: string;
    initials: string;
    accent_color: string;
    avatar_url: string | null;
    youtube_channel_id: string;
    youtube_handle: string | null;
  };
  places: CreatorMapPlaceRaw[];
  cities: CreatorCityOption[];
}

export const loadCreatorMap = cachePublic(async function loadCreatorMap(
  creatorSlug: string,
): Promise<CreatorMapDetail | null> {
  const { data: creator } = await supabase
    .from("creators")
    .select(
      "id, slug, display_name, initials, accent_color, avatar_url, youtube_channel_id, youtube_handle",
    )
    .eq("slug", creatorSlug)
    .single();
  if (!creator) return null;

  const { data: videos } = await supabase
    .from("videos")
    .select("id, youtube_video_id, title")
    .eq("creator_id", creator.id);
  const videoList = videos ?? [];
  if (videoList.length === 0) return null;

  const videoById = new Map(videoList.map((v) => [v.id, v]));
  const videoIds = videoList.map((v) => v.id);

  const links = await chunkedIn(
    (ids) =>
      supabase.from("video_places").select("video_id, place_id, timestamp_sec").in("video_id", ids),
    videoIds,
  );
  const placeIds = [...new Set(links.map((l) => l.place_id))];
  if (placeIds.length === 0) return null;

  const places = await chunkedIn(
    (ids) =>
      supabase
        .from("places")
        .select(
          "id, slug, name, name_local, place_type, city_id, country_code, map_status, lat, lng, address, summary, summary_bullets, price_hint, summary_en, summary_bullets_en, price_hint_en, en_source, google_maps_url, google_place_id, kakao_place_id, naver_place_id",
        )
        .in("id", ids)
        .eq("map_status", "confirmed"),
    placeIds,
  );

  const confirmed = places.filter(
    (p) => p.lat !== null && p.lng !== null,
  );
  if (confirmed.length === 0) return null;

  const cityIds = [...new Set(confirmed.map((p) => p.city_id))];
  const { data: cities } = await supabase
    .from("cities")
    .select("id, slug, name, name_en")
    .in("id", cityIds);
  const cityById = new Map((cities ?? []).map((c) => [c.id, c]));

  // 도시별 확정 핀 수 — 공개 게이트와 동일
  const countByCity = new Map<string, number>();
  for (const p of confirmed) {
    countByCity.set(p.city_id, (countByCity.get(p.city_id) ?? 0) + 1);
  }
  const openCityIds = new Set(
    [...countByCity.entries()]
      .filter(([, n]) => n >= MIN_CONFIRMED_PINS)
      .map(([id]) => id),
  );

  const openPlaces = confirmed.filter((p) => openCityIds.has(p.city_id));
  if (openPlaces.length === 0) return null;

  // place → 이 채널 출처 영상들
  const sourcesByPlace = new Map<string, CreatorPlaceSource[]>();
  for (const link of links ?? []) {
    if (!openPlaces.some((p) => p.id === link.place_id)) continue;
    const video = videoById.get(link.video_id);
    if (!video) continue;
    const list = sourcesByPlace.get(link.place_id) ?? [];
    list.push({
      youtubeId: video.youtube_video_id,
      videoTitle: video.title,
      timestampSec: link.timestamp_sec,
    });
    sourcesByPlace.set(link.place_id, list);
  }

  const mapPlaces: CreatorMapPlaceRaw[] = [];
  for (const p of openPlaces) {
    const city = cityById.get(p.city_id);
    if (!city) continue;
    const sources = sourcesByPlace.get(p.id) ?? [];
    if (sources.length === 0) continue;
    mapPlaces.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameLocal: p.name_local,
      placeType: p.place_type,
      lat: p.lat as number,
      lng: p.lng as number,
      address: p.address,
      summary: p.summary,
      summaryBullets: p.summary_bullets ?? [],
      priceHint: p.price_hint,
      summaryEn: p.summary_en,
      summaryBulletsEn: p.summary_bullets_en ?? [],
      priceHintEn: p.price_hint_en,
      enSource: (p.en_source as EnSource) ?? null,
      mapUrl:
        primaryMapLink({
          googleMapsUrl: p.google_maps_url,
          googlePlaceId: p.google_place_id,
          kakaoPlaceId: p.kakao_place_id,
          naverPlaceId: p.naver_place_id,
          lat: p.lat,
          lng: p.lng,
          countryCode: p.country_code,
        })?.url ?? null,
      citySlug: city.slug,
      cityName: city.name,
      cityNameEn: city.name_en ?? null,
      sources,
    });
  }
  mapPlaces.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  if (mapPlaces.length === 0) return null;

  const cityCounts = new Map<string, CreatorCityOption>();
  for (const p of mapPlaces) {
    const prev = cityCounts.get(p.citySlug);
    if (prev) {
      prev.placeCount += 1;
    } else {
      cityCounts.set(p.citySlug, {
        slug: p.citySlug,
        name: p.cityName,
        nameEn: p.cityNameEn,
        placeCount: 1,
      });
    }
  }
  const cityOptions = [...cityCounts.values()].sort(
    (a, b) => b.placeCount - a.placeCount,
  );

  return {
    creator,
    places: mapPlaces,
    cities: cityOptions,
  };
}, ["creator:map"]);
