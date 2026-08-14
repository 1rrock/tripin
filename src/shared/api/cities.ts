import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import type { PlaceType } from "@/shared/api/database.types";
import { primaryMapLink } from "@/shared/lib/map-links";
import { coordsFromMapsUrl } from "@/shared/lib/resolve-google-place";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import {
  displaySummary,
  type EnSource,
  type SummaryDisplay,
} from "@/shared/i18n/display";
import type { Locale } from "@/shared/i18n/config";

/**
 * 도시 축 로더 — 채널 무관 진입점 (CONCEPT.md 4.5).
 *
 * 조각(`/c/[creator]/[city]`)이 "이 유튜버가 이 도시에서 간 곳"이라면, 여기는
 * "이 도시에 간 유튜버들"이다. 같은 `video_places` 를 채널이 아니라 도시로 자른다.
 *
 * ⚠️ 집계 범위 — 장소 수·도시 수·채널 수는 전부 우리 큐레이션 산출물이라
 *    교차 집계 제한(§III.E.2, LEGAL.md 4.5-(2))에 걸리지 않는다.
 *    조회수·구독자수는 저장도 표시도 하지 않으므로 여기서도 다루지 않는다.
 */

export interface PlaceSource {
  creatorSlug: string;
  creatorName: string;
  initials: string;
  accentColor: string;
  avatarUrl: string | null;
  youtubeId: string;
  videoTitle: string;
  timestampSec: number | null;
}

/**
 * 로더가 돌려주는 원본 — 로케일 무관, ko/en 요약을 **둘 다** 싣는다.
 *
 * ⚠️ 이 그대로 클라이언트 컴포넌트(CityExplorer)에 넘기지 마라 — props 직렬화에
 *    두 언어가 다 실려 EN 페이지 HTML 에 한국어 원문이 새어 나간다(초기 검증에서
 *    실제로 걸렸다). 로케일을 아는 서버 쪽(`city/[city]/page.tsx`)에서
 *    `displaySummary()` 로 한 언어만 고른 `CityExplorer` 의 `CityPlace` 로 바꿔서 넘긴다.
 */
export interface CityPlaceRaw {
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
  /** 이 장소를 다녀간 채널·영상. 여러 채널이 같은 곳을 갔을 수 있고, 그게 이 페이지의 존재 이유다. */
  sources: PlaceSource[];
}

export interface CityCreator {
  slug: string;
  displayName: string;
  initials: string;
  accentColor: string;
  avatarUrl: string | null;
  placeCount: number;
}

export interface CityDetail {
  slug: string;
  name: string;
  nameEn: string;
  countryCode: string;
  lat: number;
  lng: number;
  defaultZoom: number;
  places: CityPlaceRaw[];
  creators: CityCreator[];
}

export interface CityRow {
  slug: string;
  name: string;
  nameEn: string;
  countryCode: string;
  lat: number;
  lng: number;
  placeCount: number;
  creatorCount: number;
  videoCount: number;
  /** 최근 영상 순 — 지역 인덱스의 필름 스트립이 이 컷들을 쓴다. 제목은 alt 용 원문 그대로 */
  recentVideos: { youtubeId: string; title: string }[];
  types: { type: PlaceType; count: number }[];
}

/**
 * 필터 없는 5개 테이블 스캔 — 목록·상세가 **같은 캐시 항목**을 나눠 쓴다.
 * 로케일 무관한 원본 행만 담는다(`name` 과 `name_en` 을 둘 다 실어 보낸다).
 * 캐시가 JSON 직렬화라 여기서 Map 을 만들면 안 된다 — 아래 `loadGraph` 가 맡는다.
 */
const loadGraphRows = cachePublic(async () => {
  const [{ data: cities }, { data: creators }, { data: videos }, { data: links }, { data: places }] =
    await Promise.all([
      supabase.from("cities").select("id, slug, name, name_en, country_code, lat, lng, default_zoom"),
      supabase.from("creators").select("id, slug, display_name, initials, accent_color, avatar_url"),
      supabase.from("videos").select("id, youtube_video_id, title, creator_id, published_at"),
      supabase.from("video_places").select("video_id, place_id, timestamp_sec"),
      supabase
        .from("places")
        .select(
          "id, slug, name, name_local, place_type, city_id, map_status, lat, lng, address, summary, summary_bullets, price_hint, summary_en, summary_bullets_en, price_hint_en, en_source, google_maps_url, google_place_id, kakao_place_id, naver_place_id",
        )
        .eq("map_status", "confirmed"),
    ]);

  return {
    cities: cities ?? [],
    creators: creators ?? [],
    videos: videos ?? [],
    links: links ?? [],
    places: places ?? [],
  };
}, ["cities:graph"]);

