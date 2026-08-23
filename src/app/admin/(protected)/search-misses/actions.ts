"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { requireAdmin } from "@/shared/lib/require-admin";

import type { ActionResult } from "../_lib/action-result";

/**
 * 처리한 실패어를 지운다 — "이 검색어에 답할 장소를 넣었다" 또는 "무시한다".
 * 지워도 유저가 또 찾으면 다시 쌓이므로, 지우는 것 자체가 안전한 리셋이다.
 */
export async function dismissSearchMiss(query: string): Promise<ActionResult> {
  await requireAdmin();
  const { error } = await getSupabaseAdmin().from("search_misses").delete().eq("query", query);
  if (error) return { error: error.message };
  revalidatePath("/admin/search-misses");
  return { ok: "삭제됨" };
}

// void 를 돌려주던 `<form action>` 래퍼는 걷어냈다 — 그 래퍼가 위 `{ error }` 를 삼켜서
// 삭제 실패가 화면에 아무 흔적도 남기지 않았다. 호출은 `DismissButton.tsx` 가 한다.
