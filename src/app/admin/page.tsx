import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@/shared/api/supabase";

export const metadata: Metadata = {
  title: "대시보드 — Tripin 어드민",
};

/** 대시보드는 항상 현재 상태를 보여야 한다 — 정적 캐시 금지. */
export const dynamic = "force-dynamic";

interface DashboardCounts {
  summaryMissing: number;
  coordsMissing: number;
  piecesUnpublished: number;
  takedownsOpen: number;
  videosStale: number;
  piecesPublished: number;
  dbError: string | null;
}

async function loadCounts(): Promise<DashboardCounts> {
  try {
    const db = getSupabaseAdmin();
    const staleCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      summaryMissing,
      coordsMissing,
      piecesUnpublished,
      takedownsOpen,
      videosStale,
      piecesPublished,
    ] = await Promise.all([
      // 공개 화면은 불릿 → 문단 순으로 폴백하므로 둘 다 비어야 진짜 요약 누락이다.
      db
        .from("places")
        .select("id", { count: "exact", head: true })
        .is("summary", null)
        .filter("summary_bullets", "eq", "{}"),
      db.from("places").select("id", { count: "exact", head: true }).or("lat.is.null,lng.is.null"),
      db
        .from("creator_cities")
        .select("creator_id", { count: "exact", head: true })
        .is("published_at", null),
      db
        .from("takedown_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["received", "blinded"]),
      db
        .from("videos")
        .select("id", { count: "exact", head: true })
        .lt("api_fetched_at", staleCutoff),
      db
        .from("creator_cities")
        .select("creator_id", { count: "exact", head: true })
        .not("published_at", "is", null),
    ]);

    return {
      summaryMissing: summaryMissing.count ?? 0,
      coordsMissing: coordsMissing.count ?? 0,
      piecesUnpublished: piecesUnpublished.count ?? 0,
      takedownsOpen: takedownsOpen.count ?? 0,
      videosStale: videosStale.count ?? 0,
      piecesPublished: piecesPublished.count ?? 0,
      dbError: null,
    };
  } catch (error) {
    return {
      summaryMissing: 0,
      coordsMissing: 0,
      piecesUnpublished: 0,
      takedownsOpen: 0,
      videosStale: 0,
      piecesPublished: 0,
      dbError: error instanceof Error ? error.message : "DB 연결 실패",
    };
  }
}

function TaskRow({
  label,
  count,
  note,
  href,
}: {
  label: string;
  count: number;
  note?: string;
  href: string;
}) {
  return (
    <li className="border-b border-neutral-100 last:border-0">
      <Link
        href={href}
        className="flex items-baseline justify-between py-3 transition hover:bg-neutral-50"
      >
        <span className="text-sm text-neutral-800">{label}</span>
        <span className="text-sm tabular-nums">
          {count > 0 ? (
            <strong className="font-semibold text-neutral-900">{count}건 →</strong>
          ) : (
            <span className="text-neutral-400">{note ?? "없음"}</span>
          )}
        </span>
      </Link>
    </li>
  );
}

export default async function AdminDashboardPage() {
  const counts = await loadCounts();
  const hasAnyContent = counts.piecesPublished + counts.piecesUnpublished > 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">대시보드</h1>
        <Link
          href="/admin/confirm"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
        >
          장소 확정하러 가기
        </Link>
      </div>

      {counts.dbError ? (
        <p role="alert" className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          DB 조회에 실패했습니다: {counts.dbError}
        </p>
      ) : null}

      {/* 점검 필요 — 30일 갱신은 YouTube API 정책 요건이라 최상단 (docs/ADMIN.md 3장) */}
      {counts.videosStale > 0 ? (
        <p role="alert" className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          영상 메타 30일 경과 <strong className="font-semibold">{counts.videosStale}건</strong> —
          YouTube API 정책상 갱신이 필요합니다. (갱신 배치는 준비 중)
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold text-neutral-500">이어서 할 일</h2>
          <ul className="mt-2 rounded-lg border border-neutral-200 bg-white px-5 shadow-sm">
            <TaskRow label="지도 좌표 미등록 장소" count={counts.coordsMissing} href="/admin/confirm" />
            <TaskRow label="요약 미작성 장소" count={counts.summaryMissing} href="/admin/place" />
            <TaskRow label="공개 대기 조각" count={counts.piecesUnpublished} href="/admin/confirm" />
            <TaskRow label="삭제·정정 요청" count={counts.takedownsOpen} href="/admin/confirm" />
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-neutral-500">조각 현황</h2>
          <div className="mt-2 rounded-lg border border-neutral-200 bg-white px-5 py-4 shadow-sm">
            {hasAnyContent ? (
              <p className="text-sm text-neutral-800">
                공개 <strong className="font-semibold">{counts.piecesPublished}</strong> · 준비 중{" "}
                <strong className="font-semibold">{counts.piecesUnpublished}</strong>
              </p>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm font-medium text-neutral-800">아직 조각이 없습니다</p>
                <p className="mt-1 text-sm text-neutral-500">
                  첫 영상을 넣고 장소를 확정하면 여기부터 채워집니다.
                  <br />
                  영상 넣기·확정 화면은 다음 단계에서 만듭니다.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
