import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import { fetchAll } from "@/shared/api/chunked-in";
import type { PlaceType } from "@/shared/api/database.types";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";

/**
 * 홈 피드 — 전 채널의 영상을 콘택트 시트로 늘어놓기 위한 로더.
 *
 * 시트 단위는 영상이다. 입구(채널·도시)는 HomeSheet 가 시트 위에 따로 깐다.
 *
 * 각 영상에 **실제 상호명**을 몇 개 실어 보내는 게 이 로더의 핵심이다.
 * "이 영상에 나온 곳 14" 는 주장이고, "스시사이토 · 우동신 · 이치란" 은 증명이다.
 * 첫 화면에서 제품의 메커니즘이 바로 읽히려면 후자가 있어야 한다.
 *
 * 공개 게이트는 기존 홈과 동일하다 — 확정 핀이 MIN_CONFIRMED_PINS 미만인
 * 채널×도시 조각은 없는 것으로 친다. anon 클라이언트 → RLS 가 is_published 를 건다.
 */

export interface FeedCreator {
  /** 구독 토글이 쓴다 — `subscriptions.creator_id` 는 slug 가 아니라 uuid 다. */
  id: string;
  slug: string;
  displayName: string;
  initials: string;
  accentColor: string;
  avatarUrl: string | null;
  /** DB 에 `@` 포함 저장 — 표시할 때 `@` 를 덧붙이지 마라 */
  handle: string | null;
  /** 채널 소개. 채널 목록의 설명 줄이 쓴다 — 비어 있으면 도시 목록이 그 자리를 받는다 */
  bio: string | null;
  placeCount: number;
  videoCount: number;
  /** 최근 영상 순 — 채널 목록의 필름 롤이 이 컷들을 쓴다. 제목은 alt 용 원문 그대로 */
  recentVideos: { youtubeId: string; title: string }[];
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
  /** 정거장들의 장소 유형 — 검색이 "카페"/"cafe" 를 유형으로도 잡게 한다 */
  placeTypes: PlaceType[];
  /**
   * 검색용 요약 불릿 묶음(ko/en). "라멘·이자카야" 같은 음식 종류는 상호명이 아니라
   * 여기 산다. ⚠️ 클라이언트에는 **둘 다 넘기지 마라** — 서버 컴포넌트(page.tsx)가
   * 로케일에 맞는 한쪽만 골라 `search` 로 좁혀 넘긴다(§3-2 원문 누수 방지 층).
   */
  searchKo: string;
  searchEn: string;
  lastStopSec: number | null;
}

/** HomeSheet 가 받는 영상 — 검색 텍스트는 로케일에 맞는 한쪽만 남는다 */
export type HomeSheetVideo = Omit<FeedVideo, "searchKo" | "searchEn"> & { search: string };

/**
 * 조각(채널×도시) — 홈 레일이 쓰는 단위. 이 사이트가 구글 지도를 이기는 지점이
 * "누가 어느 도시에서 어디를 갔나" 라서, 홈에서 파는 물건도 영상이 아니라 이것이다.
 *
 * ⚠️ 채널당 하나만 담는다. 확정 272곳 중 149곳이 한 채널(후쿠오카 아저씨)이라
 * 핀 수로만 줄 세우면 레일이 통째로 그 채널 것이 된다.
 */
export interface FeedPiece {
  creatorSlug: string;
  creatorName: string;
  initials: string;
  accentColor: string;
  avatarUrl: string | null;
  city: { slug: string; name: string; nameEn: string | null };
  placeCount: number;
  /** 대표 컷 — 이 조각에 속한 영상 중 최신. 없으면 프레임을 비운다 */
  cut: { youtubeId: string; title: string } | null;
}

