import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import { chunkedIn, fetchAll } from "@/shared/api/chunked-in";
import type { PlaceType } from "@/shared/api/database.types";

/**
 * 영상 축 데이터 로더 — 채널 → 영상 → 시간별 정거장.
 *
 * 도시 축(`creator_cities` 조각)과 같은 데이터(`video_places`)의 다른 절단면이다.
 * 도시로 자르면 지도가 되고, 영상으로 자르면 타임라인이 된다. 둘은 공존한다.
 *
 * ⚠️ RLS 주의: `videos` 정책은 "공개된 크리에이터의 것"만 거른다 —
 *    확정 장소가 0개인 영상도 anon 에게 그대로 읽힌다. 그래서 여기서
 *    정거장 0개 영상을 직접 걸러낸다. 안 그러면 눌러도 빈 화면인 영상이 목록에 섞인다.
 */

export interface VideoStop {
  placeId: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PlaceType;
  /** confirmed 만 지도 링크가 검수된 딥링크다. candidate 는 이름 검색 URL. */
  confirmed: boolean;
  address: string | null;
  cityName: string | null;
  cityNameEn: string | null;
  citySlug: string | null;
  summary: string | null;
  summaryBullets: string[];
  priceHint: string | null;
  mapUrl: string | null;
  lat: number | null;
  lng: number | null;
  /** 영상 내 등장 시각(초). null 이면 타임라인에 놓지 않고 목록 끝에 붙인다. */
  timestampSec: number | null;
}

export interface VideoSummary {
  youtubeId: string;
  title: string;
  publishedAt: string | null;
  durationSec: number | null;
  stopCount: number;
  /** 이 영상에 등장하는 도시·타입 — 목록 필터의 근거. */
  cities: { slug: string; name: string; nameEn: string | null }[];
  types: PlaceType[];
  /**
   * 등장 상호명 — 목록 카드의 헤드라인이 된다.
   * "나온 곳 3"은 주장이고 상호명은 증명이라, 시트 문법에서는 이쪽이 제목 자리에 온다.
   */
  placeNames: string[];
  /** 타임라인의 마지막 정거장 시각 — duration 이 없을 때 축의 끝으로 쓴다. */
  lastStopSec: number | null;
}

export interface VideoDetail extends VideoSummary {
  stops: VideoStop[];
}

export interface CreatorHeader {
  slug: string;
  displayName: string;
  initials: string;
  accentColor: string;
  avatarUrl: string | null;
}

/** 지도 링크 — 검수된 URL 이 있으면 그것, 없으면 좌표 폴백. */
function mapUrlFor(p: {
  google_maps_url: string | null;
  lat: number | null;
  lng: number | null;
}): string | null {
  if (p.google_maps_url) return p.google_maps_url;
  if (p.lat !== null && p.lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }
  return null;
}

/**
 * 채널 한 줄 — 표시용 헤더 + **id**.
 *
 * id 를 같이 돌려주는 이유: 예전엔 헤더만 받고 `creator_id` 가 필요할 때마다
 * `creators` 를 slug 로 한 번 더 조회했다(같은 행을 두 번). id 는 `CreatorHeader`
 * 밖에 둔다 — 응답 형태(클라이언트로 나가는 creator)를 바꾸지 않기 위해서다.
 */
