/**
 * 종류(카테고리) 축 로더 — "맛집부터 / 숙소부터" 진입.
 *
 * 지역·채널과 같은 데이터를 유형으로 자른다. 전역 지도는 `/map`, 여기 인덱스는 SEO·목록용.
 * 이 축이 세 번째 메뉴다. 상세는 도시별 묶음 + 도시 지도·채널 조각 링크로 이어진다.
 */

import { supabase } from "@/shared/api/supabase";
import { cache as reactCache } from "react";
import { cachePublic } from "@/shared/api/cache";
import { fetchAll } from "@/shared/api/chunked-in";
import type { PlaceType } from "@/shared/api/database.types";
import { primaryMapLink } from "@/shared/lib/map-links";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";

export interface TypeRow {
  type: PlaceType;
  placeCount: number;
  cityCount: number;
  creatorCount: number;
  videoCount: number;
  /** 최근 영상 순 — 종류 인덱스의 컷 스트립이 이 컷들을 쓴다. 제목은 alt 용 원문 그대로 */
  recentVideos: { youtubeId: string; title: string }[];
  /** 이 종류가 도시별로 어떻게 갈렸는지 — 많은 순. 인덱스에서 분포를 보여줄 때 쓴다 */
  cities: { slug: string; name: string; nameEn: string; count: number }[];
}

export interface TypePlaceSource {
  creatorSlug: string;
  creatorName: string;
  youtubeId: string;
  videoTitle: string;
  timestampSec: number | null;
}

export interface TypePlace {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  nameEn: string | null;
  placeType: PlaceType;
  address: string | null;
  mapUrl: string | null;
  citySlug: string;
  cityName: string;
  sources: TypePlaceSource[];
}

export interface TypeCityGroup {
  citySlug: string;
  cityName: string;
  cityNameEn: string;
  places: TypePlace[];
}

export interface TypeDetail {
  type: PlaceType;
  placeCount: number;
  cityCount: number;
  groups: TypeCityGroup[];
}

/**
 * 목록·상세가 나눠 쓰는 5테이블 스캔 — 로케일 무관한 원본 행만.
 *
 * **cachePublic 을 떼었다.** 소비자가 전부 아래의 캐시된 함수(loadTypeIndex·
 * loadTypeDetail)뿐인데, unstable_cache 는 중첩되면 **읽기만 우회하고 쓰기는
 * 그대로 한다** — `place-types:graph` 는 한 번도 읽히지 않으면서 MiB 급 객체를
 * 매 미스마다 두 번(측정용·저장용) 직렬화하고 버렸다. 캐시는 파생 결과 쪽에
 * 두는 게 맞다(cities.ts loadGraphRows 와 같은 형태다).
 * reactCache 는 남긴다 — 한 요청에서 두 소비자가 동시에 미스날 때의 중복만 끊는다.
 */
const loadGraph = reactCache(async function loadGraph() {
  const [cities, creators, videos, links, places] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("cities").select("id, slug, name, name_en").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("creators").select("id, slug, display_name").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("videos")
        .select("id, youtube_video_id, title, creator_id, published_at")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("video_places").select("video_id, place_id, timestamp_sec").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("places")
        .select(
          "id, slug, name, name_local, name_en, place_type, city_id, country_code, lat, lng, address, google_maps_url, google_place_id, kakao_place_id, naver_place_id",
        )
        .eq("map_status", "confirmed")
        .range(from, to),
    ),
  ]);

  return { cities, creators, videos, links, places };
});

/** 종류 목록 — 확정 장소가 있는 유형만, FILTERABLE 순.
 *  행만이 아니라 **파생 결과**를 캐시한다 — 그래프 순회가 요청마다 다시 돌 이유가 없다. */
