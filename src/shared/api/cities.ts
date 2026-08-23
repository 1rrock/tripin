import { supabase } from "@/shared/api/supabase";
import { cache as reactCache } from "react";
import { cachePublic } from "@/shared/api/cache";
import type { PlaceCelebrity } from "@/shared/api/celebs";
import { fetchAll } from "@/shared/api/chunked-in";
import type { PlaceType } from "@/shared/api/database.types";
import { mapLinks, type MapLink } from "@/shared/lib/map-links";
/* 인덱스를 푸는 쪽은 클라이언트(HomeCanvas)와 여기 둘이다. 그래서 디코더는
   supabase 를 끌고 오는 이 파일이 아니라 map-filters.ts 에 산다 — 타입만
   여기서 가져간다(`import type` 은 지워지므로 순환 참조가 아니다). */
import { decodeMapIndex, decodeMapPin } from "@/shared/lib/map-filters";
import { coordsFromMapsUrl } from "@/shared/lib/resolve-google-place";
import { MIN_CITY_PINS } from "@/shared/config/publish";
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
  /** 열 수 있는 지도 앱 전부 — 첫 번째가 그 나라의 기본(shared/lib/map-links.ts) */
  mapLinks: MapLink[];
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
 * 필터 없는 5개 테이블 스캔 — 목록·상세가 이 결과를 나눠 쓴다. 캐시는 여기가
 * 아니라 소비자들의 **파생 항목**(`cities:index`·`cities:detail`·
 * `map:canvas-index`·`map:detail-index`)에 있다.
 * 로케일 무관한 원본 행만 담는다(`name` 과 `name_en` 을 둘 다 실어 보낸다).
 */
/* **일부러 cachePublic 으로 안 감싼다** — 아래 loadHomeMap 과 같은 이유다.
   최상위 호출자가 0이고(소비자가 전부 이 파일 안의 다른 cachePublic 함수다),
   unstable_cache 는 **중첩되면 읽기만 우회하고 쓰기는 그대로 한다** — 즉
   `cities:graph` 는 한 번도 읽히지 않으면서 MiB 급 객체를 크기 측정용 + 저장용
   으로 매 요청 두 번 JSON.stringify 하고 버리기만 했다.
   reactCache 는 남긴다: 같은 요청에서 소비자 둘(loadCityIndex·loadMapCreators 등)이
   동시에 미스날 때 이 5테이블 스캔이 2회 도는 것을 끊는다(실측 1.7초). 라우트
   핸들러에서는 no-op 일 수 있으므로, 핸들러 경로는 loadHomeMap 쪽에서 중첩
   호출 자체를 없애는 것으로 따로 막는다(publishedCityIds 인라인 유도). */
const loadGraphRows = reactCache(async function loadGraphRows() {
  const [cities, creators, videos, links, places] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("cities")
        .select("id, slug, name, name_en, country_code, lat, lng, default_zoom")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("creators")
        .select("id, slug, display_name, initials, accent_color, avatar_url")
        .range(from, to),
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
          "id, slug, name, name_local, place_type, city_id, country_code, map_status, lat, lng, address, summary, summary_bullets, price_hint, summary_en, summary_bullets_en, price_hint_en, en_source, google_maps_url, google_place_id, kakao_place_id, naver_place_id",
        )
        .eq("map_status", "confirmed")
        .range(from, to),
    ),
  ]);

  return { cities, creators, videos, links, places };
});

/** 도시 → 확정 장소·채널을 잇는 공통 조회. 목록과 상세가 같은 판정을 쓰게 한다. */
const loadGraph = reactCache(async function loadGraph() {
  const { cities, creators, videos, links, places } = await loadGraphRows();

  const placeById = new Map(places.map((p) => [p.id, p]));
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const creatorById = new Map(creators.map((c) => [c.id, c]));

  return { cities, links, placeById, videoById, creatorById };
});

