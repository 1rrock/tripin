import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { Card } from "../_ui/kit";
import { DismissButton } from "./DismissButton";

export const metadata: Metadata = { title: "검색 실패어 — Eatripin 어드민" };

/** 실패어는 실시간 신호다 — 정적 캐시 금지. */
export const dynamic = "force-dynamic";

/**
 * 검색 실패어 목록 — 유저가 무슨 말로 찾다가 빈손으로 나갔는가.
 *
 * 많이 찾은 순으로 본다. 여기 쌓이는 말이 다음 수집(어느 채널·어느 도시·어느
 * 음식)의 우선순위다. 처리(장소를 넣었든, 무시하기로 했든)한 행은 지운다 —
 * 또 찾으면 다시 쌓이므로 지우는 게 안전한 리셋이다.
 */
export default async function SearchMissesPage() {
  const { data, error } = await getSupabaseAdmin()
    .from("search_misses")
    .select("query, count, last_seen_at")
    .order("count", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(200);

  const rows = data ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">검색 실패어</h1>
        <p className="text-sm text-neutral-500">
          홈 검색이 0건이었던 말들 · 많이 찾은 순 · 최근 200개
        </p>
      </div>

      {error ? (
        <Card title="오류">
          <p className="text-sm text-red-700">{error.message}</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card title="비어 있음">
          <p className="text-sm text-neutral-500">
            아직 기록된 실패어가 없습니다. 유저가 검색해서 0건이 나오면 여기 쌓입니다.
          </p>
        </Card>
      ) : (
        /* `overflow-hidden` 이었다. 고정 열 폭만 80+176+80=336px 에 칸마다 px-4
           (좌우 32px)가 네 번 붙고 검색어 칸이 그 위에 얹히므로 390px 를 넘는데,
           hidden 이라 넘친 부분이 **스크롤로도 안 닿았다** — 맨 오른쪽
           `DismissButton` 을 누를 방법이 없었다. auto 로 바꾸면 모서리 라운딩은
           그대로 유지되면서 가로 스크롤이 열린다(pieces/PiecesClient.tsx 와 같은 패턴). */
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
                <th className="px-4 py-2.5 font-medium">검색어</th>
                <th className="w-20 px-4 py-2.5 text-right font-medium">횟수</th>
                <th className="w-44 px-4 py-2.5 font-medium">마지막</th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.query} className="border-b border-neutral-100 last:border-b-0">
                  <td className="px-4 py-2.5 font-medium break-all">{r.query}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.count}</td>
                  <td className="px-4 py-2.5 text-neutral-500 tabular-nums">
                    {formatSeoul(r.last_seen_at)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DismissButton query={r.query} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function formatSeoul(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
