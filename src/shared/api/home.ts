import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";

/**
 * 홈 피드 — 전 채널의 영상을 콘택트 시트로 늘어놓기 위한 로더.
 *
 * 이전 홈은 채널 목록이었다. 채널이 1개뿐인 지금 그 화면은 카드 한 장이라
 * 어떤 디자인을 씌워도 비어 보였다. 실제 분량이 있는 축은 영상(16편)이므로
 * 홈의 단위를 영상으로 바꾼다.
 *
 * 각 영상에 **실제 상호명**을 몇 개 실어 보내는 게 이 로더의 핵심이다.
 * "이 영상에 나온 곳 14" 는 주장이고, "스시사이토 · 우동신 · 이치란" 은 증명이다.
 * 첫 화면에서 제품의 메커니즘이 바로 읽히려면 후자가 있어야 한다.
 *
 * 공개 게이트는 기존 홈과 동일하다 — 확정 핀이 MIN_CONFIRMED_PINS 미만인
 * 채널×도시 조각은 없는 것으로 친다. anon 클라이언트 → RLS 가 is_published 를 건다.
 */

export interface FeedCreator {
  slug: string;
  displayName: string;
  initials: string;
  accentColor: string;
  avatarUrl: string | null;
  placeCount: number;
  cities: { slug: string; name: string; nameEn: string | null }[];
}

export interface FeedVideo {
  youtubeId: string;
  title: string;
  publishedAt: string | null;
  creatorSlug: string;
  creatorName: string;
  initials: string;
  accentColor: string;
  avatarUrl: string | null;
  stopCount: number;
  cities: { slug: string; name: string; nameEn: string | null }[];
  /** 미리보기용 상호명 — 화면에서 앞 3개만 쓴다 */
  placeNames: string[];
  lastStopSec: number | null;
}

export interface HomeFeed {
  videos: FeedVideo[];
  creators: FeedCreator[];
  /** ⚠️ 영상 수는 API 유래 데이터다 — 표기할 때 "우리가 검수한" 성격을 붙인다(LEGAL.md 4.5-(2)). */
  totals: { creators: number; cities: number; places: number; videos: number };
}

