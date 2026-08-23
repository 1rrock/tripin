/**
 * 어드민 공용 프리미티브.
 *
 * ⚠️ 공개 화면의 디자인 토큰(`globals.css` 의 --ground/--wax …)을 쓰지 않는다.
 *    어드민은 콘택트 시트 월드 밖이고, Tailwind neutral 팔레트로 간다.
 *    여기 색을 공개 화면과 맞추려 들면 두 월드가 섞인다.
 */

import type { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** 카운트 — 0 이면 조용히, 있으면 눈에 띄게. */
export function Num({ children }: { children: number }) {
  return children > 0 ? (
    <strong className="text-sm font-semibold tabular-nums text-neutral-900">{children}건 →</strong>
  ) : (
    <span className="text-sm text-neutral-400">없음</span>
  );
}

const TONES = {
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ready: "bg-blue-50 text-blue-800 ring-blue-200",
  warn: "bg-amber-50 text-amber-900 ring-amber-200",
  danger: "bg-red-50 text-red-800 ring-red-200",
  muted: "bg-neutral-100 text-neutral-600 ring-neutral-200",
} as const;

export function Pill({
  tone = "muted",
  children,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
