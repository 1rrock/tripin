import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import { chunkedIn } from "@/shared/api/chunked-in";
import type { EnSource } from "@/shared/i18n/display";
import type { PublicPlace, RelatedPiece } from "./Explorer";

/**
 * 조각(채널×도시)의 서버 로더.
 *
 * `page.tsx` 안에 있던 것을 여기로 뺐다 — 이제 `layout.tsx`(존재 판정), `page.tsx`,
 * `generateMetadata` 셋이 같은 로더를 부른다. page 파일은 Next 가 export 를
 * 검사하므로 로더를 거기서 재수출할 수 없다.
 *
 * anon 클라이언트 → RLS 가 공개(is_published) 데이터만 내려준다.
 */

export interface PageParams {
  creator: string;
  city: string;
}

/**
 * 캐시에 로케일을 넣지 않는다 — 도시명은 `name`·`name_en` 을 그대로 실어 보내고
 * 표시 문자열은 호출부에서 고른다. 그래야 EN 요청이 KO 캐시를 맞지 않는다.
 */
export interface RelatedCityRow {
  slug: string;
  name: string;
  nameEn: string | null;
  count: number;
}

/**
 * 로더가 돌려주는 장소 원본 — ko/en 요약을 **둘 다** 싣는다(로케일 무관, 캐시 규칙).
 * `PublicPlace`(Explorer.tsx) 와 다르다 — 그건 로케일로 이미 확정된 표시용 형태다.
 * 이 원본을 그대로 Explorer(클라이언트)에 넘기면 props 직렬화로 EN 페이지 HTML 에
 * 한국어 원문이 새어 나간다. `CreatorCityPage` 가 로케일을 안 뒤 `displaySummary()` 로 변환한다.
 */
export interface LoadedPlace {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PublicPlace["placeType"];
  mapStatus: PublicPlace["mapStatus"];
  lat: number | null;
  lng: number | null;
  address: string | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  kakaoPlaceId: string | null;
  naverPlaceId: string | null;
  /** 지도 앱 링크 순서용 — 이 조각은 도시 하나로 고정이라 city.country_code 를 그대로 쓴다. */
  countryCode: string | null;
  summary: string | null;
  summaryBullets: string[];
  priceHint: string | null;
  summaryEn: string | null;
  summaryBulletsEn: string[];
  priceHintEn: string | null;
  enSource: EnSource;
  videoTitle: string | null;
  youtubeVideoId: string | null;
  timestampSec: number | null;
}

/**
 * 문서에 그리는 **앞줄** 개수. 나머지는 `Explorer` 가 마운트 뒤
 * `/api/city/[city]/c/[creator]` 로 한 번에 받아 갈아 끼운다 — `/map` 이 씨앗
 * 6곳으로 이미 푼 처방(`map/page.tsx`)을 그대로 옮긴 것이다.
 *
 * 왜 36인가. 이 목록의 행은 96px 안팎이고, 가장 긴 화면(데스크톱 좌 패널)이
 * 한 번에 12행을 보여준다. 36 = **세 화면치** — 스크롤을 시작한 사람이 응답을
 * 기다리는 일이 사실상 없는 최소값이다. `/map` 의 6은 지도가 본체인 화면에서나
 * 되는 수고, 목록이 본체인 여기서는 첫 화면도 못 채운다. 위로는 48을 안 넘긴다 —
 * 김사원×서울 296곳이 gzip 105KB 였으니 한 행이 0.3KB 안팎이고, 48행부터는
 * 문서가 다시 40KB 를 넘본다. `/city/[city]`·`/type/[type]` 과 같은 수로 맞췄다.
 *
 * 자르는 자리는 확정/후보를 가리지 않는다 — `created_at` 순 원본을 그대로 잘라야
 * 앞줄과 꼬리를 이어붙였을 때 순서가 자르기 전과 같다.
 */
export const PIECE_HEAD = 36;

/**
 * 목록·핀이 읽는 최소 형태로 줄인다 — 왜 이 필드들만인지는 `Explorer` 의
 * `PublicPlace` 주석에 있다. 페이지(앞줄)와 라우트 핸들러(전체)가 **같은 함수**를
 * 써야 이어붙일 때 모양이 어긋나지 않는다.
 */
export function toPublicPlace(p: LoadedPlace): PublicPlace {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameLocal: p.nameLocal,
    placeType: p.placeType,
    mapStatus: p.mapStatus,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    youtubeVideoId: p.youtubeVideoId,
    timestampSec: p.timestampSec,
  };
}

