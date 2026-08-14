/**
 * Eatripin 워드마크 — TP ligature 마크와 짝.
 *
 * 철자 eatripin (t·p 각 1). 화면은 로마자, 읽히는 이름은 부모 aria.
 * 산호는 글자 두 개(t·p)에만 — 면적을 먹지 않는다.
 */

import type { CSSProperties } from "react";

type WordmarkProps = {
  className?: string;
  style?: CSSProperties;
  decorative?: boolean;
};

export function Wordmark({ className, style, decorative = true }: WordmarkProps) {
  return (
    <span
      className={className}
      aria-hidden={decorative ? true : undefined}
      style={{
        fontFamily: "var(--font-paper), var(--font-archivo), sans-serif",
        fontWeight: 700,
        letterSpacing: "-0.035em",
        fontSize: "17px",
        lineHeight: 1,
        color: "var(--paper)",
        ...style,
      }}
    >
      ea
      <span style={{ color: "var(--wax)" }}>t</span>
      ri
      <span style={{ color: "var(--wax)" }}>p</span>
      in
    </span>
  );
}
