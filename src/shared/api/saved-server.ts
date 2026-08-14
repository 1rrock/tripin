import { supabase } from "./supabase";
import { supabaseServer } from "./supabase-server";
import { primaryMapLink } from "@/shared/lib/map-links";
import type { PlaceType } from "./database.types";

/**
 * 저장 목록을 서버에서 읽는다.
 *
 * ⚠️ `shared/api/cache.ts` 를 태우지 않는다. 유저별 데이터를 캐시하면
 *    남의 저장 목록이 섞인다. 공개 데이터 로더와 이 파일이 갈리는 이유가 그것이다.
 *
 * 질의를 둘로 나눈다:
 *   1) saved_places  — 세션 클라이언트로. RLS 가 자기 것만 준다.
 *   2) places/cities — 공개 클라이언트로. 이미 공개된 데이터라 조인이 필요 없다.
 * 조인 한 방으로 줄일 수도 있지만, 손으로 관리하는 타입에 관계(Relationships)가
 * 비어 있어 타입이 never 로 풀린다. 두 번 도는 쪽이 안전하다.
 */

export interface SavedPlaceRow {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  nameEn: string | null;
  placeType: PlaceType;
  cityName: string;
  cityNameEn: string | null;
  citySlug: string;
  mapUrl: string | null;
  visited: boolean;
  savedAt: string;
}

export interface SavedView {
  /** 로그인(익명 포함) 세션이 아예 없으면 null — 저장한 적이 없는 사람이다. */
  userId: string | null;
  /** 익명이 아니라 실제 신원(구글 등)이 붙어 있는가 */
  linked: boolean;
  places: SavedPlaceRow[];
}

export async function loadSavedView(): Promise<SavedView> {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;

  if (!user) return { userId: null, linked: false, places: [] };

  /* is_anonymous 는 익명 세션에서 true 다. 구글로 승격하면 false 가 된다. */
  const linked = user.is_anonymous !== true;

  const { data: saves } = await sb
    .from("saved_places")
    .select("place_id, visited, saved_at")
    .order("saved_at", { ascending: false });

  const ids = (saves ?? []).map((s) => s.place_id).filter(Boolean) as string[];
  if (ids.length === 0) return { userId: user.id, linked, places: [] };

  const { data: places } = await supabase
    .from("places")
    .select(
      "id, slug, name, name_local, name_en, place_type, city_id, google_maps_url, google_place_id, kakao_place_id, naver_place_id, lat, lng",
    )
    .in("id", ids)
    .eq("is_published", true);

  const cityIds = [...new Set((places ?? []).map((p) => p.city_id))];
  const { data: cities } = await supabase
    .from("cities")
    .select("id, slug, name, name_en")
    .in("id", cityIds);

  const cityById = new Map((cities ?? []).map((c) => [c.id, c]));
  const placeById = new Map((places ?? []).map((p) => [p.id, p]));

  const rows: SavedPlaceRow[] = [];
  /* saves 순서(최신 저장 먼저)를 그대로 따른다 — places 질의는 순서를 보장하지 않는다 */
  for (const s of saves ?? []) {
    const p = placeById.get(s.place_id);
    if (!p) continue; // 비공개로 내려갔거나 삭제된 장소는 목록에서 조용히 뺀다
    const city = cityById.get(p.city_id);
    if (!city) continue;

    rows.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameLocal: p.name_local,
      nameEn: p.name_en,
      placeType: p.place_type as PlaceType,
      cityName: city.name,
      cityNameEn: city.name_en,
      citySlug: city.slug,
      mapUrl:
        primaryMapLink({
          googleMapsUrl: p.google_maps_url,
          googlePlaceId: p.google_place_id,
          kakaoPlaceId: p.kakao_place_id,
          naverPlaceId: p.naver_place_id,
          lat: p.lat,
          lng: p.lng,
        })?.url ?? null,
      visited: s.visited === true,
      savedAt: s.saved_at,
    });
  }

  return { userId: user.id, linked, places: rows };
}