/** 지역 목록 — 확정 장소가 하나라도 있는 도시만.
 *  행(loadGraphRows)만이 아니라 **파생 결과**도 캐시한다 — 그래프 순회와
 *  Map 구성이 요청마다 다시 돌면 TTFB 에 수십 ms 씩 얹힌다. */
export const loadCityIndex = cachePublic(async function loadCityIndex(): Promise<CityRow[]> {
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
    .filter((r): r is CityRow => r !== null && r.placeCount >= MIN_CITY_PINS)
    .sort((a, b) => b.placeCount - a.placeCount);
}, ["cities:index"]);

/** 도시 하나 — 지도에 올릴 장소 전부와 그 출처 채널·영상.
 *  인자(citySlug)는 unstable_cache 가 키에 자동 포함한다 — 도시별 항목. */
export const loadCityDetail = cachePublic(async function loadCityDetail(
  citySlug: string,
): Promise<CityDetail | null> {
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
        mapLinks: mapLinks({
          googleMapsUrl: p.google_maps_url,
          googlePlaceId: p.google_place_id,
          kakaoPlaceId: p.kakao_place_id,
          naverPlaceId: p.naver_place_id,
          lat: p.lat,
          lng: p.lng,
          countryCode: p.country_code,
        }),
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
}, ["cities:detail"]);

/**
 * 홈 캔버스용 핀 — 도시 지도와 같은 확정 장소.
 * 좌표가 비어 있으면 구글 지도 링크에서 읽고, 그래도 없으면 올린다.
 *
 * 이 타입은 이제 파일 밖으로 안 나간다. `loadMapCanvasIndex`(목록·핀)와
 * `loadMapPlace`(드로어) 두 캐시의 재료일 뿐이다. 여기 필드를 늘리면 그 두
 * 캐시 항목이 같이 무거워지고, 드로어 첫 열기가 그만큼 늦어진다.
 */
/**
 * ⚠️ **이 타입은 2MiB 짜리 파생 캐시 항목들의 재료다 — 필드 하나가 1,845배로 불어난다.**
 *    직접 캐시(`cities:home-map`)는 2026-08-23 에 없앴다: 상한(2MiB)의 93.7%
 *    까지 차 있었는데, 소비자 전부가 자기 `cachePublic` 안에서 부르는 탓에
 *    중첩 우회로 실효도 없었다(unstable_cache 는 중첩되면 안쪽을 건너뛴다).
 *    지금 상한을 견디는 것은 파생 항목들이다 — `map:detail-index`(72%),
 *    `places:slug-index`. 상한을 넘으면 Next 가 **조용히 캐시를 포기한다** —
 *    빌드 로그에 "items over 2MB can not be cached" 한 줄만 남고 그 뒤로는
 *    요청마다 풀스캔이다. 실제로 `createdAt`·`updatedAt` 를 얹었다가 2.11MB 로
 *    캐시가 꺼진 적이 있다(타임스탬프는 places.ts 의 경량 로더로 뺐다).
 *    필드를 늘려야 하면 먼저 다른 필드를 빼라 — cachePublic 이 80% 부터
 *    함수 로그에 `[cachePublic]` 경고를 남긴다(cache.ts).
 */
export interface HomeMapPlace {
  id: string;
  /** `/place/[slug]` 의 주소. `MapCanvasPlace` 도 이제 이걸 싣는다 — 목록 행이
   *  진짜 `<a href>` 가 됐다(아래 `MapCanvasPlace` 주석의 수치 참조). */
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PlaceType;
  lat: number;
  lng: number;
  address: string | null;
  mapLinks: MapLink[];
  citySlug: string;
  cityName: string;
  cityNameEn: string | null;
  countryCode: string;
  summary: SummaryDisplay;
  sources: PlaceSource[];
  youtubeId: string | null;
}