async function loadCreator(slug: string): Promise<{ id: string; header: CreatorHeader } | null> {
  const { data, error } = await supabase
    .from("creators")
    .select("id, slug, display_name, initials, accent_color, avatar_url")
    .eq("slug", slug)
    .maybeSingle();
  // 없는 채널(null)은 404 지만, 조회 실패는 404 가 아니다 — 구분해서 던진다
  if (error) throw new Error(`[videos] creators(${slug}) 조회 실패: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    header: {
      slug: data.slug,
      displayName: data.display_name,
      initials: data.initials,
      accentColor: data.accent_color,
      avatarUrl: data.avatar_url,
    },
  };
}

/** 한 채널의 영상 목록 — 정거장이 하나도 없는 영상은 제외한다. */
export const loadCreatorVideos = cachePublic(async function loadCreatorVideos(
  creatorSlug: string,
): Promise<{ creator: CreatorHeader; videos: VideoSummary[] } | null> {
  const row = await loadCreator(creatorSlug);
  if (!row) return null;
  const { id: creatorId, header: creator } = row;

  /* fetchAll 이다 — `.range()` 가 없으면 PostgREST 가 1000행에서 조용히 자른다.
     1,094편짜리 채널(곽튜브)의 목록이 그만큼 소리 없이 잘려 나갔다. */
  const videos = await fetchAll((from, to) =>
    supabase
      .from("videos")
      .select("id, youtube_video_id, title, published_at, duration_sec")
      .eq("creator_id", creatorId)
      .order("published_at", { ascending: false, nullsFirst: false })
      // 동률 타이브레이커 — 없으면 페이지 경계에서 같은 행이 겹치거나 빠진다
      .order("id")
      .range(from, to),
  );
  if (videos.length === 0) return { creator, videos: [] };

  const links = await chunkedIn(
    (ids) =>
      supabase.from("video_places").select("video_id, place_id, timestamp_sec").in("video_id", ids),
    videos.map((v) => v.id),
  );

  const placeIds = [...new Set(links.map((l) => l.place_id))];
  const places = placeIds.length
    ? await chunkedIn(
        (ids) =>
          supabase.from("places").select("id, name, place_type, city_id, map_status").in("id", ids),
        placeIds,
      )
    : [];

  const cityIds = [...new Set(places.map((p) => p.city_id))];
  const cities = cityIds.length
    ? await chunkedIn(
        (ids) => supabase.from("cities").select("id, slug, name, name_en").in("id", ids),
        cityIds,
      )
    : [];
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const placeById = new Map(places.map((p) => [p.id, p]));

  // 영상마다 links 전체를 filter 하던 (영상 수 × 링크 수) 를 한 번의 그룹핑으로
  const linksByVideo = new Map<string, typeof links>();
  for (const l of links) {
    const list = linksByVideo.get(l.video_id);
    if (list) list.push(l);
    else linksByVideo.set(l.video_id, [l]);
  }

  const out: VideoSummary[] = [];
  for (const v of videos) {
    const mine = linksByVideo.get(v.id) ?? [];
    const stops = mine.map((l) => placeById.get(l.place_id)).filter(Boolean);
    // 정거장 0개 = 눌러도 빈 화면. 목록에 올리지 않는다.
    if (stops.length === 0) continue;

    const times = mine.map((l) => l.timestamp_sec).filter((t): t is number => t !== null);
    out.push({
      youtubeId: v.youtube_video_id,
      title: v.title,
      publishedAt: v.published_at,
      durationSec: v.duration_sec,
      stopCount: stops.length,
      cities: [
        ...new Map(
          stops
            .map((p) => cityById.get(p!.city_id))
            .filter((c): c is NonNullable<typeof c> => Boolean(c))
            .map((c) => [c.slug, { slug: c.slug, name: c.name, nameEn: c.name_en }] as const),
        ).values(),
      ],
      types: [...new Set(stops.map((p) => p!.place_type))],
      placeNames: stops.map((p) => p!.name),
      lastStopSec: times.length ? Math.max(...times) : null,
    });
  }
  return { creator, videos: out };
}, ["videos:by-creator"]);

/** 영상 한 편의 타임라인 — 정거장을 시각 순으로 정렬한다. */
export const loadVideoDetail = cachePublic(async function loadVideoDetail(
  creatorSlug: string,
  youtubeId: string,
): Promise<{ creator: CreatorHeader; video: VideoDetail } | null> {
  /* 채널과 영상은 서로를 기다릴 이유가 없다 — 나란히 띄운다.
     소유 채널 확인도 별도 조회가 아니다: 예전엔 `creators` 를 slug 로 한 번,
     영상의 creator_id 로 또 한 번(같은 테이블 두 번) 읽고 slug 를 비교했다.
     손에 든 creator.id 와 video.creator_id 를 맞춰 보면 같은 판정이다. */
  const [row, videoRes] = await Promise.all([
    loadCreator(creatorSlug),
    supabase
      .from("videos")
      .select("id, youtube_video_id, title, published_at, duration_sec, creator_id")
      .eq("youtube_video_id", youtubeId)
      .maybeSingle(),
  ]);
  if (videoRes.error) {
    throw new Error(`[videos] videos(${youtubeId}) 조회 실패: ${videoRes.error.message}`);
  }
  if (!row) return null;
  const { id: creatorId, header: creator } = row;
  const video = videoRes.data;
  if (!video) return null;
  // URL 의 채널과 영상의 실제 소유 채널이 다르면 잘못된 조합이다
  if (video.creator_id !== creatorId) return null;

  const { data: links, error: linksError } = await supabase
    .from("video_places")
    .select("place_id, timestamp_sec")
    .eq("video_id", video.id);
  if (linksError) {
    throw new Error(`[videos] video_places(${youtubeId}) 조회 실패: ${linksError.message}`);
  }
  const placeIds = (links ?? []).map((l) => l.place_id);
  const places = placeIds.length
    ? await chunkedIn(
        (ids) =>
          supabase
            .from("places")
            .select(
              "id, slug, name, name_local, place_type, map_status, address, city_id, summary, summary_bullets, price_hint, google_maps_url, lat, lng",
            )
            .in("id", ids),
        placeIds,
      )
    : [];

  const cityIds = [...new Set(places.map((p) => p.city_id))];
  const cities = cityIds.length
    ? await chunkedIn(
        (ids) => supabase.from("cities").select("id, slug, name, name_en").in("id", ids),
        cityIds,
      )
    : [];
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const placeById = new Map(places.map((p) => [p.id, p]));

  const stops: VideoStop[] = (links ?? [])
    .map((l) => {
      const p = placeById.get(l.place_id);
      if (!p) return null;
      const city = cityById.get(p.city_id);
      return {
        placeId: p.id,
        slug: p.slug,
        name: p.name,
        nameLocal: p.name_local,
        placeType: p.place_type,
        confirmed: p.map_status === "confirmed",
        address: p.address,
        cityName: city?.name ?? null,
        cityNameEn: city?.name_en ?? null,
        citySlug: city?.slug ?? null,
        summary: p.summary,
        summaryBullets: p.summary_bullets ?? [],
        priceHint: p.price_hint,
        mapUrl: mapUrlFor(p),
        lat: p.lat,
        lng: p.lng,
        timestampSec: l.timestamp_sec,
      } satisfies VideoStop;
    })
    .filter((s): s is VideoStop => s !== null)
    // 시각 있는 것 먼저 오름차순, 없는 것은 뒤로
    .sort((a, b) => {
      if (a.timestampSec === null && b.timestampSec === null) return 0;
      if (a.timestampSec === null) return 1;
      if (b.timestampSec === null) return -1;
      return a.timestampSec - b.timestampSec;
    });

  if (stops.length === 0) return null;

  const times = stops.map((s) => s.timestampSec).filter((t): t is number => t !== null);
  return {
    creator,
    video: {
      youtubeId: video.youtube_video_id,
      title: video.title,
      publishedAt: video.published_at,
      durationSec: video.duration_sec,
      stopCount: stops.length,
      cities: [
        ...new Map(
          stops
            .filter((s) => s.citySlug !== null)
            .map(
              (s) =>
                [s.citySlug, { slug: s.citySlug!, name: s.cityName!, nameEn: s.cityNameEn }] as const,
            ),
        ).values(),
      ],
      types: [...new Set(stops.map((s) => s.placeType))],
      placeNames: stops.map((s) => s.name),
      lastStopSec: times.length ? Math.max(...times) : null,
      stops,
    },
  };
}, ["videos:detail"]);
