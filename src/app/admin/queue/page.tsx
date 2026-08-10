import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { QueueClient, type TakedownRow } from "./QueueClient";

export const metadata: Metadata = { title: "삭제 요청 — Greatripin 어드민" };
export const dynamic = "force-dynamic";

/**
 * 삭제·정정 요청 큐 (docs/ADMIN.md 8.1 · LEGAL.md 4.7).
 *
 * ⚠️ 이 화면이 없던 동안 `takedown_requests` 는 **누구나 INSERT 할 수 있는데
 *    읽는 곳이 없었다.** 제출이 들어와도 운영자가 볼 방법이 없었고,
 *    그 사이 §44조의2④ 의 30일 시계는 돈다.
 */
async function load(): Promise<{ rows: TakedownRow[]; error: string | null }> {
  try {
    const db = getSupabaseAdmin();
    const { data } = await db
      .from("takedown_requests")
      .select("*")
      .order("created_at", { ascending: true });
    const rows = data ?? [];

    // 대상 이름을 붙인다 — id 만 보고는 무엇에 대한 요청인지 알 수 없다
    const placeIds = rows.filter((r) => r.target_type === "place" && r.target_id).map((r) => r.target_id!);
    const creatorIds = rows
      .filter((r) => r.target_type === "creator" && r.target_id)
      .map((r) => r.target_id!);
    const [{ data: places }, { data: creators }] = await Promise.all([
      placeIds.length ? db.from("places").select("id, name").in("id", placeIds) : { data: [] },
      creatorIds.length
        ? db.from("creators").select("id, display_name").in("id", creatorIds)
        : { data: [] },
    ]);
    const nameById = new Map<string, string>([
      ...(places ?? []).map((p) => [p.id, p.name] as const),
      ...(creators ?? []).map((c) => [c.id, c.display_name] as const),
    ]);

    return {
      rows: rows.map((r) => ({
        id: r.id,
        targetType: r.target_type,
        targetId: r.target_id,
        targetUrl: r.target_url,
        targetName: r.target_id ? (nameById.get(r.target_id) ?? null) : null,
        requesterEmail: r.requester_email,
        reason: r.reason,
        status: r.status,
        blindedAt: r.blinded_at,
        resolvedAt: r.resolved_at,
        createdAt: r.created_at,
      })),
      error: null,
    };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export default async function AdminQueuePage() {
  const { rows, error } = await load();
  // 기한 계산의 기준 시각은 서버에서 한 번만 만든다 (컴포넌트 렌더 순수성)
  return <QueueClient rows={rows} nowIso={new Date().toISOString()} loadError={error} />;
}