/**
 * `/map` 첫 페인트용 — 상세(요약·출처 영상)는 드로어를 열 때 따로 받는다.
 * 1665곳 전체를 HomeMapPlace 로 실으면 HTML 이 460KB 를 넘고 Lighthouse 가
 * FullPageScreenshot 에서 타임아웃 난다.
 *
 * 여기 없는 것은 일부러 없다. 컷의 alt 로만 쓰이던 `youtubeTitle` 이 그렇다.
 * 늘리기 전에 1,898을 곱해 보고, 정말 목록·핀·필터에 필요한지 따져라.
 *
 * **`slug` 는 2026-08-23 에 다시 실었다.** 예전 주석은 "캔버스가 안 읽는다" 며
 * `youtubeTitle` 과 함께 뺐고(그때 gzip 213KB → 129KB), 그 전제가 맞았다 —
 * 목록 행이 `<button onClick>` 이라 주소가 필요 없었으니까. 행을 `PlaceRowLink`
 * (진짜 `<a href>`)로 바꾸면서 전제가 바뀌었다: `/map` 은 1,898곳을 싣고도
 * 장소로 가는 내부 링크가 **하나도** 없었고, 크롤러에게는 사이트맵뿐이었다.
 *
 * 값은 정직하게 적는다 — slug 는 공짜가 아니다(실측, 1,898곳):
 *   · raw   221KB → 281KB  (+59KB)
 *   · gzip  112KB → 136KB  (+24KB)
 *   · brotli 91KB → 107KB  (+16KB)
 * 정규화 전 이 인덱스는 gzip 148KB 였으니 slug 를 도로 실어도 그보다는 가볍다.
 * 다만 옛 주석의 129KB 보다는 **무겁다** — 그 129KB 는 애초에 slug 를 뺀 뒤의
 * 값이라 비교 대상이 아니다. slug 가 실제로 실려 있던 마지막 값은 213KB 였다.
 * 내부 링크와 ⌘클릭을 그 +24KB 로 산 것이고, SEO 가 본업인 제품에서 산 값이다.
 *
 * ⚠️ 이건 **클라이언트가 손에 드는 모양**이지 회선을 타는 모양이 아니다.
 *    회선은 `MapIndexPayload`(정규화) 이고 `decodeMapIndex` 가 이 모양으로
 *    되세운다. 여기 필드를 늘리면 전송 형태도 같이 늘려야 한다.
 */
export type MapCanvasPlace = MapCanvasPin & {
  /** 필터가 훑는 건초더미. **회선으로는 안 온다** — `decodeMapIndex` 가 같은
   *  응답의 사전에서 조립한다(map-filters.ts `mapSearchText` 주석). */
  searchText: string;
};

/** 검색어를 뺀 핀 — 드로어(`/api/map/place/[id]`)가 받는 것이 정확히 이만큼이다. */
export type MapCanvasPin = {
  id: string;
  name: string;
  /** `/place/[slug]` 의 주소 — 목록 행의 `href`. `placePath()` 로 인코딩해서 쓸 것. */
  slug: string;
  nameLocal: string | null;
  placeType: PlaceType;
  lat: number;
  lng: number;
  citySlug: string;
  cityName: string;
  cityNameEn: string | null;
  countryCode: string;
  youtubeId: string | null;
  sources: { creatorSlug: string }[];
};

/**
 * `/api/map/index` 의 전송 형태 — **정규화**된 인덱스.
 *
 * 예전엔 `MapCanvasPlace[]` 를 그대로 실어 727KB(gzip 147KB)였다. 바이트를
 * 재 보니 절반이 같은 값의 반복이었다:
 *   · `searchText` 16.5% — 같은 객체의 다른 필드를 이어붙인 것(중복 그 자체)
 *   · 도시 4필드 23.3% — 서로 다른 도시는 132개뿐인데 1,845번 실렸다
 *   · `placeType` 7.2% — 서로 다른 값 6개
 *   · `sources[].creatorSlug` 11.8% — 서로 다른 채널 수십 개
 * 그래서 반복되는 것은 사전에 한 번만 싣고, 행은 그 **자리번호**만 든다.
 * 정보는 하나도 안 버렸다 — `decodeMapIndex` 가 원래 객체를 그대로 되세운다.
 *
 * 행을 객체가 아니라 배열로 두는 것도 같은 이유다. 키 이름(`"nameLocal":` …)
 * 이 1,845번 반복되면 그것만으로 100KB 대다. 대신 자리는 **여기 한 곳에서만**
 * 읽고 쓴다 — 쓰는 곳은 `buildMapIndexPayload`, 읽는 곳은 `decodeMapPin` 뿐이다.
 *
 * ⚠️ `cachePublic` 계약: `Map`·`Set`·`Date` 금지(직렬화하면 빈 객체가 된다).
 *    사전은 전부 평범한 배열이다 — 만드는 동안만 `Map` 을 곁에 둔다.
 */
