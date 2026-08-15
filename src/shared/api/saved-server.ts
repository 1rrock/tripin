import { cache } from "react";
import { isLinkedUser } from "./auth-user";
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
  savedAt: string;
  /** 출처 영상 — 컷 스트립·엽서에 쓴다. 영상 링크가 없으면 null. */
  youtubeId: string | null;
  videoTitle: string | null;
}

export interface SavedListRow {
  id: string;
  name: string;
  /** 이 그룹에 담긴 (공개 상태인) 장소 수 */
  count: number;
}

export interface SavedView {
  /** 로그인(익명 포함) 세션이 아예 없으면 null — 저장한 적이 없는 사람이다. */
  userId: string | null;
  /** 익명이 아니라 실제 신원(구글 등)이 붙어 있는가 */
  linked: boolean;
  places: SavedPlaceRow[];
  lists: SavedListRow[];
  /** 장소 id → 담긴 그룹 id 들. 클라이언트로 넘기므로 Map 이 아니라 배열이다. */
  membership: Record<string, string[]>;
  /** 어느 그룹에도 안 담긴 장소 수 */
  ungroupedCount: number;
}

/**
 * 레이아웃(사이드바)과 페이지(목록)가 같은 요청 안에서 둘 다 부른다.
 * `cache` 로 감싸지 않으면 한 화면을 그리는 데 같은 질의가 두 벌 나간다.
 */
/** 장소 id → 그 장소가 처음 나온 영상의 컷. 한 장소에 영상이 여러 편이면 먼저 잡힌 하나. */
export async function loadPlaceCuts(
  placeIds: string[],
): Promise<Map<string, { youtubeId: string; videoTitle: string }>> {
  const out = new Map<string, { youtubeId: string; videoTitle: string }>();
  if (placeIds.length === 0) return out;

  const { data: links } = await supabase
    .from("video_places")
    .select("place_id, video_id")
    .in("place_id", placeIds);
  const videoIds = [...new Set((links ?? []).map((l) => l.video_id).filter(Boolean))] as string[];
  if (videoIds.length === 0) return out;

  const { data: videos } = await supabase
    .from("videos")
    .select("id, youtube_video_id, title")
    .in("id", videoIds);
  const videoById = new Map((videos ?? []).map((v) => [v.id, v]));

  for (const link of links ?? []) {
    if (!link.place_id || out.has(link.place_id)) continue;
    const v = videoById.get(link.video_id);
    if (!v) continue;
    out.set(link.place_id, { youtubeId: v.youtube_video_id, videoTitle: v.title });
  }
  return out;
}

export const loadSavedView = cache(_loadSavedView);

async function _loadSavedView(): Promise<SavedView> {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;

  const EMPTY: SavedView = {
    userId: null,
    linked: false,
    places: [],
    lists: [],
    membership: {},
    ungroupedCount: 0,
  };
  if (!user) return EMPTY;

  const linked = isLinkedUser(user);

  /* 저장·그룹·담김을 한 번에 — 사이드바가 그룹 개수를 그려야 해서 셋이 다 필요하다 */
  const [savesRes, listsRes, membersRes] = await Promise.all([
    sb.from("saved_places").select("place_id, saved_at").order("saved_at", { ascending: false }),
    sb
      .from("saved_lists")
      .select("id, name, position")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    sb.from("saved_list_places").select("list_id, place_id"),
  ]);
  const saves = savesRes.data;

  const ids = (saves ?? []).map((s) => s.place_id).filter(Boolean) as string[];
  if (ids.length === 0) {
    return {
      ...EMPTY,
      userId: user.id,
      linked,
      lists: (listsRes.data ?? []).map((l) => ({ id: l.id, name: l.name, count: 0 })),
    };
  }

  const [{ data: places }, cuts] = await Promise.all([
    supabase
      .from("places")
      .select(
        "id, slug, name, name_local, name_en, place_type, city_id, google_maps_url, google_place_id, kakao_place_id, naver_place_id, lat, lng",
      )
      .in("id", ids)
      .eq("is_published", true),
    loadPlaceCuts(ids),
  ]);

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
      savedAt: s.saved_at,
      youtubeId: cuts.get(p.id)?.youtubeId ?? null,
      videoTitle: cuts.get(p.id)?.videoTitle ?? null,
    });
  }

  /* 담김은 **실제로 그려지는 장소** 기준으로만 센다. 비공개로 내려간 장소가
     그룹에 남아 있으면 사이드바 숫자와 목록 길이가 어긋난다. */
  const visible = new Set(rows.map((r) => r.id));
  const membership: Record<string, string[]> = {};
  const countByList = new Map<string, number>();

  for (const mrow of membersRes.data ?? []) {
    if (!mrow.place_id || !mrow.list_id || !visible.has(mrow.place_id)) continue;
    (membership[mrow.place_id] ??= []).push(mrow.list_id);
    countByList.set(mrow.list_id, (countByList.get(mrow.list_id) ?? 0) + 1);
  }

  const lists: SavedListRow[] = (listsRes.data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    count: countByList.get(l.id) ?? 0,
  }));

  const ungroupedCount = rows.filter((r) => (membership[r.id]?.length ?? 0) === 0).length;

  return { userId: user.id, linked, places: rows, lists, membership, ungroupedCount };
}
