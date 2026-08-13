import type { ReactNode } from "react";

/**
 * 빈 화면 — "고장 난 앱"이 아니라 "아직 안 채워진 앱"으로 읽히게 한다.
 *
 * 🔴 다음 행동이 없는 빈 화면을 만들지 말 것.
 */
export function EmptyState({
  message,
  children,
  className = "",
}: {
  message: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-4 px-(--gutter) py-20 text-center ${className}`}
    >
      <p
        className="max-w-xs text-pretty"
        style={{ fontSize: "var(--t-meta)", lineHeight: 1.6, color: "var(--dim)" }}
      >
        {message}
      </p>
      {children}
    </div>
  );
}