/** 도시 → 확정 장소·채널을 잇는 공통 조회. 목록과 상세가 같은 판정을 쓰게 한다. */
async function loadGraph() {
  const { cities, creators, videos, links, places } = await loadGraphRows();

  const placeById = new Map(places.map((p) => [p.id, p]));
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const creatorById = new Map(creators.map((c) => [c.id, c]));

  return { cities, links, placeById, videoById, creatorById };
}

/** 지역 목록 — 확정 장소가 하나라도 있는 도시만. */
export async function loadCityIndex(): Promise<CityRow[]> {
  const { cities, links, placeById, videoById, creatorById } = await loadGraph();

  const byCity = new Map<
    string,
    {
      places: Set<string>;
      creators: Set<string>;
      videos: Set<string>;
      types: Map<PlaceType, Set<string>>;
    }
  >();
  for (const link of links) {
    const place = placeById.get(link.place_id);
    if (!place) continue;
    const video = videoById.get(link.video_id);
    if (!video || !creatorById.has(video.creator_id)) continue;

    let bucket = byCity.get(place.city_id);
    if (!bucket) {
      bucket = { places: new Set(), creators: new Set(), videos: new Set(), types: new Map() };
      byCity.set(place.city_id, bucket);
    }
    bucket.places.add(place.id);
    bucket.creators.add(video.creator_id);
    bucket.videos.add(video.id);
    // 타입별 개수는 "장소" 기준이다 — 같은 장소가 여러 영상에 나와도 한 번만 센다
    const set = bucket.types.get(place.place_type) ?? new Set<string>();
    set.add(place.id);
    bucket.types.set(place.place_type, set);
  }

  return cities
    .map((c) => {
      const bucket = byCity.get(c.id);
      if (!bucket) return null;
      const recentVideos = [...bucket.videos]
        .map((id) => videoById.get(id)!)
        .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
        .slice(0, 4)
        .map((v) => ({ youtubeId: v.youtube_video_id, title: v.title }));
      return {
        slug: c.slug,
        name: c.name,
        nameEn: c.name_en,
        countryCode: c.country_code,
        lat: c.lat,
        lng: c.lng,
        placeCount: bucket.places.size,
        creatorCount: bucket.creators.size,
        videoCount: bucket.videos.size,
        recentVideos,
        types: [...bucket.types.entries()]
          .map(([type, ids]) => ({ type, count: ids.size }))
          .sort((a, b) => b.count - a.count),
      } satisfies CityRow;
    })
    .filter((r): r is CityRow => r !== null && r.placeCount >= MIN_CONFIRMED_PINS)
    .sort((a, b) => b.placeCount - a.placeCount);
}

/** 도시 하나 — 지도에 올릴 장소 전부와 그 출처 채널·영상. */
export async function loadCityDetail(citySlug: string): Promise<CityDetail | null> {
  const { cities, links, placeById, videoById, creatorById } = await loadGraph();
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) return null;

  const byPlace = new Map<string, PlaceSource[]>();
  for (const link of links) {
    const place = placeById.get(link.place_id);
    if (!place || place.city_id !== city.id) continue;
    // 좌표가 없으면 지도에 못 올린다 — 이 페이지는 지도가 본체다
    if (place.lat === null || place.lng === null) continue;
    const video = videoById.get(link.video_id);
    if (!video) continue;
    const creator = creatorById.get(video.creator_id);
    if (!creator) continue;

    const list = byPlace.get(place.id) ?? [];
    list.push({
      creatorSlug: creator.slug,
      creatorName: creator.display_name,
      initials: creator.initials,
      accentColor: creator.accent_color,
      avatarUrl: creator.avatar_url,
      youtubeId: video.youtube_video_id,
      videoTitle: video.title,
      timestampSec: link.timestamp_sec,
    });
    byPlace.set(place.id, list);
  }
  if (byPlace.size === 0) return null;

  const places: CityPlaceRaw[] = [...byPlace.entries()]
    .map(([placeId, sources]) => {
      const p = placeById.get(placeId)!;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        nameLocal: p.name_local,
        placeType: p.place_type,
        lat: p.lat!,
        lng: p.lng!,
        address: p.address,
        summary: p.summary,
        summaryBullets: p.summary_bullets ?? [],
        priceHint: p.price_hint,
        summaryEn: p.summary_en,
        summaryBulletsEn: p.summary_bullets_en ?? [],
        priceHintEn: p.price_hint_en,
        enSource: p.en_source,
        mapUrl:
          primaryMapLink({
            googleMapsUrl: p.google_maps_url,
            googlePlaceId: p.google_place_id,
            kakaoPlaceId: p.kakao_place_id,
            naverPlaceId: p.naver_place_id,
            lat: p.lat,
            lng: p.lng,
          })?.url ?? null,
        // 같은 장소를 여러 영상이 가리키면 이른 시각이 먼저 — 목록 순서가 매번 흔들리지 않게
        sources: sources.sort((a, b) => (a.timestampSec ?? 0) - (b.timestampSec ?? 0)),
      } satisfies CityPlaceRaw;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const creatorCount = new Map<string, CityCreator>();
  for (const place of places) {
    for (const s of place.sources) {
      const hit = creatorCount.get(s.creatorSlug);
      if (hit) continue; // 아래에서 장소 기준으로 다시 센다
      creatorCount.set(s.creatorSlug, {
        slug: s.creatorSlug,
        displayName: s.creatorName,
        initials: s.initials,
        accentColor: s.accentColor,
        avatarUrl: s.avatarUrl,
        placeCount: 0,
      });
    }
  }
  for (const [slug, row] of creatorCount) {
    row.placeCount = places.filter((p) => p.sources.some((s) => s.creatorSlug === slug)).length;
  }

  return {
    slug: city.slug,
    name: city.name,
    nameEn: city.name_en,
    countryCode: city.country_code,
    lat: city.lat,
    lng: city.lng,
    defaultZoom: city.default_zoom,
    places,
    creators: [...creatorCount.values()].sort((a, b) => b.placeCount - a.placeCount),
  };
}

