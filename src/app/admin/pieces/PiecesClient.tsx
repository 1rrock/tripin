"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { AdminPiece } from "../_lib/shared";
import { setPiecePublished } from "../actions";
import { Pill } from "../_ui/kit";

/**
 * 조각 목록 + 공개/비공개 토글.
 *
 * 상태 라벨은 **유저 화면과 같은 기준**이다 — `places.is_published` 핀 ≥ 게이트면 "노출 중".
 * `creator_cities.published_at` 은 수동 공개/내리기 기록용이며, 노출 판정에는 쓰지 않는다.
 * (채널 측 삭제 요청 등으로 내릴 때 버튼은 그대로 쓴다.)
 */
export function PiecesClient({ pieces, gate }: { pieces: AdminPiece[]; gate: number }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const hidden = pieces.filter(
    (p) => p.published < gate && p.published + p.confirmedHidden >= gate,
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          조각 <span className="text-base font-normal text-neutral-500">{pieces.length}</span>
        </h1>
        <p className="text-sm text-neutral-500">
          유저 노출 기준 <strong className="text-neutral-800">{gate}핀 이상</strong>
        </p>
      </div>

      {hidden.length > 0 ? (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          비공개로 내려둔 조각 <strong>{hidden.length}건</strong> — 다시 올릴 수 있습니다
        </p>
      ) : null}
      {toast ? (
        <p className="mt-3 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{toast}</p>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">조각</th>
              <th className="px-3 py-2.5 text-right font-medium">노출 핀</th>
              <th className="px-3 py-2.5 text-right font-medium">대기</th>
              <th className="px-3 py-2.5 text-right font-medium">요약 없음</th>
              <th className="px-3 py-2.5 font-medium">상태</th>
              <th className="px-4 py-2.5 text-right font-medium">동작</th>
            </tr>
          </thead>
          <tbody>
            {pieces.map((p) => {
              const key = `${p.creatorSlug}|${p.citySlug}`;
              const isLive = p.published >= gate;
              const canShow = p.published + p.confirmedHidden >= gate;
              const drift = p.cachedCount !== null && p.cachedCount !== p.published;
              const waiting = p.candidates + p.confirmedHidden;
              return (
                <tr key={key} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/places?creator=${p.creatorSlug}&city=${p.citySlug}`}
                      className="font-medium hover:underline"
                    >
                      {p.creatorName} <span className="text-neutral-400">×</span> {p.cityName}
                    </Link>
                    {drift ? (
                      <span className="ml-2 text-xs text-amber-700">
                        캐시 {p.cachedCount} ≠ 실제 {p.published}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                    {p.published}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-neutral-500">
                    {waiting || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {p.summaryMissing > 0 ? (
                      <span className="text-amber-700">{p.summaryMissing}</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isLive ? (
                      <Pill tone="ok">노출 중</Pill>
                    ) : canShow ? (
                      <Pill tone="muted">비공개</Pill>
                    ) : (
                      <Pill tone="muted">핀 없음</Pill>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex gap-1.5">
                      <a
                        href={`/c/${p.creatorSlug}/${p.citySlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50"
                      >
                        미리보기 ↗
                      </a>
                      <button
                        type="button"
                        disabled={pending || (!isLive && !canShow)}
                        title={
                          !isLive && !canShow
                            ? "확정·공개 가능한 핀이 없습니다"
                            : isLive
                              ? "유저 화면에서 이 조각을 내립니다 (삭제 요청 대응)"
                              : "확정 핀을 다시 유저 화면에 올립니다"
                        }
                        onClick={() => {
                          setBusy(key);
                          start(async () => {
                            const r = await setPiecePublished(p.creatorId, p.cityId, !isLive);
                            setToast(r.ok ?? r.error ?? null);
                            setBusy(null);
                          });
                        }}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          isLive
                            ? "border border-neutral-300 hover:bg-neutral-50"
                            : "bg-neutral-900 text-white hover:bg-neutral-700"
                        }`}
                      >
                        {busy === key && pending ? "…" : isLive ? "내리기" : "올리기"}
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        상태는 유저 화면과 같습니다 — 노출 핀({gate}개 이상)이면 사이트에 나옵니다.{" "}
        <strong>내리기</strong>는 채널 측 삭제·비공개 요청용입니다. 요약이 빠진 장소는 AdSense
        독립적 가치 요건에 걸릴 수 있으니 채우는 것을 권합니다.
      </p>
    </main>
  );
}
