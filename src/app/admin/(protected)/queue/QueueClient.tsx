"use client";

import { useState, useTransition } from "react";
import { blindTarget, closeRequest } from "./actions";
import { Pill } from "../_ui/kit";

export interface TakedownRow {
  id: string;
  targetType: string;
  targetId: string | null;
  targetUrl: string | null;
  targetName: string | null;
  requesterEmail: string | null;
  reason: string;
  status: string;
  blindedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

/** 임시조치 기간 — 정보통신망법 §44조의2④. */
const TEMP_MEASURE_DAYS = 30;

/**
 * `other` 는 `/api/takedown` 이 붙인다 — 붙여넣은 URL 이 우리 라우트로 해석되지
 * 않은 접수다(구글 지도 링크, 오타, URL 없음). 접수를 막지 않는 대신 여기서
 * "확인 필요"로 보인다. 라벨이 없으면 이 칸이 빈 채로 나가 종류를 알 수 없다.
 */
const TARGET_LABEL: Record<string, string> = {
  place: "장소",
  creator: "채널",
  video: "영상",
  other: "미상",
};

const STATUS_LABEL: Record<string, string> = {
  received: "접수",
  blinded: "임시조치 중",
  resolved: "해결",
  rejected: "반려",
};

function daysLeft(blindedAt: string, nowIso: string): number {
  const elapsed = (Date.parse(nowIso) - Date.parse(blindedAt)) / 86400_000;
  return Math.ceil(TEMP_MEASURE_DAYS - elapsed);
}

export function QueueClient({
  rows,
  nowIso,
  loadError,
}: {
  rows: TakedownRow[];
  nowIso: string;
  loadError: string | null;
}) {
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const open = rows.filter((r) => r.status === "received" || r.status === "blinded");
  const closed = rows.filter((r) => r.status === "resolved" || r.status === "rejected");
  // 기한이 지난 건은 맨 위로 — 놓치면 법정 기한 위반이다
  const sorted = [...open].sort((a, b) => {
    const la = a.blindedAt ? daysLeft(a.blindedAt, nowIso) : 999;
    const lb = b.blindedAt ? daysLeft(b.blindedAt, nowIso) : 999;
    return la - lb;
  });

  const run = (fn: () => Promise<{ ok?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setToast(r.ok ?? r.error ?? null);
    });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight">
        삭제·정정 요청{" "}
        <span className="text-base font-normal text-neutral-500 tabular-nums">{open.length}</span>
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        법정 절차입니다 — 접수 시 <strong>지체 없이</strong> 조치하고 신청인·게재자 양쪽에
        통지해야 하며(§44조의2②), 임시조치는 <strong>{TEMP_MEASURE_DAYS}일 안에</strong> 결론을
        내야 합니다(§44조의2④). 신고가 없어도 선제 비공개가 가능합니다(§44조의3).
      </p>

      {loadError ? (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          조회 실패: {loadError} — <strong>요청이 없다는 뜻이 아닙니다.</strong> 새로고침해도 같은
          오류면 접수분이 보이지 않는 상태이므로 30일 기한(§44조의2④)을 손으로 확인하세요.
        </p>
      ) : null}
      {toast ? (
        <p className="mt-4 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{toast}</p>
      ) : null}

      {/* 조회가 실패했을 때 "없습니다"를 그리지 않는다 — 빈손과 못 읽음은 다른 상태다 */}
      {loadError ? null : open.length === 0 ? (
        <p className="mt-6 rounded-lg border border-neutral-200 bg-white py-12 text-center text-sm text-neutral-500 shadow-sm">
          처리할 요청이 없습니다.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sorted.map((r) => {
            const left = r.blindedAt ? daysLeft(r.blindedAt, nowIso) : null;
            const overdue = left !== null && left < 0;
            return (
              <li
                key={r.id}
                className={`rounded-lg border bg-white p-4 shadow-sm ${
                  overdue ? "border-red-400" : "border-neutral-200"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={r.status === "blinded" ? "warn" : "muted"}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Pill>
                  <span className="text-sm font-medium text-neutral-900">
                    {TARGET_LABEL[r.targetType] ?? r.targetType}
                    {r.targetName ? ` · ${r.targetName}` : ""}
                  </span>
                  <span className="text-xs tabular-nums text-neutral-400">
                    접수 {r.createdAt.slice(0, 10)}
                  </span>
                  {left !== null ? (
                    <Pill tone={overdue ? "danger" : left <= 7 ? "warn" : "muted"}>
                      {overdue ? `기한 ${-left}일 초과` : `${left}일 남음`}
                    </Pill>
                  ) : null}
                </div>

                <p className="mt-2 text-sm whitespace-pre-wrap text-neutral-800">{r.reason}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {r.requesterEmail ? `from: ${r.requesterEmail}` : "연락처 없음"}
                  {r.targetUrl ? (
                    <>
                      {" · "}
                      <a
                        href={r.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:underline"
                      >
                        대상 URL ↗
                      </a>
                    </>
                  ) : null}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                  {r.status !== "blinded" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => blindTarget(r.id))}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      즉시 비공개 (임시조치)
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => closeRequest(r.id, "resolved"))}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
                  >
                    해결 처리
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => closeRequest(r.id, "rejected"))}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
                  >
                    반려
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {closed.length > 0 ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-neutral-500">
            종결된 요청 {closed.length}건
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            {closed.map((r) => (
              <li key={r.id} className="rounded border border-neutral-200 bg-white px-3 py-2">
                <span className="text-neutral-400">{r.createdAt.slice(0, 10)}</span>{" "}
                {STATUS_LABEL[r.status]} · {TARGET_LABEL[r.targetType] ?? r.targetType}
                {r.targetName ? ` · ${r.targetName}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
