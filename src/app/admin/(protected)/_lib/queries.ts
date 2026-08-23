/**
 * 어드민 공용 조회 — 대시보드·장소 목록·조각 화면이 같은 집계를 쓴다.
 *
 * 공개 화면(`shared/api/*`)과 분리한 이유:
 *   · 여기는 **서비스 롤**로 읽는다. 비공개·후보까지 보여야 검수가 된다
 *   · 공개 화면은 캐시된 통계를 읽지만, 어드민은 항상 **실제 값을 다시 센다**.
 *     캐시가 틀어졌는지 자체가 어드민이 봐야 할 정보이기 때문이다
 *
 * ⚠️ `places`/`video_places`/`videos` 처럼 1000행을 넘길 수 있는 전 테이블 스캔은
 *    `fetchAll` 로 감싼다 — PostgREST 가 1000행에서 조용히 잘라 그 너머 장소가
 *    "(출처 영상 없음)" 으로 보이는 문제가 있었다.
 */

import { fetchAll } from "@/shared/api/chunked-in";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import type { AdminCityIntroRow, AdminPiece, AdminPlaceRow, AdminTranslationRow } from "./shared";
import { hasSummary } from "./shared";

export type { AdminCityIntroRow, AdminPiece, AdminPlaceRow, AdminTranslationRow } from "./shared";
export { hasSummary, isVagueAddress, PLACE_TYPE_LABEL } from "./shared";

/**
 * 장소 전체를 크리에이터·도시와 함께 읽는다.
 *
 * 조인을 PostgREST 한 방으로 하지 않고 나눠 받는 이유 — `places → video_places → videos`
 * 는 다대다라 중첩 select 가 장소를 중복으로 뱉는다. 여기서 하나로 접는다.
 */
export async function loadAdminPlaces(): Promise<AdminPlaceRow[]> {
  const db = getSupabaseAdmin();
  const [places, { data: cities }, links, videos, { data: creators }] = await Promise.all([
    fetchAll((from, to) =>
      db
        .from("places")
        .select(
          "id, slug, name, name_local, place_type, map_status, is_published, lat, lng, address, google_maps_url, google_place_id, source_note, summary, summary_bullets, price_hint, city_id",
        )
        .order("name")
        .range(from, to),
    ),
    db.from("cities").select("id, slug, name"),
    // video_places 는 id 컬럼이 없는 복합키(video_id, place_id) 테이블이라 둘 다로 정렬한다
    fetchAll((from, to) =>
      db
        .from("video_places")
        .select("video_id, place_id, timestamp_sec")
        .order("video_id")
        .order("place_id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      db
        .from("videos")
        .select("id, youtube_video_id, title, published_at, creator_id")
        .order("id")
        .range(from, to),
    ),
    db.from("creators").select("id, slug, display_name"),
  ]);

  const cityById = new Map((cities ?? []).map((c) => [c.id, c]));
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const creatorById = new Map((creators ?? []).map((c) => [c.id, c]));

  // 장소 → 링크들. 한 장소가 여러 영상에 걸릴 수 있어 가장 이른 영상을 대표로 쓴다
  const linksByPlace = new Map<string, { videoId: string; timestampSec: number | null }[]>();
  for (const l of links) {
    const arr = linksByPlace.get(l.place_id) ?? [];
    arr.push({ videoId: l.video_id, timestampSec: l.timestamp_sec });
    linksByPlace.set(l.place_id, arr);
  }

  return places.map((p) => {
    const city = cityById.get(p.city_id);
    const mine = (linksByPlace.get(p.id) ?? [])
      .map((l) => ({ ...l, video: videoById.get(l.videoId) }))
      .filter((l) => l.video)
      .sort((a, b) => (a.video!.published_at ?? "").localeCompare(b.video!.published_at ?? ""));
    const first = mine[0];
    const creator = first?.video ? creatorById.get(first.video.creator_id) : undefined;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameLocal: p.name_local,
      placeType: p.place_type,
      mapStatus: p.map_status,
      isPublished: p.is_published,
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      googleMapsUrl: p.google_maps_url,
      googlePlaceId: p.google_place_id,
      sourceNote: p.source_note,
      summary: p.summary,
      summaryBullets: p.summary_bullets ?? [],
      priceHint: p.price_hint,
      citySlug: city?.slug ?? "?",
      cityName: city?.name ?? "?",
      creatorSlug: creator?.slug ?? "?",
      creatorName: creator?.display_name ?? "(출처 영상 없음)",
      sourceDate: first?.video?.published_at ?? null,
      videoTitle: first?.video?.title ?? null,
      youtubeVideoId: first?.video?.youtube_video_id ?? null,
      timestampSec: first?.timestampSec ?? null,
    };
  });
}

