/**
 * EATRIPIN 마크 — Slash coral.
 *
 * 왁스 면 + 잉크 슬래시 한 획. 콘택트 시트 "표시" 제스처.
 * 핀·지도 아이콘 아님.
 *
 * 인라인(헤더): 왁스 면 + 잉크 슬래시 (--paper).
 * 앱 아이콘: 고정 헥스 (파비콘·OG 는 CSS 변수 없음).
 */

type MarkProps = {
  className?: string;
  /** 단독 장식일 때 true — 부모 링크의 aria-label 에 맡긴다 */
  decorative?: boolean;
  title?: string;
};

/**
 * 512 기준 광학 중심 −45° 슬래시.
 * 끝단을 안쪽으로 두어 square cap 이 모서리에 붙지 않게.
 * stroke 68 — 72 보다 살짝 가볍게, 16px 에서도 한 획으로 남음.
 */
const SLASH = "M 148 364 L 364 148";
const SLASH_WIDTH = 68;

export function Mark({ className, decorative = true, title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      fill="none"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
    >
      {!decorative && title ? <title>{title}</title> : null}
      {/* 헤더 28px 에서도 면으로 읽히게 약한 라운드 */}
      <rect width="512" height="512" rx="88" fill="var(--wax)" />
      <path
        d={SLASH}
        stroke="var(--paper)"
        strokeWidth={SLASH_WIDTH}
        strokeLinecap="square"
      />
    </svg>
  );
}

/** 앱 아이콘·파비콘용 (웜 페이퍼 월드 토큰 고정) */
export function MarkAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="Eatripin">
      <rect width="512" height="512" fill="#c9441a" />
      <path
        d={SLASH}
        fill="none"
        stroke="#2a2118"
        strokeWidth={SLASH_WIDTH}
        strokeLinecap="square"
      />
    </svg>
  );
}
