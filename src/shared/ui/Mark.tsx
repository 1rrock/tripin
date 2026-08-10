/**
 * GREATRIPIN 마크 — GT monogram (logo explorations §07).
 *
 * G + T. T 줄기만 왁스(공유 접힘). 핀·지도 아이콘 아님.
 * 인라인용: 배경 없음, 획은 currentColor, stem 은 --wax.
 */

type MarkProps = {
  className?: string;
  /** 단독 장식일 때 true — 부모 링크의 aria-label 에 맡긴다 */
  decorative?: boolean;
  title?: string;
};

export function Mark({ className, decorative = true, title }: MarkProps) {
  return (
    <svg
      viewBox="120 140 280 232"
      className={className}
      fill="none"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
    >
      {!decorative && title ? <title>{title}</title> : null}
      {/* G: square C + chin + spur (E 로 읽히지 않게 중바는 왼쪽에서 안 뺀다) */}
      <g
        stroke="currentColor"
        strokeWidth="40"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        <path d="M 140 160 H 292" />
        <path d="M 140 160 V 352" />
        <path d="M 140 352 H 292" />
        <path d="M 292 352 V 256 H 220" />
      </g>
      {/* T bar */}
      <path
        d="M 260 160 H 380"
        stroke="currentColor"
        strokeWidth="40"
        strokeLinecap="square"
      />
      {/* shared fold stem — wax */}
      <path
        d="M 328 160 V 352"
        stroke="var(--wax)"
        strokeWidth="40"
        strokeLinecap="square"
      />
    </svg>
  );
}

/** 앱 아이콘·파비콘용 풀 프레임 (암실 지면 + hairline 셀) */
export function MarkAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="Greatripin">
      <rect width="512" height="512" fill="#0b0b0c" />
      <rect
        x="36"
        y="36"
        width="440"
        height="440"
        fill="none"
        stroke="#2c2c31"
        strokeWidth="2"
      />
      <g
        fill="none"
        stroke="#f5f3ef"
        strokeWidth="40"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        <path d="M 140 160 H 292" />
        <path d="M 140 160 V 352" />
        <path d="M 140 352 H 292" />
        <path d="M 292 352 V 256 H 220" />
        <path d="M 260 160 H 380" />
      </g>
      <path
        d="M 328 160 V 352"
        fill="none"
        stroke="#ff3d14"
        strokeWidth="40"
        strokeLinecap="square"
      />
    </svg>
  );
}