/**
 * 영상 메타가 30일을 넘긴 건수 — YouTube API §III.E.4.d 보관 제한.
 *
 * 컴포넌트 안에서 `Date.now()` 를 부르면 렌더 순수성 규칙에 걸린다(react-hooks/purity).
 * 시간에 의존하는 계산은 여기 서버 함수에 둔다.
 */
export async function countStaleVideos(staleDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - staleDays * 86400_000).toISOString();
  const { count } = await getSupabaseAdmin()
    .from("videos")
    .select("id", { count: "exact", head: true })
    .lt("api_fetched_at", cutoff);
  return count ?? 0;
}

/**
 * 미처리 삭제·정정 요청 수 — 접수(received) + 임시조치 중(blinded).
 *
 * ⚠️ 이 테이블은 RLS 상 **누구나 INSERT 할 수 있다**(공개 신고 창구). 화면에서 안 보이면
 *    제출이 들어와도 모른 채 §44조의2④ 의 30일 기한이 지나간다.
 */
export async function countOpenTakedowns(): Promise<number> {
  const { count } = await getSupabaseAdmin()
    .from("takedown_requests")
    .select("id", { count: "exact", head: true })
    .in("status", ["received", "blinded"]);
  return count ?? 0;
}

/**
 * 조각(채널×도시) 현황. 노출 핀 수·대기·비공개 확정 수를 한 줄에 모은다.
 * @param places 이미 로드한 행을 넘기면 places 테이블을 다시 안 읽는다 (대시보드 이중 fetch 방지).
 */
export async function loadAdminPieces(
  minPins: number,
  places?: AdminPlaceRow[],
): Promise<{
  pieces: AdminPiece[];
  gate: number;
}> {
  const db = getSupabaseAdmin();
  const [rows, { data: cc }] = await Promise.all([
    places ? Promise.resolve(places) : loadAdminPlaces(),
    db.from("creator_cities").select("creator_id, city_id, place_count, published_at"),
  ]);
  const [{ data: creators }, { data: cities }] = await Promise.all([
    db.from("creators").select("id, slug, display_name"),
    db.from("cities").select("id, slug, name"),
  ]);
  const creatorBySlug = new Map((creators ?? []).map((c) => [c.slug, c]));
  const cityBySlug = new Map((cities ?? []).map((c) => [c.slug, c]));

  const byKey = new Map<string, AdminPiece>();
  for (const r of rows) {
    if (r.creatorSlug === "?" || r.citySlug === "?") continue;
    const key = `${r.creatorSlug}|${r.citySlug}`;
    const creator = creatorBySlug.get(r.creatorSlug);
    const city = cityBySlug.get(r.citySlug);
    if (!creator || !city) continue;
    const piece =
      byKey.get(key) ??
      ({
        creatorId: creator.id,
        creatorSlug: creator.slug,
        creatorName: creator.display_name,
        cityId: city.id,
        citySlug: city.slug,
        cityName: city.name,
        published: 0,
        confirmedHidden: 0,
        candidates: 0,
        summaryMissing: 0,
        cachedCount: null,
        publishedAt: null,
      } satisfies AdminPiece);
    if (r.isPublished) piece.published += 1;
    else if (r.mapStatus === "confirmed") piece.confirmedHidden += 1;
    if (r.mapStatus === "candidate") piece.candidates += 1;
    if (!hasSummary(r)) piece.summaryMissing += 1;
    byKey.set(key, piece);
  }

  const ccByKey = new Map(
    (cc ?? []).map((row) => [`${row.creator_id}|${row.city_id}`, row] as const),
  );
  for (const piece of byKey.values()) {
    const row = ccByKey.get(`${piece.creatorId}|${piece.cityId}`);
    if (row) {
      piece.cachedCount = row.place_count;
      piece.publishedAt = row.published_at;
    }
  }

  const pieces = [...byKey.values()].sort(
    (a, b) => b.published - a.published || a.creatorSlug.localeCompare(b.creatorSlug),
  );
  return { pieces, gate: minPins };
}