/** layout · page · generateMetadata 가 같은 캐시 항목을 나눠 쓴다. */
export const loadPiece = cachePublic(async function loadPiece(params: PageParams) {
  const [{ data: creator }, { data: city }] = await Promise.all([
    supabase.from("creators").select("*").eq("slug", params.creator).single(),
    supabase.from("cities").select("*").eq("slug", params.city).single(),
  ]);
  if (!creator || !city) return null;

  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, youtube_video_id")
    .eq("creator_id", creator.id);
  const videoById = new Map((videos ?? []).map((v) => [v.id, v]));

  const videoIds = (videos ?? []).map((v) => v.id);
  const links = videoIds.length
    ? await chunkedIn(
        (ids) =>
          supabase
            .from("video_places")
            .select("video_id, place_id, timestamp_sec")
            .in("video_id", ids),
        videoIds,
      )
    : [];

  const placeIds = [...new Set(links.map((l) => l.place_id))];
  const places = placeIds.length
    ? await chunkedIn(
        (ids) =>
          supabase
            .from("places")
            .select(
              "id, slug, name, name_local, place_type, map_status, lat, lng, address, summary, summary_bullets, price_hint, summary_en, summary_bullets_en, price_hint_en, en_source, google_place_id, google_maps_url, kakao_place_id, naver_place_id",
            )
            .in("id", ids)
            .eq("city_id", city.id)
            .order("created_at", { ascending: true }),
        placeIds,
      )
    : [];

  const loadedPlaces: LoadedPlace[] = places.map((p) => {
    const link = links.find((l) => l.place_id === p.id);
    const video = link ? videoById.get(link.video_id) : undefined;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameLocal: p.name_local,
      placeType: p.place_type,
      mapStatus: p.map_status,
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      googlePlaceId: p.google_place_id,
      googleMapsUrl: p.google_maps_url,
      kakaoPlaceId: p.kakao_place_id,
      naverPlaceId: p.naver_place_id,
      countryCode: city.country_code,
      summary: p.summary,
      summaryBullets: p.summary_bullets,
      priceHint: p.price_hint,
      summaryEn: p.summary_en,
      summaryBulletsEn: p.summary_bullets_en,
      priceHintEn: p.price_hint_en,
      enSource: p.en_source,
      videoTitle: video?.title ?? null,
      youtubeVideoId: video?.youtube_video_id ?? null,
      timestampSec: link?.timestamp_sec ?? null,
    };
  });

  const { data: piece } = await supabase
    .from("creator_cities")
    .select("intro_text, intro_text_en")
    .eq("creator_id", creator.id)
    .eq("city_id", city.id)
    .maybeSingle();

  const [otherCities, otherCreators] = await Promise.all([
    loadOtherCities(placeIds, city.id),
    loadOtherCreators(creator.id, city.id),
  ]);

  return {
    creator,
    city,
    places: loadedPlaces,
    introText: piece?.intro_text ?? null,
    introTextEn: piece?.intro_text_en ?? null,
    otherCities,
    otherCreators,
  };
}, ["piece"]);

/** 이 크리에이터의 확정 장소가 있는 다른 도시 — 다음 행동 칩용. */
async function loadOtherCities(
  placeIds: string[],
  currentCityId: string,
): Promise<RelatedCityRow[]> {
  if (placeIds.length === 0) return [];
  const allPlaces = await chunkedIn(
    (ids) => supabase.from("places").select("id, city_id, map_status").in("id", ids),
    placeIds,
  );
  const countByCity = new Map<string, number>();
  for (const p of allPlaces) {
    if (p.map_status !== "confirmed" || p.city_id === currentCityId) continue;
    countByCity.set(p.city_id, (countByCity.get(p.city_id) ?? 0) + 1);
  }
  if (countByCity.size === 0) return [];
  const { data: cities } = await supabase
    .from("cities")
    .select("id, slug, name, name_en")
    .in("id", [...countByCity.keys()]);
  return (cities ?? [])
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      nameEn: c.name_en,
      count: countByCity.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/** 같은 도시에 확정 장소가 있는 다른 크리에이터 — 교차 뷰로 가는 유일한 입구. */
async function loadOtherCreators(
  currentCreatorId: string,
  cityId: string,
): Promise<RelatedPiece[]> {
  const { data: cityPlaces } = await supabase
    .from("places")
    .select("id")
    .eq("city_id", cityId)
    .eq("map_status", "confirmed");
  const cityPlaceIds = (cityPlaces ?? []).map((p) => p.id);
  if (cityPlaceIds.length === 0) return [];

  const cityLinks = await chunkedIn(
    (ids) => supabase.from("video_places").select("video_id, place_id").in("place_id", ids),
    cityPlaceIds,
  );
  const cityVideoIds = [...new Set(cityLinks.map((l) => l.video_id))];
  if (cityVideoIds.length === 0) return [];

  const cityVideos = await chunkedIn(
    (ids) => supabase.from("videos").select("id, creator_id").in("id", ids),
    cityVideoIds,
  );
  const creatorByVideo = new Map(cityVideos.map((v) => [v.id, v.creator_id]));
  const placesByCreator = new Map<string, Set<string>>();
  for (const link of cityLinks) {
    const creatorId = creatorByVideo.get(link.video_id);
    if (!creatorId || creatorId === currentCreatorId) continue;
    if (!placesByCreator.has(creatorId)) placesByCreator.set(creatorId, new Set());
    placesByCreator.get(creatorId)!.add(link.place_id);
  }
  if (placesByCreator.size === 0) return [];

  const { data: creators } = await supabase
    .from("creators")
    .select("id, slug, display_name")
    .in("id", [...placesByCreator.keys()]);
  return (creators ?? [])
    .map((c) => ({
      slug: c.slug,
      name: c.display_name,
      count: placesByCreator.get(c.id)?.size ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}
