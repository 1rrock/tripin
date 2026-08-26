import type { Metadata } from "next";
import Link from "next/link";
import { MIN_CONFIRMED_PINS, PRODUCTION_MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import {
  countOpenTakedowns,
  countStaleVideos,
  hasSummary,
  isVagueAddress,
  loadAdminPieces,
  loadAdminPlaces,
} from "./_lib/queries";
import { canRepublishPiece, hasConfirmableStock, isPieceLive } from "./_lib/piece-visibility";
import { RecountButton } from "./_ui/RecountButton";
import { Card, Num, Pill } from "./_ui/kit";

export const metadata: Metadata = { title: "대시보드 — Eatripin 어드민" };

/** 대시보드는 항상 현재 상태를 보여야 한다 — 정적 캐시 금지. */
export const dynamic = "force-dynamic";

const STALE_DAYS = 30;

export default async function AdminDashboardPage() {
  let places: Awaited<ReturnType<typeof loadAdminPlaces>> = [];
  let pieces: Awaited<ReturnType<typeof loadAdminPieces>>["pieces"] = [];
  let staleVideos = 0;
  let openTakedowns = 0;
  let dbError: string | null = null;

  try {
    const [p, stale, takedowns] = await Promise.all([
      loadAdminPlaces(),
      countStaleVideos(STALE_DAYS),
      countOpenTakedowns(),
    ]);
    places = p;
    // places 한 번만 읽고 조각 집계에 재사용 (이중 fetch 방지)
    const pc = await loadAdminPieces(PRODUCTION_MIN_CONFIRMED_PINS, places);
    pieces = pc.pieces;
    staleVideos = stale;
    openTakedowns = takedowns;
  } catch (error) {
    dbError = error instanceof Error ? error.message : "DB 연결 실패";
  }

  // ── 지금 손봐야 하는 것 ──
  const candidates = places.filter((p) => p.mapStatus === "candidate");
  const summaryMissing = places.filter((p) => !hasSummary(p));
  const coordsMissing = places.filter((p) => p.lat === null);
  const typeUnknown = places.filter((p) => p.placeType === "unknown");
  const vagueAddress = places.filter((p) => p.isPublished && isVagueAddress(p));
  const hidden = places.filter((p) => !p.isPublished && p.mapStatus === "confirmed");
  const cacheDrift = pieces.filter((p) => p.cachedCount !== null && p.cachedCount !== p.published);

  const gate = PRODUCTION_MIN_CONFIRMED_PINS;
  // 확정 핀은 있는데 비공개(내리기) 상태 — 다시 올릴 수 있는 조각
  const readyToPublish = pieces.filter((p) => canRepublishPiece(p, gate));

  const todo = [
    { label: "검수 대기 후보", n: candidates.length, href: "/admin/places?status=candidate" },
    { label: "요약 미작성", n: summaryMissing.length, href: "/admin/places?missing=summary" },
    { label: "좌표 없음", n: coordsMissing.length, href: "/admin/places?missing=coords" },
    { label: "업종 미지정", n: typeUnknown.length, href: "/admin/places?type=unknown" },
    { label: "주소가 모호함", n: vagueAddress.length, href: "/admin/places?flag=vague" },
    { label: "확정했으나 비공개", n: hidden.length, href: "/admin/places?flag=hidden" },
  ];
  const openTodo = todo.filter((t) => t.n > 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">대시보드</h1>
        <div className="flex items-center gap-2">
          <RecountButton />
          <Link
            href="/admin/places"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
          >
            장소 목록
          </Link>
        </div>
      </div>

      {dbError ? (
        <p role="alert" className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          DB 조회 실패: {dbError}
        </p>
      ) : null}

      {/* ── 경고: 놓치면 정책 위반이 누적되는 것부터 ── */}
      <div className="mt-6 space-y-2">
        {openTakedowns > 0 ? (
          <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
            미처리 삭제·정정 요청 <strong>{openTakedowns}건</strong> — 법정 절차입니다. 임시조치는
            30일 안에 결론을 내야 합니다.{" "}
            <Link href="/admin/queue" className="font-semibold underline underline-offset-2">
              처리하러 가기 →
            </Link>
          </p>
        ) : null}
        {staleVideos > 0 ? (
          <p role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
            영상 메타 {STALE_DAYS}일 경과 <strong>{staleVideos}건</strong> — YouTube API 정책상
            갱신이 필요합니다.{" "}
            <code className="rounded bg-amber-100 px-1">/api/cron/refresh-youtube-meta</code> 를
            실행하세요.
          </p>
        ) : null}
        {cacheDrift.length > 0 ? (
          <p role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
            통계 캐시가 실제와 다른 조각 <strong>{cacheDrift.length}건</strong> — 스크립트로 넣은
            데이터는 캐시를 갱신하지 않습니다. 위의 <strong>통계 재계산</strong>을 누르세요.
          </p>
        ) : null}
        {MIN_CONFIRMED_PINS !== PRODUCTION_MIN_CONFIRMED_PINS ? (
          <p className="rounded-md bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
            공개 게이트가 env 로 덮어써져 있습니다 —{" "}
            <code className="rounded bg-neutral-200 px-1">MIN_CONFIRMED_PINS={MIN_CONFIRMED_PINS}</code>
            . 제품 기준은 {PRODUCTION_MIN_CONFIRMED_PINS}핀입니다.
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── 이어서 할 일 ── */}
        <Card title="이어서 할 일">
          {openTodo.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">
              대기 중인 작업이 없습니다.
              <br />
              새 장소를 넣거나 검수할 차례입니다.
            </p>
          ) : (
            <ul>
              {openTodo.map((t) => (
                <li key={t.label} className="border-b border-neutral-100 last:border-0">
                  <Link
                    href={t.href}
                    className="-mx-2 flex items-baseline justify-between rounded px-2 py-2.5 transition hover:bg-neutral-50"
                  >
                    <span className="text-sm text-neutral-800">{t.label}</span>
                    <Num>{t.n}</Num>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-4 text-center">
            {[
              ["장소", places.length],
              ["공개", places.filter((p) => p.isPublished).length],
              ["조각", pieces.length],
            ].map(([label, n]) => (
              <div key={label as string}>
                <dt className="text-xs text-neutral-500">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* ── 조각 현황 ── */}
        <Card
          title="조각 현황"
          action={
            <Link href="/admin/pieces" className="text-sm text-neutral-500 hover:text-neutral-900">
              전체 보기 →
            </Link>
          }
        >
          {readyToPublish.length > 0 ? (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              비공개로 내려둔 조각 <strong>{readyToPublish.length}건</strong> —{" "}
              {readyToPublish
                .slice(0, 3)
                .map((p) => `${p.creatorName} × ${p.cityName}`)
                .join(", ")}
              {readyToPublish.length > 3 ? " 외" : ""} (다시 올릴 수 있음)
            </p>
          ) : null}
          {pieces.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">아직 조각이 없습니다.</p>
          ) : (
            /* 스크롤 컨테이너 — 없이 그리면 좁은 폭에서 표가 `Card` 밖으로 샌다.
               같은 종류의 표를 `pieces/PiecesClient.tsx` 가 이 패턴으로 처리한다. */
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[420px] text-sm">
              <thead className="text-left text-xs text-neutral-500">
                <tr className="border-b border-neutral-200">
                  <th className="pb-2 font-medium">조각</th>
                  <th className="pb-2 text-right font-medium">노출</th>
                  <th className="pb-2 text-right font-medium">대기</th>
                  <th className="pb-2 pl-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {pieces.slice(0, 10).map((p) => {
                  const isLive = isPieceLive(p, gate);
                  const canShow = hasConfirmableStock(p, gate);
                  return (
                    <tr key={`${p.creatorSlug}|${p.citySlug}`} className="border-b border-neutral-100 last:border-0">
                      <td className="py-2">
                        <Link
                          href={`/admin/places?creator=${p.creatorSlug}&city=${p.citySlug}`}
                          className="hover:underline"
                        >
                          {p.creatorName} <span className="text-neutral-400">×</span> {p.cityName}
                        </Link>
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">{p.published}</td>
                      <td className="py-2 text-right tabular-nums text-neutral-500">
                        {p.candidates + p.confirmedHidden || "—"}
                      </td>
                      <td className="py-2 pl-3">
                        {isLive ? (
                          <Pill tone="ok">노출 중</Pill>
                        ) : canShow ? (
                          <Pill tone="muted">비공개</Pill>
                        ) : (
                          <Pill tone="muted">핀 없음</Pill>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