export type MapIndexPayload = {
  /** [citySlug, cityName, cityNameEn, countryCode] */
  cities: [string, string, string | null, string][];
  types: PlaceType[];
  /** [creatorSlug, creatorName] — 이름은 `searchText` 조립에만 쓰인다 */
  creators: [string, string][];
  places: MapIndexRow[];
};

/**
 * [id, name, slug, nameLocal, types 자리, lat, lng, cities 자리, youtubeId, creators 자리들]
 *
 * `slug` 가 `name` **바로 옆**인 것은 우연이 아니다 — slug 는 name 에서 만든
 * 문자열이라(`방노타지마-_lk5`) 둘을 붙여 두면 압축기가 겹치는 부분을 참조로
 * 접는다. 자리를 id 옆으로 옮겨 재 보니 brotli 가 107KB → 109KB 로 늘었다.
 */
export type MapIndexRow = [
  string,
  string,
  string,
  string | null,
  number,
  number,
  number,
  number,
  string | null,
  number[],
];

/** `/map` HTML 에 남기는 목록 앞줄. LCP 썸네일이 문서에서 바로 보이게 한다.
 *  나머지는 `/api/map/index`. 전체가 다시 오면 이 앞줄과 같은 정렬이라 안 바뀐다. */
export const MAP_CANVAS_SEED = 6;

/**
 * `/map` 캔버스 인덱스 — 1,845곳의 핀·이름. `/api/map/index` 가 그대로 준다.
 *
 * 로케일 인자가 없다. 여기 남기는 필드는 전부 원본이고(`cityName` 과
 * `cityNameEn` 을 둘 다 싣는다) 정렬도 `localeCompare("ko")` 로 고정이라,
 * ko/en 이 같은 결과를 본다. 캐시 항목도 하나, CDN 캐시도 하나다.
 *
 * 반환이 `MapCanvasPlace[]` 가 아니라 정규화된 `MapIndexPayload` 다 — 캐시
 * 항목과 회선 페이로드가 **같은 것**이어야 라우트가 재가공 없이 그대로 흘려
 * 보낸다. 소비자가 객체를 원하면 `decodeMapIndex`/`decodeMapPin` 으로 푼다.
 * (2MiB 상한 대비로도 이 방향이 안전하다 — 항목이 727KB → 절반 이하다.)
 */
export const loadMapCanvasIndex = cachePublic(async function loadMapCanvasIndex(): Promise<
  MapIndexPayload
> {
  return buildMapIndexPayload(await loadHomeMap("ko"));
}, ["map:canvas-index"]);

/** `/map` HTML 이 쓰는 앞줄 — 무거운 `loadHomeMap` 대신 위 인덱스만 읽는다.
 *  앞 6줄만 풀면 되므로 사전은 그대로 두고 `places` 만 잘라 넘긴다. */
export async function loadMapCanvasSeed(): Promise<MapCanvasPlace[]> {
  const payload = await loadMapCanvasIndex();
  return decodeMapIndex({ ...payload, places: payload.places.slice(0, MAP_CANVAS_SEED) });
}