export const loadTypeIndex = cachePublic(async function loadTypeIndex(): Promise<TypeRow[]> {
  const { cities, creators, videos, links, places } = await loadGraph();
  if (places.length === 0) return [];

  const creatorById = new Map(creators.map((c) => [c.id, c]));
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const cityById = new Map(cities.map((c) => [c.id, c]));
  // links 루프마다 places 를 훑던 O(n²) 를 끊는다 (링크 수 × 확정 장소 수)
  const placeIds = new Set(places.map((p) => p.id));

  // place → has at least one linked creator (공개 근거)
  const placeCreators = new Map<string, Set<string>>();
  for (const link of links) {
    const video = videoById.get(link.video_id);
    if (!video || !creatorById.has(video.creator_id)) continue;
    if (!placeIds.has(link.place_id)) continue;
    let set = placeCreators.get(link.place_id);
    if (!set) placeCreators.set(link.place_id, (set = new Set()));
    set.add(video.creator_id);
  }

  // place → 그 장소가 나온 영상들 (컷 스트립의 재료)
  const placeVideos = new Map<string, Set<string>>();
  for (const link of links) {
    const video = videoById.get(link.video_id);
    if (!video || !creatorById.has(video.creator_id)) continue;
    let set = placeVideos.get(link.place_id);
    if (!set) placeVideos.set(link.place_id, (set = new Set()));
    set.add(video.id);
  }

  const typeOfPlace = new Map(places.map((p) => [p.id, p.place_type as PlaceType]));

  /* 아래 recentVideos 의 가중치(= 그 영상이 이 종류의 장소를 몇 곳 다녔나)를
     links 를 **한 번만** 훑어 미리 집계한다. 예전엔 후보 영상마다 links 전체를
     filter 해서 (영상 수 × 링크 수) 였다. */
  const weightByVideo = new Map<string, Map<PlaceType, number>>();
  for (const link of links) {
    const t = typeOfPlace.get(link.place_id);
    if (!t) continue;
    let byT = weightByVideo.get(link.video_id);
    if (!byT) weightByVideo.set(link.video_id, (byT = new Map()));
    byT.set(t, (byT.get(t) ?? 0) + 1);
  }

  const byType = new Map<
    PlaceType,
    {
      places: Set<string>;
      cities: Map<string, number>;
      creators: Set<string>;
      videos: Set<string>;
    }
  >();

  for (const p of places) {
    if (!placeCreators.has(p.id)) continue;
    if (!cityById.has(p.city_id)) continue;
    const type = p.place_type as PlaceType;
    if (!FILTERABLE_TYPES.includes(type)) continue;
    let bucket = byType.get(type);
    if (!bucket) {
      bucket = { places: new Set(), cities: new Map(), creators: new Set(), videos: new Set() };
      byType.set(type, bucket);
    }
    bucket.places.add(p.id);
    bucket.cities.set(p.city_id, (bucket.cities.get(p.city_id) ?? 0) + 1);
    for (const cid of placeCreators.get(p.id)!) bucket.creators.add(cid);
    for (const vid of placeVideos.get(p.id) ?? []) bucket.videos.add(vid);
  }

  return FILTERABLE_TYPES.map((type) => {
    const b = byType.get(type);
    if (!b || b.places.size === 0) return null;
    return {
      type,
      placeCount: b.places.size,
      cityCount: b.cities.size,
      creatorCount: b.creators.size,
      videoCount: b.videos.size,
      /* 최근순이 아니라 **대표성순**이다. 최근순으로 뽑으면 한 영상이 여러 종류의
         컷을 동시에 차지한다 — 실제로 '일본 1박 만원숙소' 한 편이 명소·숙소 양쪽의
         첫 컷이 됐다. 그 영상 안에서 이 종류의 장소를 몇 곳 다녔는지로 먼저 줄을
         세우면, 종류마다 그 종류를 가장 많이 다룬 편이 앞으로 온다. */
      recentVideos: [...b.videos]
        .map((id) => videoById.get(id)!)
        .map((v) => ({ v, weight: weightByVideo.get(v.id)?.get(type) ?? 0 }))
        .sort(
          (a, b2) =>
            b2.weight - a.weight ||
            (b2.v.published_at ?? "").localeCompare(a.v.published_at ?? ""),
        )
        .slice(0, 4)
        .map(({ v }) => ({ youtubeId: v.youtube_video_id, title: v.title })),
      cities: [...b.cities.entries()]
        .map(([cityId, count]) => {
          const c = cityById.get(cityId)!;
          return { slug: c.slug, name: c.name, nameEn: c.name_en, count };
        })
        .sort((a, b2) => b2.count - a.count),
    } satisfies TypeRow;
  }).filter((r): r is TypeRow => r !== null);
}, ["place-types:index"]);

