/**
 * EATRIPIN 워드마크 — slash coral 마크와 짝.
 *
 * 철자 EATRIPIN (t·p 각 1). 공유 T·P 만 왁스 — 이름 접힘 장치.
 * 마크가 이미 왁스 면이라 워드의 왁스는 글자 두 개에만 (면적 남발 금지).
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
      EA
      <span style={{ color: "var(--wax)" }}>T</span>
      RI
      <span style={{ color: "var(--wax)" }}>P</span>
      IN
    </span>
  );
}