/** 캔버스 필터 칩이 읽는 채널 한 줄 — id(구독 토글용)·표시·확정 장소 수. */
export interface MapCreatorChip {
  id: string;
  slug: string;
  displayName: string;
  initials: string;
  accentColor: string;
  avatarUrl: string | null;
  placeCount: number;
}

/**
 * `/map` 의 채널 칩 — 예전엔 이걸 위해 `loadHomeFeed()`(700KB 캐시 항목, 자체
 * 5테이블 스캔)를 통째로 읽고 대부분 필드를 null 로 덮었다. 칩이 실제로 읽는
 * 것은 이 일곱 필드뿐이다. placeCount 는 캔버스 인덱스(이미 캐시)에서 센다 —
 * 새 스캔이 없다.
 */
export const loadMapCreators = cachePublic(async function loadMapCreators(): Promise<
  MapCreatorChip[]
> {
  const [{ creators }, index] = await Promise.all([loadGraphRows(), loadMapCanvasIndex()]);
  const counts = new Map<string, number>();
  /* 행의 채널 자리는 이미 슬러그 기준으로 dedup 되어 있다(buildMapIndexPayload) —
     예전처럼 장소마다 `new Set` 을 다시 만들지 않는다. */
  for (const row of index.places) {
    for (const i of row[9]) {
      const slug = index.creators[i]![0];
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return creators
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      displayName: c.display_name,
      initials: c.initials,
      accentColor: c.accent_color,
      avatarUrl: c.avatar_url,
      placeCount: counts.get(c.slug) ?? 0,
    }))
    .filter((c) => c.placeCount > 0)
    .sort((a, b) => b.placeCount - a.placeCount);
}, ["map:creators"]);

/**
 * 드로어 단독 렌더용 핀 한 줄 — `?place=` 딥링크가 1,845곳 인덱스를 기다리지
 * 않도록, 상세 응답에 이름·좌표·종류를 같이 실어 보낼 때 쓴다.
 * `searchText` 는 안 준다 — 드로어는 필터를 안 돌린다.
 *
 * 훑기는 그대로 선형이다. id → 행 사전을 만들어 볼 수 있지만 **이 자리에서는
 * 손해다**: 라우트가 요청당 이 함수를 딱 한 번 부르고, `unstable_cache` 는 읽을
 * 때마다 페이로드를 새로 역직렬화해 준다. 즉 사전은 매번 새로 만들어야 하고
 * (1,845번 삽입), 그렇게 만든 사전은 조회 한 번에 버려진다 — 평균 900번 읽고
 * 끝나는 `.find()` 보다 느리다. 응답에 id 사전을 실어 보내는 길은 더 나쁘다
 * (UUID 82KB 를 한 번 더 보내는 꼴).
 *
 * 여기서 실제로 줄어든 비용은 훑기가 아니라 **캐시 항목의 `JSON.parse`** 다 —
 * 항목이 730KB → 221KB 라 딥링크 한 번의 파싱이 그만큼 싸졌다.
 */
export async function loadMapCanvasPlace(id: string): Promise<MapCanvasPin | null> {
  const payload = await loadMapCanvasIndex();
  const row = payload.places.find((r) => r[0] === id);
  return row ? decodeMapPin(payload, row) : null;
}

/**
 * `HomeMapPlace[]` → 전송 형태. 반복되는 값을 사전으로 접는다(위 타입 주석).
 *
 * 사전 자리는 **처음 등장한 순서**로 붙는다 — 정렬하지 않는다. 순서가 자료의
 * 뜻을 바꾸지 않고(자리번호는 같은 응답 안에서만 유효하다), 굳이 정렬하면
 * 장소 하나가 늘 때마다 사전 전체가 흔들려 CDN 사본의 diff 만 커진다.
 *
 * 채널은 슬러그 기준으로 dedup 한다 — 예전 `toMapCanvasPlace` 의
 * `[...new Set(p.sources.map((s) => s.creatorSlug))]` 과 같은 판정·같은 순서다.
 */