/** 한 종류의 장소 — 도시별 그룹.
 *  인자(type)는 unstable_cache 가 키에 자동 포함한다 — 종류별 항목. */
export const loadTypeDetail = cachePublic(async function loadTypeDetail(
  type: PlaceType,
): Promise<TypeDetail | null> {
  if (!FILTERABLE_TYPES.includes(type)) return null;

  const { cities, creators, videos, links, places } = await loadGraph();
  const ofType = places.filter((p) => p.place_type === type);
  if (ofType.length === 0) return null;

  const cityById = new Map(cities.map((c) => [c.id, c]));
  const creatorById = new Map(creators.map((c) => [c.id, c]));
  const videoById = new Map(videos.map((v) => [v.id, v]));
  // links 루프마다 ofType 을 훑던 O(n²) 를 끊는다
  const ofTypeIds = new Set(ofType.map((p) => p.id));

  const sourcesByPlace = new Map<string, TypePlaceSource[]>();
  for (const link of links) {
    if (!ofTypeIds.has(link.place_id)) continue;
    const video = videoById.get(link.video_id);
    if (!video) continue;
    const creator = creatorById.get(video.creator_id);
    if (!creator) continue;
    const list = sourcesByPlace.get(link.place_id) ?? [];
    list.push({
      creatorSlug: creator.slug,
      creatorName: creator.display_name,
      youtubeId: video.youtube_video_id,
      videoTitle: video.title,
      timestampSec: link.timestamp_sec,
    });
    sourcesByPlace.set(link.place_id, list);
  }

  const byCity = new Map<string, TypePlace[]>();
  for (const p of ofType) {
    const sources = sourcesByPlace.get(p.id);
    if (!sources || sources.length === 0) continue;
    const city = cityById.get(p.city_id);
    if (!city) continue;
    const map = primaryMapLink({
      googleMapsUrl: p.google_maps_url,
      googlePlaceId: p.google_place_id,
      kakaoPlaceId: p.kakao_place_id,
      naverPlaceId: p.naver_place_id,
      lat: p.lat,
      lng: p.lng,
      countryCode: p.country_code,
    });
    const row: TypePlace = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameLocal: p.name_local,
      nameEn: p.name_en,
      placeType: p.place_type as PlaceType,
      address: p.address,
      mapUrl: map?.url ?? null,
      citySlug: city.slug,
      cityName: city.name,
      sources,
    };
    const list = byCity.get(city.id) ?? [];
    list.push(row);
    byCity.set(city.id, list);
  }

  if (byCity.size === 0) return null;

  const groups: TypeCityGroup[] = [...byCity.entries()]
    .map(([cityId, cityPlaces]) => {
      const city = cityById.get(cityId)!;
      return {
        citySlug: city.slug,
        cityName: city.name,
        cityNameEn: city.name_en,
        places: cityPlaces.sort((a, b) => a.name.localeCompare(b.name, "ko")),
      };
    })
    .sort((a, b) => b.places.length - a.places.length);

  return {
    type,
    placeCount: groups.reduce((s, g) => s + g.places.length, 0),
    cityCount: groups.length,
    groups,
  };
}, ["place-types:detail"]);

export function parsePlaceType(raw: string): PlaceType | null {
  return (FILTERABLE_TYPES as string[]).includes(raw) ? (raw as PlaceType) : null;
}
