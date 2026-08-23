import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { Card } from "../_ui/kit";
import { ApplicationActions } from "./ApplicationActions";

export const metadata: Metadata = { title: "채널 신청 — Eatripin 어드민" };

/** 신청은 실시간 신호다 — 정적 캐시 금지. */
export const dynamic = "force-dynamic";

/**
 * 채널 등록 신청 목록 — 크리에이터가 `/apply` 로 남긴 접수.
 *
 * 여기서 하는 일은 판정뿐이다: 여행 콘텐츠가 맞으면 기존 인제스트 파이프라인
 * (scripts/ingest/)으로 등록하고 "등록됨", 아니면 "보류". 행은 지우지 않는다 —
 * 같은 채널의 재신청 때 이전 판단이 남아 있어야 한다.
 */
export default async function ApplicationsPage() {
  const { data, error } = await getSupabaseAdmin()
    .from("channel_applications")
    .select("id, channel_url, contact_email, video_urls, note, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = data ?? [];
  const fresh = rows.filter((r) => r.status === "new");
  const handled = rows.filter((r) => r.status !== "new");

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">채널 신청</h1>
        <p className="text-sm text-neutral-500">
          미처리 {fresh.length} · 전체 {rows.length} · 최근 200개
        </p>
      </div>

      {error ? (
        <Card title="오류">
          <p className="text-sm text-red-700">{error.message}</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card title="비어 있음">
          <p className="text-sm text-neutral-500">
            아직 신청이 없습니다. /apply 로 접수되면 여기 쌓입니다.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {[...fresh, ...handled].map((r) => (
            <div
              key={r.id}
              className={`rounded-lg border bg-white p-4 shadow-sm ${
                r.status === "new" ? "border-neutral-200" : "border-neutral-100 opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={r.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium break-all underline underline-offset-2"
                  >
                    {r.channel_url}
                  </a>
                  <p className="mt-1 text-sm text-neutral-500">
                    {r.contact_email} · {formatSeoul(r.created_at)}
                    {r.status !== "new" ? (
                      <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                        {r.status === "done" ? "등록됨" : "보류"}
                      </span>
                    ) : null}
                  </p>
                </div>
                {r.status === "new" ? <ApplicationActions id={r.id} /> : null}
              </div>
              {r.video_urls ? (
                <p className="mt-2 text-sm break-all whitespace-pre-wrap text-neutral-600">
                  {r.video_urls}
                </p>
              ) : null}
              {r.note ? (
                <p className="mt-2 text-sm whitespace-pre-wrap text-neutral-600">{r.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function formatSeoul(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}
