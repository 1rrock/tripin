"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { requireAdmin } from "@/shared/lib/require-admin";

import type { ActionResult } from "../_lib/action-result";

/**
 * 신청 상태 전환 — done(등록됨) / dismissed(보류·거절).
 * 행을 지우지 않는 이유: 같은 채널이 또 신청했을 때 이전에 어떻게 판단했는지가
 * 남아 있어야 한다. 등록 작업 자체는 기존 인제스트 파이프라인이 한다.
 */
export async function setApplicationStatus(id: string, status: "done" | "dismissed"): Promise<ActionResult> {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("channel_applications")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/applications");
  return { ok: status === "done" ? "등록됨으로 표시" : "보류로 표시" };
}

/** `<form action>` 은 반환값이 void 여야 한다 — 폼에서 쓰는 래퍼 */
export async function setApplicationStatusForm(
  id: string,
  status: "done" | "dismissed",
): Promise<void> {
  await setApplicationStatus(id, status);
}
