import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/shared/api/supabase";

/** 요약 미작성 큐 진입점 — 첫 미작성 장소로 보낸다 (docs/ADMIN.md 대시보드 "작성하러 가기"). */
export const dynamic = "force-dynamic";

export default async function PlaceQueuePage() {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("places")
    .select("id, summary, summary_bullets")
    .order("created_at", { ascending: true });
  const first = (data ?? []).find((p) => !p.summary?.trim() && p.summary_bullets.length === 0);
  redirect(first ? `/admin/place/${first.id}` : "/admin/confirm");
}
