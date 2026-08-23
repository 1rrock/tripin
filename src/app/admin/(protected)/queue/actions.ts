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
import { chunkedIn } from "@/shared/api/chunked-in";
import { requireAdmin } from "@/shared/lib/require-admin";

import type { ActionResult } from "../_lib/action-result";

/**
 * 대상을 즉시 비공개로 내리고 임시조치로 표시한다.
 *
 * 대상 타입별로 끄는 스위치가 다르다:
 *   place    — 그 장소만
 *   creator  — 채널 전체 (RLS 가 creators.is_published 로 즉시 차단한다)
 *   video    — 그 영상에 걸린 장소 전부
 *
 * ⚠️ 대상이 실제로 있었는지(`targetFound`)를 켠 장소 수(`touched`)와 따로 센다.
 *    예전에는 대상이 이미 없어도 status 를 'blinded' 로 마감했다 — 임시조치가 된 적이
 *    없는 요청이 처리된 것처럼 큐에서 사라지고, §44조의2④ 의 30일 시계만 돈다.
 *    (영상이 걸린 장소가 0곳인 채널은 정상이므로, 채널은 채널 행의 존재로 판단한다.)
 */
export async function blindTarget(id: string): Promise<ActionResult> {
  await requireAdmin();
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
  /** 대상 자체가 존재했는가 — 0 이면 마감하지 않는다 */
  let targetFound = false;

  if (req.target_type === "place") {
    const { error, count } = await db
      .from("places")
      .update({ is_published: false, updated_at: now }, { count: "exact" })
      .eq("id", req.target_id);
    if (error) return { error: error.message };
    touched = count ?? 0;
    targetFound = touched > 0;
  } else if (req.target_type === "creator") {
    const { error, count } = await db
      .from("creators")
      .update({ is_published: false }, { count: "exact" })
      .eq("id", req.target_id);
    if (error) return { error: error.message };
    targetFound = (count ?? 0) > 0;
    // 채널 비공개는 RLS 가 막지만, 장소도 같이 내려 이중으로 확실히 한다
    const { data: videos } = await db.from("videos").select("id").eq("creator_id", req.target_id);
    const videoIds = (videos ?? []).map((v) => v.id);
    if (videoIds.length > 0) {
      // 채널 하나의 영상이 수백 개일 수 있어 .in() URL 길이 제한에 걸릴 수 있다 — chunkedIn 으로 나눠 받는다
      const links = await chunkedIn(
        (ids) => db.from("video_places").select("place_id").in("video_id", ids),
        videoIds,
      );
      const placeIds = [...new Set(links.map((l) => l.place_id))];
      if (placeIds.length > 0) {
        // placeIds 도 같은 이유로 청크 단위 업데이트
        touched = 0;
        for (let i = 0; i < placeIds.length; i += 80) {
          const { count } = await db
            .from("places")
            .update({ is_published: false, updated_at: now }, { count: "exact" })
            .in("id", placeIds.slice(i, i + 80));
          touched += count ?? 0;
        }
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
    targetFound = touched > 0;
  } else {
    return { error: `알 수 없는 대상 타입: ${req.target_type}` };
  }

  // 아무것도 못 내렸으면 마감하지 않는다 — 요청은 큐에 남아 손으로 처리해야 한다
  if (!targetFound) {
    return {
      error:
        "내릴 대상을 찾지 못했습니다 (이미 삭제됐거나 대상 ID가 어긋납니다) — 요청은 마감하지 않았습니다. 손으로 확인하세요.",
    };
  }

  const { error: statusError, count: statusCount } = await db
    .from("takedown_requests")
    .update({ status: "blinded", blinded_at: now }, { count: "exact" })
    .eq("id", id);
  if (statusError) return { error: statusError.message };
  if (!statusCount) {
    return {
      error: `대상 ${touched}곳은 비공개로 내렸지만 요청 상태를 바꾸지 못했습니다 (요청 행이 사라졌습니다) — 손으로 확인하세요`,
    };
  }

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
  await requireAdmin();
  const { error, count } = await getSupabaseAdmin()
    .from("takedown_requests")
    .update({ status, resolved_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);
  if (error) return { error: error.message };
  // 0행이면 마감된 게 아니다 — "처리했습니다"로 넘어가면 요청이 조용히 미결로 남는다
  if (!count) return { error: "요청을 찾을 수 없습니다 — 마감되지 않았습니다. 새로고침 후 다시" };
  revalidatePath("/admin", "layout");
  return { ok: status === "resolved" ? "해결 처리했습니다" : "반려 처리했습니다" };
}