function buildMapIndexPayload(all: HomeMapPlace[]): MapIndexPayload {
  const cities: MapIndexPayload["cities"] = [];
  const types: PlaceType[] = [];
  const creators: MapIndexPayload["creators"] = [];
  /* Map 은 만드는 동안만 — 반환값에 넣으면 캐시 직렬화에서 빈 객체가 된다 */
  const cityAt = new Map<string, number>();
  const typeAt = new Map<PlaceType, number>();
  const creatorAt = new Map<string, number>();

  const places = all.map((p): MapIndexRow => {
    let ci = cityAt.get(p.citySlug);
    if (ci === undefined) {
      ci = cities.push([p.citySlug, p.cityName, p.cityNameEn, p.countryCode]) - 1;
      cityAt.set(p.citySlug, ci);
    }
    let ti = typeAt.get(p.placeType);
    if (ti === undefined) {
      ti = types.push(p.placeType) - 1;
      typeAt.set(p.placeType, ti);
    }
    const sources: number[] = [];
    const seen = new Set<string>();
    for (const s of p.sources) {
      if (seen.has(s.creatorSlug)) continue;
      seen.add(s.creatorSlug);
      let idx = creatorAt.get(s.creatorSlug);
      if (idx === undefined) {
        idx = creators.push([s.creatorSlug, s.creatorName]) - 1;
        creatorAt.set(s.creatorSlug, idx);
      }
      sources.push(idx);
    }
    return [p.id, p.name, p.slug, p.nameLocal, ti, p.lat, p.lng, ci, p.youtubeId, sources];
  });

  return { cities, types, creators, places };
}

export type MapPlaceDetail = {
  /** `/place/[slug]` 공유 링크용 — 캔버스 인덱스는 slug 를 안 실으므로(위 주석)
      `/map` 드로어는 여기서만 받는다. 항목당 ~30B, 전체 ~55KB — 2MB 상한 대비 계산함. */
  slug: string;
  address: string | null;
  summary: SummaryDisplay;
  mapLinks: MapLink[];
  sources: PlaceSource[];
  /**
   * 이 장소를 다녀간 연예인 — 캐시된 인덱스에는 **넣지 않는다**(위 2MB 상한
   * 주석). `/api/map/place/[id]` 라우트가 응답 직전에 celebs.ts 로 따로 조회해
   * 붙이고, CDN s-maxage 가 실질 캐시 역할을 한다. 인덱스 유래 객체에는 없다.
   */
  celebrities?: PlaceCelebrity[];
};

/**
 * 드로어가 읽는 상세를 id 로 찾아 쓰는 한 덩이. `loadMapCanvasIndex` 와 같은 꼴이다.
 *
 * ⚠️ **캐시된 함수를 캐시된 함수 안에서 부르면 안쪽은 캐시를 안 탄다.**
 *    Next 가 바깥이 miss 인 동안 안쪽 `unstable_cache` 를 그냥 실행해 버린다.
 *    그래서 `loadMapPlace` 를 `cachePublic` 으로 감쌌더니 처음 여는 장소마다
 *    `loadHomeMap → loadGraph` 가 통째로 다시 돌아 **1.6초** 가 나왔다
 *    (loadGraph 800ms + loadCityIndex 800ms, 실측).
 *
 *    그래서 `loadMapPlace` 는 캐시하지 않는다. 캐시는 이 인덱스 하나뿐이고,
 *    라우트가 **맨 바깥에서** 부르므로 진짜 캐시 히트가 난다. 같은 이유로
 *    `/api/map/index` 가 8ms 다.
 */
const loadMapDetailIndex = cachePublic(async function loadMapDetailIndex(
  locale: Locale,
): Promise<Record<string, MapPlaceDetail>> {
  const all = await loadHomeMap(locale);
  const out: Record<string, MapPlaceDetail> = {};
  for (const p of all) {
    out[p.id] = {
      slug: p.slug,
      address: p.address,
      summary: p.summary,
      mapLinks: p.mapLinks,
      sources: p.sources,
    };
  }
  return out;
}, ["map:detail-index"]);