/**
 * 연예인 스팟 — "연예인이 간 장소" 섹션의 카드 한 장. 단위는 장소다.
 *
 * 인물은 채널이 아니다. (a) 본인 채널이 있는 인물(성시경 — creators.celebrity_name
 * 등록 채널)과 (b) 남의 영상이 "OO도 다녀간"이라고 언급만 하는 인물(백종원 —
 * place_celebrity_mentions)이 한 풀에 섞인다. 같은 장소가 양쪽에 있으면
 * 언급(b)이 이긴다 — "성시경도 다녀간"이 본인 방문보다 강한 스토리다.
 */
export interface FeedCelebritySpot {
  placeSlug: string;
  placeName: string;
  /** 현지어 상호. EN 화면이 `displayPlaceName` 으로 이걸 고른다 — 캐시 계약대로
   *  로더는 `name`·`name_local` 을 **둘 다** 싣고 표시 선택은 캐시 밖에서 한다
   *  (cache.ts 규칙 1). 이게 없어서 `/en/celebs` 만 한글 상호를 그렸다. */
  placeNameLocal: string | null;
  /** 영문 상호 — EN 에서 `nameLocal` 보다 **위**다(display.ts). 같은 캐시 계약. */
  placeNameEn: string | null;
  personName: string;
  personNameEn: string | null;
  city: { slug: string; name: string; nameEn: string | null };
  /** 이 장소가 나온 영상의 컷 — places 에 사진 컬럼이 없어 썸네일은 늘 영상이다 */
  cut: { youtubeId: string; title: string };
  publishedAt: string | null;
}

export interface HomeFeed {
  videos: FeedVideo[];
  creators: FeedCreator[];
  /** 채널당 가장 두꺼운 조각. 핀 수 내림차순 */
  pieces: FeedPiece[];
  /** 인물별 최신 1곳 라운드로빈 — 화면은 앞 8장만 쓴다 */
  celebritySpots: FeedCelebritySpot[];
  /** ⚠️ 영상 수는 API 유래 데이터다 — 표기할 때 "우리가 검수한" 성격을 붙인다(LEGAL.md 4.5-(2)). */
  totals: { creators: number; cities: number; places: number; videos: number };
}

