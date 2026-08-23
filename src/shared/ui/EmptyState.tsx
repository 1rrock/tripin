import type { ReactNode } from "react";

/**
 * 🔒 빈 화면 — "고장 난 앱"이 아니라 "아직 안 채워진 앱"으로 읽히게 한다.
 *
 * 🔴 다음 행동이 없는 빈 화면을 만들지 말 것.
 *    그래서 `children`(= 다음 행동)이 **필수**다. 예전에는 선택이었고,
 *    그 결과 8곳 중 이 컴포넌트를 쓴 건 한 곳뿐이었으며 나머지는 직접 그린
 *    막다른 문장이었다(`/celebs`·`/channels` 는 나갈 길조차 없었다).
 *    타입이 비게 두면 규칙은 주석으로만 남고 아무도 안 지킨다.
 *
 * 🔴 금지 — 다음 행동 자리에 "새로고침"·"다시 시도" 만 두기.
 *    그건 화면이 아니라 방문자에게 일을 떠넘기는 것이다. 이 앱에서
 *    갈 수 있는 **다른 곳**(지도·채널·홈)을 준다.
 */
export function EmptyState({
  message,
  children,
  className = "",
}: {
  message: string;
  /** 다음 행동. 없는 빈 화면은 만들지 않는다 — 그래서 선택이 아니다. */
  children: ReactNode;
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