/** 홈·채널 목록이 같은 캐시 항목을 나눠 쓴다. 표시 문자열은 여기서 만들지 않는다. */
export const loadHomeFeed = cachePublic(async (): Promise<HomeFeed> => {
  const empty: HomeFeed = {
    videos: [],
    creators: [],
    totals: { creators: 0, cities: 0, places: 0, videos: 0 },
  };

  const { data: creators } = await supabase
    .from("creators")
    .select("id, slug, display_name, initials, accent_color, avatar_url")
    .order("place_count", { ascending: false });
  if (!creators || creators.length === 0) return empty;

  const [{ data: cities }, { data: videos }, { data: links }, { data: places }] = await Promise.all([
    supabase.from("cities").select("id, slug, name, name_en"),
    supabase
      .from("videos")
      .select("id, youtube_video_id, title, published_at, creator_id")
      .order("published_at", { ascending: false, nullsFirst: false }),
    supabase.from("video_places").select("video_id, place_id, timestamp_sec"),
    supabase.from("places").select("id, name, city_id, map_status"),
  ]);

  const cityById = new Map((cities ?? []).map((c) => [c.id, c]));
  const creatorById = new Map(creators.map((c) => [c.id, c]));
  const confirmedById = new Map(
    (places ?? []).filter((p) => p.map_status === "confirmed").map((p) => [p.id, p]),
  );
  const creatorByVideo = new Map((videos ?? []).map((v) => [v.id, v.creator_id]));

  // 1단계 — 채널×도시 조각별로 확정 장소를 모아 공개 게이트를 건다
  const slicePlaces = new Map<string, Set<string>>(); // `${creatorId}:${cityId}` → placeIds
  for (const link of links ?? []) {
    const place = confirmedById.get(link.place_id);
    if (!place) continue;
    const creatorId = creatorByVideo.get(link.video_id);
    if (!creatorId) continue;
    const key = `${creatorId}:${place.city_id}`;
    let bucket = slicePlaces.get(key);
    if (!bucket) {
      bucket = new Set();
      slicePlaces.set(key, bucket);
    }
    bucket.add(place.id);
  }
  const publishedSlices = new Set(
    [...slicePlaces.entries()].filter(([, ids]) => ids.size >= MIN_CONFIRMED_PINS).map(([k]) => k),
  );
  if (publishedSlices.size === 0) return empty;

  /** 이 장소가 공개된 조각에 속하는가 — 영상·채널 양쪽에서 같은 판정을 쓴다 */
  const isVisible = (creatorId: string, placeId: string) => {
    const place = confirmedById.get(placeId);
    return Boolean(place && publishedSlices.has(`${creatorId}:${place.city_id}`));
  };

  // 2단계 — 영상별로 보이는 장소만 모은다
  const linksByVideo = new Map<string, typeof links>();
  for (const link of links ?? []) {
    const list = linksByVideo.get(link.video_id);
    if (list) list.push(link);
    else linksByVideo.set(link.video_id, [link]);
  }

  const feed: FeedVideo[] = [];
  const seenCities = new Set<string>();
  const seenPlaces = new Set<string>();
  for (const v of videos ?? []) {
    const creator = creatorById.get(v.creator_id);
    if (!creator) continue;
    const mine = (linksByVideo.get(v.id) ?? []).filter((l) => isVisible(v.creator_id, l.place_id));
    // 보이는 장소가 없는 영상은 눌러도 빈 화면이다. 시트에 올리지 않는다.
    if (mine.length === 0) continue;

    const stops = mine.map((l) => confirmedById.get(l.place_id)!);
    for (const p of stops) {
      seenPlaces.add(p.id);
      seenCities.add(p.city_id);
    }
    const times = mine.map((l) => l.timestamp_sec).filter((t): t is number => t !== null);

    feed.push({
      youtubeId: v.youtube_video_id,
      title: v.title,
      publishedAt: v.published_at,
      creatorSlug: creator.slug,
      creatorName: creator.display_name,
      initials: creator.initials,
      accentColor: creator.accent_color,
      avatarUrl: creator.avatar_url,
      stopCount: stops.length,
      cities: [
        ...new Map(
          stops
            .map((p) => cityById.get(p.city_id))
            .filter((c): c is NonNullable<typeof c> => Boolean(c))
            .map((c) => [c.slug, { slug: c.slug, name: c.name, nameEn: c.name_en }] as const),
        ).values(),
      ],
      placeNames: stops.map((p) => p.name),
      lastStopSec: times.length ? Math.max(...times) : null,
    });
  }
  if (feed.length === 0) return empty;

  // 3단계 — 채널 스트립. 피드에 실제로 올라간 영상을 가진 채널만 남는다
  const activeCreators = new Set(feed.map((f) => f.creatorSlug));
  const creatorRows: FeedCreator[] = [];
  for (const c of creators) {
    if (!activeCreators.has(c.slug)) continue;
    const myCities: { slug: string; name: string; nameEn: string | null }[] = [];
    let placeCount = 0;
    for (const [key, ids] of slicePlaces) {
      if (!publishedSlices.has(key) || !key.startsWith(`${c.id}:`)) continue;
      const city = cityById.get(key.slice(c.id.length + 1));
      if (!city) continue;
      myCities.push({ slug: city.slug, name: city.name, nameEn: city.name_en });
      placeCount += ids.size;
    }
    creatorRows.push({
      slug: c.slug,
      displayName: c.display_name,
      initials: c.initials,
      accentColor: c.accent_color,
      avatarUrl: c.avatar_url,
      placeCount,
      cities: myCities,
    });
  }

  return {
    videos: feed,
    creators: creatorRows,
    totals: {
      creators: creatorRows.length,
      cities: seenCities.size,
      places: seenPlaces.size,
      videos: feed.length,
    },
  };
}, ["home:feed"]);