/**
 * 홈 캔버스용 핀 — 도시 지도와 같은 확정 장소.
 * 좌표가 비어 있으면 구글 지도 링크에서 읽고, 그래도 없으면 올린다.
 */
export interface HomeMapPlace {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PlaceType;
  lat: number;
  lng: number;
  address: string | null;
  mapUrl: string | null;
  citySlug: string;
  cityName: string;
  cityNameEn: string | null;
  countryCode: string;
  summary: SummaryDisplay;
  sources: PlaceSource[];
  searchText: string;
}

function placeCoords(p: { lat: number | null; lng: number | null; google_maps_url: string | null }) {
  if (p.lat !== null && p.lng !== null) return { lat: p.lat, lng: p.lng };
  return coordsFromMapsUrl(p.google_maps_url);
}

export async function loadHomeMap(locale: Locale): Promise<HomeMapPlace[]> {
  const { cities, links, placeById, videoById, creatorById } = await loadGraph();
  const publishedCities = new Set((await loadCityIndex()).map((c) => c.slug));
  const cityById = new Map(cities.map((c) => [c.id, c]));

  const byPlace = new Map<string, PlaceSource[]>();
  for (const link of links) {
    const place = placeById.get(link.place_id);
    if (!place) continue;
    const city = cityById.get(place.city_id);
    if (!city || !publishedCities.has(city.slug)) continue;
    if (!placeCoords(place)) continue;
    const video = videoById.get(link.video_id);
    if (!video) continue;
    const creator = creatorById.get(video.creator_id);
    if (!creator) continue;
    const list = byPlace.get(place.id) ?? [];
    list.push({
      creatorSlug: creator.slug,
      creatorName: creator.display_name,
      initials: creator.initials,
      accentColor: creator.accent_color,
      avatarUrl: creator.avatar_url,
      youtubeId: video.youtube_video_id,
      videoTitle: video.title,
      timestampSec: link.timestamp_sec,
    });
    byPlace.set(place.id, list);
  }

  const out: HomeMapPlace[] = [];
  for (const [placeId, sources] of byPlace) {
    const p = placeById.get(placeId)!;
    const city = cityById.get(p.city_id)!;
    const coords = placeCoords(p)!;
    const summary = displaySummary(
      {
        summary: p.summary,
        summaryBullets: p.summary_bullets ?? [],
        priceHint: p.price_hint,
        summaryEn: p.summary_en,
        summaryBulletsEn: p.summary_bullets_en ?? [],
        priceHintEn: p.price_hint_en,
        enSource: p.en_source,
      },
      locale,
    );
    const searchText = [
      p.name,
      p.name_local,
      city.name,
      city.name_en,
      p.place_type,
      p.address,
      ...(p.summary_bullets ?? []),
      ...sources.map((s) => `${s.creatorName} ${s.creatorSlug} ${s.videoTitle}`),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    out.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameLocal: p.name_local,
      placeType: p.place_type,
      lat: coords.lat,
      lng: coords.lng,
      address: p.address,
      mapUrl:
        primaryMapLink({
          googleMapsUrl: p.google_maps_url,
          googlePlaceId: p.google_place_id,
          kakaoPlaceId: p.kakao_place_id,
          naverPlaceId: p.naver_place_id,
          lat: coords.lat,
          lng: coords.lng,
        })?.url ?? null,
      citySlug: city.slug,
      cityName: city.name,
      cityNameEn: city.name_en,
      countryCode: city.country_code,
      summary,
      sources: sources.sort((a, b) => (a.timestampSec ?? 0) - (b.timestampSec ?? 0)),
      searchText,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
