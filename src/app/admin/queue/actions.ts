"use server";

/**
 * 삭제·정정 요청 처리 — **법정 절차다** (LEGAL.md 4.7).
 *
 * 정보통신망법
 *   §44조의2②  지체 없이 조치하고 신청인·게재자 양쪽에 통지
 *   §44조의2④  다툼이 예상되면 임시조치(접근차단), **기간 30일 이내**
 *   §44조의3    신고가 없어도 선제적 블라인드 가능 — "선(先)비공개 후(後)검토"의 근거
 *
 * 그래서 이 액션들은 "비공개"를 먼저 쉽게 만들고, 되돌리기를 나중에 둔다.
 */

import { revalidatePath } from "next/cache";
import { purgePublicData } from "@/shared/api/cache";
import { getSupabaseAdmin } from "@/shared/api/supabase";

import type { ActionResult } from "../_lib/action-result";

/**
 * 대상을 즉시 비공개로 내리고 임시조치로 표시한다.
 *
 * 대상 타입별로 끄는 스위치가 다르다:
 *   place    — 그 장소만
 *   creator  — 채널 전체 (RLS 가 creators.is_published 로 즉시 차단한다)
 *   video    — 그 영상에 걸린 장소 전부
 */
export async function blindTarget(id: string): Promise<ActionResult> {
  const db = getSupabaseAdmin();
  const { data: req } = await db
    .from("takedown_requests")
    .select("id, target_type, target_id")
    .eq("id", id)
    .single();
  if (!req) return { error: "요청을 찾을 수 없습니다" };
  if (!req.target_id) return { error: "대상이 지정되지 않은 요청입니다 — 손으로 처리하세요" };

  const now = new Date().toISOString();
  let touched = 0;

  if (req.target_type === "place") {
    const { error, count } = await db
      .from("places")
      .update({ is_published: false, updated_at: now }, { count: "exact" })
      .eq("id", req.target_id);
    if (error) return { error: error.message };
    touched = count ?? 0;
  } else if (req.target_type === "creator") {
    const { error } = await db
      .from("creators")
      .update({ is_published: false })
      .eq("id", req.target_id);
    if (error) return { error: error.message };
    // 채널 비공개는 RLS 가 막지만, 장소도 같이 내려 이중으로 확실히 한다
    const { data: videos } = await db.from("videos").select("id").eq("creator_id", req.target_id);
    const videoIds = (videos ?? []).map((v) => v.id);
    if (videoIds.length > 0) {
      const { data: links } = await db
        .from("video_places")
        .select("place_id")
        .in("video_id", videoIds);
      const placeIds = [...new Set((links ?? []).map((l) => l.place_id))];
      if (placeIds.length > 0) {
        const { count } = await db
          .from("places")
          .update({ is_published: false, updated_at: now }, { count: "exact" })
          .in("id", placeIds);
        touched = count ?? 0;
      }
    }
  } else if (req.target_type === "video") {
    const { data: links } = await db
      .from("video_places")
      .select("place_id")
      .eq("video_id", req.target_id);
    const placeIds = [...new Set((links ?? []).map((l) => l.place_id))];
    if (placeIds.length > 0) {
      const { count } = await db
        .from("places")
        .update({ is_published: false, updated_at: now }, { count: "exact" })
        .in("id", placeIds);
      touched = count ?? 0;
    }
  } else {
    return { error: `알 수 없는 대상 타입: ${req.target_type}` };
  }

  const { error: statusError } = await db
    .from("takedown_requests")
    .update({ status: "blinded", blinded_at: now })
    .eq("id", id);
  if (statusError) return { error: statusError.message };

  await db.rpc("recount_stats");
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  purgePublicData();
  return {
    ok: `임시조치 완료 — ${touched}곳 비공개. 30일 안에 결론을 내야 합니다(§44조의2④). 신청인·게재자 양쪽 통지도 잊지 마세요(§44조의2②).`,
  };
}

/** 종결 처리 — 해결(resolved) 또는 반려(rejected). */
export async function closeRequest(
  id: string,
  status: "resolved" | "rejected",
): Promise<ActionResult> {
  const { error } = await getSupabaseAdmin()
    .from("takedown_requests")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: status === "resolved" ? "해결 처리했습니다" : "반려 처리했습니다" };
}