/**
 * 영문 번역 검수 대상 — /admin/translations.
 *
 * `en_source` 가 있는(machine/human) 장소는 전부 싣는다. `null`(미번역)은 번역할
 * 산문이 하나라도 있는 것만 싣는다 — `scripts/translate-en.mjs` 가 스킵하는 것과 같은
 * 장소를 어드민에서도 "미번역" 큐에 올리지 않기 위해서다(완전히 빈 행은 번역 대상이 아니다).
 */
export async function loadAdminTranslations(): Promise<AdminTranslationRow[]> {
  const db = getSupabaseAdmin();
  const [places, { data: cities }, links, videos, { data: creators }] = await Promise.all([
    fetchAll((from, to) =>
      db
        .from("places")
        .select(
          "id, slug, name, name_local, city_id, summary, summary_bullets, address, price_hint, summary_en, summary_bullets_en, address_en, price_hint_en, en_source, en_translated_at",
        )
        .order("updated_at", { ascending: false })
        .range(from, to),
    ),
    db.from("cities").select("id, slug, name"),
    // video_places 는 id 컬럼이 없는 복합키(video_id, place_id) 테이블이라 둘 다로 정렬한다
    fetchAll((from, to) =>
      db
        .from("video_places")
        .select("video_id, place_id")
        .order("video_id")
        .order("place_id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      db.from("videos").select("id, creator_id, published_at").order("id").range(from, to),
    ),
    db.from("creators").select("id, slug, display_name"),
  ]);

  const cityById = new Map((cities ?? []).map((c) => [c.id, c]));
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const creatorById = new Map((creators ?? []).map((c) => [c.id, c]));

  const linksByPlace = new Map<string, string[]>();
  for (const l of links) {
    const arr = linksByPlace.get(l.place_id) ?? [];
    arr.push(l.video_id);
    linksByPlace.set(l.place_id, arr);
  }

  return places
    .filter(
      (p) =>
        p.en_source ||
        p.summary ||
        (p.summary_bullets?.length ?? 0) > 0 ||
        p.address ||
        p.price_hint,
    )
    .map((p) => {
      const city = cityById.get(p.city_id);
      const videosHere = (linksByPlace.get(p.id) ?? [])
        .map((id) => videoById.get(id))
        .filter((v): v is NonNullable<typeof v> => Boolean(v))
        .sort((a, b) => (a.published_at ?? "").localeCompare(b.published_at ?? ""));
      const creator = videosHere[0] ? creatorById.get(videosHere[0].creator_id) : undefined;

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        nameLocal: p.name_local,
        citySlug: city?.slug ?? "?",
        cityName: city?.name ?? "?",
        creatorSlug: creator?.slug ?? "?",
        creatorName: creator?.display_name ?? "(출처 영상 없음)",
        summary: p.summary,
        summaryBullets: p.summary_bullets ?? [],
        address: p.address,
        priceHint: p.price_hint,
        summaryEn: p.summary_en,
        summaryBulletsEn: p.summary_bullets_en ?? [],
        addressEn: p.address_en,
        priceHintEn: p.price_hint_en,
        enSource: p.en_source,
        enTranslatedAt: p.en_translated_at,
      };
    });
}

/** 도시 인트로 영문 검수 — 행 수가 적어(조각당 최대 1개) 필터·큐 없이 전부 싣는다. */
export async function loadAdminCityIntros(): Promise<AdminCityIntroRow[]> {
  const db = getSupabaseAdmin();
  const [{ data: cc }, { data: creators }, { data: cities }] = await Promise.all([
    db
      .from("creator_cities")
      .select("creator_id, city_id, intro_text, intro_text_en")
      .not("intro_text", "is", null),
    db.from("creators").select("id, slug, display_name"),
    db.from("cities").select("id, slug, name"),
  ]);
  const creatorById = new Map((creators ?? []).map((c) => [c.id, c]));
  const cityById = new Map((cities ?? []).map((c) => [c.id, c]));

  return (cc ?? [])
    .filter((r): r is typeof r & { intro_text: string } => Boolean(r.intro_text))
    .map((r) => {
      const creator = creatorById.get(r.creator_id);
      const city = cityById.get(r.city_id);
      return {
        creatorId: r.creator_id,
        creatorSlug: creator?.slug ?? "?",
        creatorName: creator?.display_name ?? "?",
        cityId: r.city_id,
        citySlug: city?.slug ?? "?",
        cityName: city?.name ?? "?",
        introText: r.intro_text,
        introTextEn: r.intro_text_en,
      };
    })
    .sort((a, b) => a.creatorSlug.localeCompare(b.creatorSlug) || a.citySlug.localeCompare(b.citySlug));
}
