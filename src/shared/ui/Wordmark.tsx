/**
 * GREATRIPIN 워드마크 — great+trip+pin, 공유 T·P 만 왁스.
 * 철자 GREATRIPIN (t·p 각 1). 오타 수정 금지.
 */

import type { CSSProperties } from "react";

type WordmarkProps = {
  className?: string;
  /** 기본 13px — 헤더 기준 */
  style?: CSSProperties;
  /** 부모 링크에 aria 가 있으면 true */
  decorative?: boolean;
};

export function Wordmark({ className, style, decorative = true }: WordmarkProps) {
  return (
    <span
      className={className}
      aria-hidden={decorative ? true : undefined}
      style={{
        fontFamily: "var(--font-archivo), sans-serif",
        fontWeight: 700,
        letterSpacing: "0.22em",
        fontSize: "13px",
        lineHeight: 1,
        color: "var(--paper)",
        /* tracking 끝 글자 광학 보정 */
        paddingRight: "0.22em",
        ...style,
      }}
    >
      GREA
      <span style={{ color: "var(--wax)" }}>T</span>
      RI
      <span style={{ color: "var(--wax)" }}>P</span>
      IN
    </span>
  );
}