/** 캐시하지 마라 — 위 주석의 이유로, 감싸는 순간 인덱스가 캐시를 못 탄다. */
export async function loadMapPlace(id: string, locale: Locale): Promise<MapPlaceDetail | null> {
  const index = await loadMapDetailIndex(locale);
  return index[id] ?? null;
}

function placeCoords(p: { lat: number | null; lng: number | null; google_maps_url: string | null }) {
  if (p.lat !== null && p.lng !== null) return { lat: p.lat, lng: p.lng };
  return coordsFromMapsUrl(p.google_maps_url);
}

/**
 * **일부러 cachePublic 으로 안 감싼다.** 소비자 여섯(캔버스·드로어·장소·사이트맵·
 * RSS 인덱스)이 전부 자기 `cachePublic` 안에서 부르는데, unstable_cache 는
 * 중첩되면 안쪽을 우회하므로 여기 캐시는 어차피 안 읽혔다 — 2MiB 상한의 93.7%
 * 를 차지하는 폭탄이기만 했다(HomeMapPlace 주석). 진짜 캐시는 소비자들의
 * 파생 항목이고, 여기는 캐시된 `loadGraph` 위의 매핑(~100ms)일 뿐이다.
 * reactCache 는 같은 렌더에서 소비자 둘이 동시에 미스날 때 매핑 중복만 끊는다.
 */
export const loadHomeMap = reactCache(async function loadHomeMap(
  locale: Locale,
): Promise<HomeMapPlace[]> {
  const { cities, links, placeById, videoById, creatorById } = await loadGraph();
  /* ⚠️ 여기서 `loadCityIndex()` 를 부르면 안 된다 — unstable_cache 는 중첩되면
     안쪽 캐시를 우회해서, 이 함수의 미스 한 번에 전수 스캔이 **2회** 돌았다
     (실측 1.72초). 공개 도시 판정(확정 장소 MIN_CITY_PINS 곳 이상)은 이미 손에
     든 그래프에서 그대로 유도한다 — loadCityIndex:217 과 같은 판정이다. */
  const cityPlaceIds = new Map<string, Set<string>>();
  for (const link of links) {
    const place = placeById.get(link.place_id);
    if (!place) continue;
    const video = videoById.get(link.video_id);
    if (!video || !creatorById.has(video.creator_id)) continue;
    let set = cityPlaceIds.get(place.city_id);
    if (!set) {
      set = new Set();
      cityPlaceIds.set(place.city_id, set);
    }
    set.add(place.id);
  }
  const publishedCityIds = new Set(
    [...cityPlaceIds].filter(([, ids]) => ids.size >= MIN_CITY_PINS).map(([id]) => id),
  );
  const cityById = new Map(cities.map((c) => [c.id, c]));

  const byPlace = new Map<string, PlaceSource[]>();
  for (const link of links) {
    const place = placeById.get(link.place_id);
    if (!place) continue;
    const city = cityById.get(place.city_id);
    if (!city || !publishedCityIds.has(city.id)) continue;
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
    out.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameLocal: p.name_local,
      placeType: p.place_type,
      lat: coords.lat,
      lng: coords.lng,
      address: p.address,
      mapLinks: mapLinks({
        googleMapsUrl: p.google_maps_url,
        googlePlaceId: p.google_place_id,
        kakaoPlaceId: p.kakao_place_id,
        naverPlaceId: p.naver_place_id,
        lat: coords.lat,
        lng: coords.lng,
        countryCode: p.country_code,
      }),
      citySlug: city.slug,
      cityName: city.name,
      cityNameEn: city.name_en,
      countryCode: city.country_code,
      summary,
      sources: sources.sort((a, b) => (a.timestampSec ?? 0) - (b.timestampSec ?? 0)),
      youtubeId: sources[0]?.youtubeId ?? null,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
});
