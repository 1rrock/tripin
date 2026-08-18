"use server";

/**
 * 어드민 공통 서버 액션 — 대시보드·조각 화면이 쓴다.
 *
 * 보호: proxy(middleware) 가 /admin/* POST(서버 액션 포함)에 쿠키를 요구한다.
 *
 * ⚠️ 공개 데이터를 바꾸는 액션은 `revalidatePath` 만으로 끝나지 않는다. 공개 화면은
 *    동적 렌더 + 로더 캐시 구조라(`shared/api/cache.ts`) `purgePublicData()`
 *    를 같이 불러야 유저 화면에 반영된다.
 */

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { purgePublicData } from "@/shared/api/cache";
import { requireAdmin } from "@/shared/lib/require-admin";
import type { ActionResult } from "./_lib/action-result";


/**
 * 통계 캐시 재계산.
 *
 * 왜 버튼이 필요한가 — 캐시를 갱신하는 경로가 어드민 서버액션뿐이라,
 * `scripts/ingest/*` 로 넣은 데이터는 캐시를 건드리지 않는다. 실제로 어긋난 적이 있다
 * (fukuoka-ajo 66곳인데 캐시 0 → home.ts 가 이 값으로 정렬해 맨 뒤로 밀렸다).
 * 계산 정의는 SQL 함수 하나(`recount_stats`)에 있다 — 마이그레이션 0005.
 */
interface RecountRow {
  creators_updated: number;
  pieces_updated: number;
}

export async function recountStats(): Promise<ActionResult> {
  await requireAdmin();
  // `database.types.ts` 는 테이블만 생성돼 있어 함수 시그니처가 없다 — 반환형만 좁혀 쓴다
  const { data, error } = await (
    getSupabaseAdmin().rpc as unknown as (fn: string) => Promise<{
      data: RecountRow[] | RecountRow | null;
      error: { message: string } | null;
    }>
  )("recount_stats");
  if (error) return { error: `재계산 실패: ${error.message}` };
  const row = Array.isArray(data) ? data[0] : data;
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  purgePublicData();
  return {
    ok: `재계산 완료 — 크리에이터 ${row?.creators_updated ?? 0}건 · 조각 ${row?.pieces_updated ?? 0}건 갱신`,
  };
}

/**
 * 조각 올리기/내리기 토글 (삭제 요청·수동 블라인드용).
 *
 * 유저 노출의 실제 스위치는 `places.is_published`(RLS) 다.
 * `creator_cities.published_at` 은 수동 토글 시각 기록 — 노출 판정에는 쓰지 않는다.
 *
 * 확정 시 이미 is_published=true 로 올라가므로, 일상 운영은 확정만으로 충분하다.
 * 이 버튼은 채널 측 비공개 요청 등으로 **한꺼번에 내릴 때** 쓴다.
 *
 * ⚠️ 내릴 때 확정(confirmed) 장소만 건드린다. 올릴 때도 confirmed 만 올린다
 *    (폐업 등으로 따로 내린 장소를 되살리지 않기 위해).
 */
export async function setPiecePublished(
  creatorId: string,
  cityId: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const db = getSupabaseAdmin();

  const { data: videos } = await db.from("videos").select("id").eq("creator_id", creatorId);
  const videoIds = (videos ?? []).map((v) => v.id);
  if (videoIds.length === 0) return { error: "이 채널에 등록된 영상이 없습니다" };

  const { data: links } = await db.from("video_places").select("place_id").in("video_id", videoIds);
  const placeIds = [...new Set((links ?? []).map((l) => l.place_id))];
  if (placeIds.length === 0) return { error: "이 조각에 장소가 없습니다" };

  const { error: placeError } = await db
    .from("places")
    .update({ is_published: publish, updated_at: new Date().toISOString() })
    .in("id", placeIds)
    .eq("city_id", cityId)
    .eq("map_status", "confirmed");
  if (placeError) return { error: placeError.message };

  const { error: pieceError } = await db.from("creator_cities").upsert({
    creator_id: creatorId,
    city_id: cityId,
    published_at: publish ? new Date().toISOString() : null,
  });
  if (pieceError) return { error: pieceError.message };

  // 채널 카드는 조각이 하나라도 공개돼야 뜬다
  if (publish) await db.from("creators").update({ is_published: true }).eq("id", creatorId);

  await db.rpc("recount_stats");
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  purgePublicData();
  return { ok: publish ? "조각을 유저 화면에 올렸습니다" : "조각을 비공개로 내렸습니다" };
}

/**
 * 장소를 지운다 — 잘못 넣은 데이터를 치우는 경로.
 *
 * ⚠️ 삭제 요청(`/admin/queue`)에는 이걸 쓰지 마라. 법정 절차는 **임시조치(비공개)** 이고
 *    30일 안에 복원/영구삭제를 결정한다(§44조의2④). 바로 지우면 되돌릴 수가 없다.
 *
 * `video_places` 는 FK ON DELETE CASCADE 로 같이 정리된다.
 */
export async function deletePlaceById(placeId: string): Promise<ActionResult> {
  await requireAdmin();
  const db = getSupabaseAdmin();
  const { data: place } = await db.from("places").select("name").eq("id", placeId).single();
  const { error } = await db.from("places").delete().eq("id", placeId);
  if (error) return { error: error.message };
  await db.rpc("recount_stats");
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  purgePublicData();
  return { ok: `"${place?.name ?? "장소"}" 삭제됨` };
}

/**
 * 장소 하나의 공개 여부만 뒤집는다 — 목록에서 바로 쓰는 경로.
 * 공개 전환은 map_status=confirmed 인 장소만 허용 (미확정 핀이 RLS 로 새는 것 방지).
 */
export async function togglePlacePublished(
  placeId: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const db = getSupabaseAdmin();
  const { data: place } = await db
    .from("places")
    .select("map_status, name")
    .eq("id", placeId)
    .single();
  if (!place) return { error: "장소를 찾을 수 없습니다" };
  if (publish && place.map_status !== "confirmed") {
    return {
      error: `"${place.name}" 은(는) 아직 후보입니다. 확정한 뒤에만 공개할 수 있습니다`,
    };
  }

  const { error } = await db
    .from("places")
    .update({ is_published: publish, updated_at: new Date().toISOString() })
    .eq("id", placeId);
  if (error) return { error: error.message };

  await db.rpc("recount_stats");
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  purgePublicData();
  return { ok: publish ? "공개로 전환" : "비공개로 전환" };
}