/** 홈·채널 목록이 같은 캐시 항목을 나눠 쓴다. 표시 문자열은 여기서 만들지 않는다. */
export const loadHomeFeed = cachePublic(async (): Promise<HomeFeed> => {
  const empty: HomeFeed = {
    videos: [],
    creators: [],
    pieces: [],
    celebritySpots: [],
    totals: { creators: 0, cities: 0, places: 0, videos: 0 },
  };

  /* ⚠️ error 를 반드시 받는다. 예전엔 `{ data: creators }` 만 받아서 DB 에러가
     **진짜 0건과 구분되지 않았다** — 홈이 "곧 열립니다"로 바뀌고 `/channels`·
     `/celebs`·`/api/search-index` 가 동시에 빈 채로 1시간 캐시에 굳었다.
     빈 폴백(empty)은 진짜 0건일 때만 쓴다. */
  const { data: creators, error: creatorsError } = await supabase
    .from("creators")
    .select(
      "id, slug, display_name, display_name_en, celebrity_name, celebrity_name_en, initials, accent_color, avatar_url, youtube_handle, bio",
    )
    .order("place_count", { ascending: false });
  if (creatorsError) throw new Error(`[home:feed] creators 조회 실패: ${creatorsError.message}`);
  if (!creators || creators.length === 0) return empty;

  const [cities, videos, links, places, mentions] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("cities").select("id, slug, name, name_en").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("videos")
        .select("id, youtube_video_id, title, published_at, creator_id")
        .order("published_at", { ascending: false, nullsFirst: false })
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("video_places").select("video_id, place_id, timestamp_sec").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("places")
        .select(
          "id, slug, name, name_local, name_en, city_id, map_status, place_type, summary_bullets, summary_bullets_en",
        )
        .range(from, to),
    ),
    // 연예인 언급(b) — anon 클라이언트라 RLS 가 is_published 만 내준다.
    // 오래된 것부터 순회해 같은 장소의 최신 언급이 마지막에 덮어쓰게 한다
    // (아래 spotByPlace 병합이 나중 행 승리라서, 정렬이 없으면 승자가 비결정적).
    fetchAll((from, to) =>
      supabase
        .from("place_celebrity_mentions")
        .select("place_id, person_name, person_name_en, source_video_id")
        .order("created_at", { ascending: true })
        .range(from, to),
    ),
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
  // 연예인 스팟 재료 — feed 가 최신순이라 장소당 처음 만나는 영상이 최신 컷이다.
  // spotBaseByPlace 는 모든 보이는 장소(언급(b)의 발판),
  // celebSpotByPlace 는 celebrity_name 채널의 것만 ((a)).
  type SpotBase = {
    place: { slug: string; name: string; nameLocal: string | null; nameEn: string | null };
    city: { slug: string; name: string; nameEn: string | null };
    cut: { youtubeId: string; title: string };
    publishedAt: string | null;
  };
  const spotBaseByPlace = new Map<string, SpotBase>();
  const celebSpotByPlace = new Map<string, FeedCelebritySpot>();
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
      const city = cityById.get(p.city_id);
      if (!city) continue;
      if (!spotBaseByPlace.has(p.id)) {
        spotBaseByPlace.set(p.id, {
          place: { slug: p.slug, name: p.name, nameLocal: p.name_local, nameEn: p.name_en },
          city: { slug: city.slug, name: city.name, nameEn: city.name_en },
          cut: { youtubeId: v.youtube_video_id, title: v.title },
          publishedAt: v.published_at,
        });
      }
      // (a)는 base 와 별도로 건다 — 같은 장소를 남의 채널 최신 영상이 먼저
      // 선점해도, 인물 본인 영상이 있으면 그 컷으로 (a)에 들어가야 한다.
      if (creator.celebrity_name && !celebSpotByPlace.has(p.id)) {
        celebSpotByPlace.set(p.id, {
          placeSlug: p.slug,
          placeName: p.name,
          placeNameLocal: p.name_local,
          placeNameEn: p.name_en,
          personName: creator.celebrity_name,
          personNameEn: creator.celebrity_name_en ?? creator.display_name_en,
          city: { slug: city.slug, name: city.name, nameEn: city.name_en },
          cut: { youtubeId: v.youtube_video_id, title: v.title },
          publishedAt: v.published_at,
        });
      }
    }
    const times = mine.map((l) => l.timestamp_sec).filter((t): t is number => t !== null);

    // 음식 종류("라멘", "이자카야")는 요약 불릿에 산다 — 정거장들의 불릿을 모아
    // 검색 건초더미로 만든다. RSC 페이로드가 커지지 않게 영상당 800자에서 끊는다.
    const cap = (parts: string[]) => parts.join(" ").slice(0, 800);
    const searchKo = cap(stops.flatMap((p) => p.summary_bullets ?? []));
    const searchEn = cap(stops.flatMap((p) => p.summary_bullets_en ?? []));

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
      placeTypes: [...new Set(stops.map((p) => p.place_type))],
      searchKo,
      searchEn,
      lastStopSec: times.length ? Math.max(...times) : null,
    });
  }
  if (feed.length === 0) return empty;

  // 2.5단계 — (a) 보강. feed 루프의 celebSpotByPlace 는 isVisible 을 거쳐
  // 채널×도시 핀이 MIN_CONFIRMED_PINS 미만인 조각의 장소를 놓친다. 그런데
  // 그 조각 게이트는 조각(홈 레일) 것이지 장소 상세 것이 아니다 — 장소 상세는
  // MIN_CITY_PINS=1 이라 게이트와 무관하게 이미 살아 있다. 그러니 여기서는
  // 게이트 없이 celebrity_name 채널의 확정 장소를 전부 훑어 채운다.
  // videos 는 이미 최신순이라 장소당 첫 등장이 최신 컷 — feed 루프와 같은 규칙.
  for (const v of videos ?? []) {
    const creator = creatorById.get(v.creator_id);
    if (!creator?.celebrity_name) continue;
    for (const link of linksByVideo.get(v.id) ?? []) {
      if (celebSpotByPlace.has(link.place_id)) continue;
      const place = confirmedById.get(link.place_id);
      if (!place) continue;
      const city = cityById.get(place.city_id);
      if (!city) continue;
      celebSpotByPlace.set(place.id, {
        placeSlug: place.slug,
        placeName: place.name,
        placeNameLocal: place.name_local,
        placeNameEn: place.name_en,
        personName: creator.celebrity_name,
        personNameEn: creator.celebrity_name_en ?? creator.display_name_en,
        city: { slug: city.slug, name: city.name, nameEn: city.name_en },
        cut: { youtubeId: v.youtube_video_id, title: v.title },
        publishedAt: v.published_at,
      });
    }
  }

  // 2.6단계 — 연예인 스팟 확정. (a) 파생·보강분 + (b) 승인된 언급.
  // 같은 장소가 양쪽에 있으면 (b)가 덮는다 — 언급이 더 강한 스토리다.
  const videoRowById = new Map((videos ?? []).map((v) => [v.id, v]));
  const spotByPlace = new Map(celebSpotByPlace);
  for (const m of mentions ?? []) {
    // 발판은 보이는 장소(spotBase)가 우선, 없으면 (a) 보강분(게이트 우회로
    // 들어온 celebrity 채널 장소)도 인정한다 — 안 그러면 게이트 밖 장소에서
    // "(b)가 이긴다" 원칙이 조용히 무너진다. 둘 다 없으면 링크할 곳이 없는 것.
    const vis = spotBaseByPlace.get(m.place_id);
    const celeb = celebSpotByPlace.get(m.place_id);
    if (!vis && !celeb) continue;
    const place = vis?.place ?? {
      slug: celeb!.placeSlug,
      name: celeb!.placeName,
      nameLocal: celeb!.placeNameLocal,
      nameEn: celeb!.placeNameEn,
    };
    const city = vis?.city ?? celeb!.city;
    const cut = vis?.cut ?? celeb!.cut;
    const publishedAt = vis?.publishedAt ?? celeb!.publishedAt;
    const src = m.source_video_id ? videoRowById.get(m.source_video_id) : undefined;
    spotByPlace.set(m.place_id, {
      placeSlug: place.slug,
      placeName: place.name,
      placeNameLocal: place.nameLocal,
      placeNameEn: place.nameEn,
      personName: m.person_name,
      personNameEn: m.person_name_en,
      city,
      cut: src ? { youtubeId: src.youtube_video_id, title: src.title } : cut,
      publishedAt: src?.published_at ?? publishedAt,
    });
  }
  // 인물별 최신 1곳씩 라운드로빈 — 한 인물(추성훈 42곳)이 섹션을 도배하지
  // 못하게 한다. 인물 순서는 각자의 최신 스팟 기준. 전체를 실어 보낸다 —
  // 홈은 앞 8장만 자르고, /celebs 인덱스가 나머지 전부를 쓴다.
  const byPerson = new Map<string, FeedCelebritySpot[]>();
  for (const spot of spotByPlace.values()) {
    const queue = byPerson.get(spot.personName);
    if (queue) queue.push(spot);
    else byPerson.set(spot.personName, [spot]);
  }
  const ts = (s: FeedCelebritySpot) => (s.publishedAt ? Date.parse(s.publishedAt) : 0);
  const queues = [...byPerson.values()];
  for (const queue of queues) queue.sort((a, b) => ts(b) - ts(a));
  queues.sort((a, b) => ts(b[0]) - ts(a[0]));
  const roundRobin: FeedCelebritySpot[] = [];
  for (let round = 0; ; round += 1) {
    let picked = false;
    for (const queue of queues) {
      const spot = queue[round];
      if (!spot) continue;
      roundRobin.push(spot);
      picked = true;
    }
    if (!picked) break;
  }
  // 커버 일별 로테이션 — 새 영상이 없어도 매일 다른 인물이 표지에 선다.
  // 회전 폭을 인물 수로 제한하면 첫 순환 구간 안이라 연속 5장의 인물이 안 겹친다.
  // 캐시(1시간) 안에서 계산하므로 날짜 경계 반영이 최대 1시간 늦을 수 있다 — 수용.
  const rot = queues.length > 0 ? Math.floor(Date.now() / 86_400_000) % queues.length : 0;
  const celebritySpots = [...roundRobin.slice(rot), ...roundRobin.slice(0, rot)];

  // 3단계 — 채널 스트립. 피드에 실제로 올라간 영상을 가진 채널만 남는다
  const activeCreators = new Set(feed.map((f) => f.creatorSlug));
  const creatorRows: FeedCreator[] = [];
  const pieces: FeedPiece[] = [];

  // 조각별 대표 컷 — feed 가 최신순이라 처음 만나는 영상이 그 조각의 최신이다
  const cutByPiece = new Map<string, { youtubeId: string; title: string }>();
  for (const v of feed) {
    for (const city of v.cities) {
      const key = `${v.creatorSlug}:${city.slug}`;
      if (!cutByPiece.has(key)) cutByPiece.set(key, { youtubeId: v.youtubeId, title: v.title });
    }
  }

  for (const c of creators) {
    if (!activeCreators.has(c.slug)) continue;
    // count 를 실어 두는 이유: 화면은 도시를 앞 몇 개만 보여준다. 순회 순서대로
    // 자르면 핀 1곳짜리가 앞에 서고 두꺼운 도시가 "외 N" 뒤로 숨는다.
    const myCities: { slug: string; name: string; nameEn: string | null; count: number }[] = [];
    let placeCount = 0;
    let thickest: FeedPiece | null = null;
    for (const [key, ids] of slicePlaces) {
      if (!publishedSlices.has(key) || !key.startsWith(`${c.id}:`)) continue;
      const city = cityById.get(key.slice(c.id.length + 1));
      if (!city) continue;
      myCities.push({ slug: city.slug, name: city.name, nameEn: city.name_en, count: ids.size });
      placeCount += ids.size;
      if (!thickest || ids.size > thickest.placeCount) {
        thickest = {
          creatorSlug: c.slug,
          creatorName: c.display_name,
          initials: c.initials,
          accentColor: c.accent_color,
          avatarUrl: c.avatar_url,
          city: { slug: city.slug, name: city.name, nameEn: city.name_en },
          placeCount: ids.size,
          cut: cutByPiece.get(`${c.slug}:${city.slug}`) ?? null,
        };
      }
    }
    if (thickest) pieces.push(thickest);
    // feed 는 이미 최신순 — 검수를 거쳐 피드에 오른 영상만 센다
    const myVideos = feed.filter((f) => f.creatorSlug === c.slug);
    creatorRows.push({
      id: c.id,
      slug: c.slug,
      displayName: c.display_name,
      initials: c.initials,
      accentColor: c.accent_color,
      avatarUrl: c.avatar_url,
      handle: c.youtube_handle,
      bio: c.bio,
      placeCount,
      videoCount: myVideos.length,
      recentVideos: myVideos.slice(0, 4).map((v) => ({ youtubeId: v.youtubeId, title: v.title })),
      cities: myCities
        .sort((a, b) => b.count - a.count)
        .map((x) => ({ slug: x.slug, name: x.name, nameEn: x.nameEn })),
    });
  }
  // DB 의 place_count 컬럼과 조각 합산이 어긋날 수 있다(실측: bimirya 12 가
  // chuseonghoon 20 위에 있었다) — 화면에 찍는 합산 기준으로 다시 정렬한다.
  creatorRows.sort((a, b) => b.placeCount - a.placeCount);
  pieces.sort((a, b) => b.placeCount - a.placeCount);

  return {
    videos: feed,
    creators: creatorRows,
    pieces,
    celebritySpots,
    totals: {
      creators: creatorRows.length,
      cities: seenCities.size,
      places: seenPlaces.size,
      videos: feed.length,
    },
  };
}, ["home:feed"]);
