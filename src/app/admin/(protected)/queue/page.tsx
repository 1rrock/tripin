import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { QueueClient, type TakedownRow } from "./QueueClient";

export const metadata: Metadata = { title: "삭제 요청 — Eatripin 어드민" };
export const dynamic = "force-dynamic";

/**
 * 삭제·정정 요청 큐 (docs/ADMIN.md 8.1 · LEGAL.md 4.7).
 *
 * ⚠️ 이 주석은 한때 *"누구나 INSERT 할 수 있는데 읽는 곳이 없었다"* 고 적혀 있었다.
 *    **사실과 정반대였다.** 열린 INSERT 정책은 `0006` 이 지웠고, 그 뒤로 이 테이블은
 *    **읽는 곳만 있고 쓰는 곳이 없었다** — 실측 행 수 0. 즉 이 화면의 빈 목록은
 *    "요청 없음"이 아니라 "접수될 길이 없음"이었다. 인입 경로(`/takedown` 폼 →
 *    `/api/takedown` → `submit_takedown_request`, 0021)는 2026-08-24 에 열었다.
 *
 * ⚠️ 그래도 **빈 목록을 "요청 없음"으로 읽지 마라.** 메일(mailto:)로 오는 접수는
 *    여전히 이 큐에 자동으로 안 들어온다. 그건 운영자가 손으로 옮겨야 한다.
 *
 * ⚠️ 조회 `error` 를 반드시 받는다 — supabase-js 는 throw 하지 않으므로 아래 catch 는
 *    `getSupabaseAdmin()` 이 env 없이 던질 때만 걸린다. `error` 를 안 받던 동안
 *    조회 실패가 빈 배열이 되어 화면에 "처리할 요청이 없습니다."로 나갔다.
 *    형제 화면(applications·search-misses)과 같은 모양으로 맞춘다.
 */
async function load(): Promise<{ rows: TakedownRow[]; error: string | null }> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("takedown_requests")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) return { rows: [], error: error.message };
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
