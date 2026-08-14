/**
 * EATRIPIN 마크 — TP ligature.
 *
 * 06-tp-ligature 시안: T 깃발이 P 위에 걸치고, P 윗줄기는 패인다.
 * 크림 면 + 산호 리거처. 핀·지도 아이콘 아님.
 */

import { MARK_CREAM, MARK_WAX, TP_COUNTER, TP_OUTER } from "./mark-geom";

type MarkProps = {
  className?: string;
  /** 단독 장식일 때 true — 부모 링크의 aria-label 에 맡긴다 */
  decorative?: boolean;
  title?: string;
};

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
      <rect width="512" height="512" rx="88" fill={MARK_CREAM} />
      <path d={`${TP_OUTER} ${TP_COUNTER}`} fill="var(--wax)" fillRule="evenodd" />
    </svg>
  );
}

/** 앱 아이콘·파비콘용 (CSS 변수 없음 — 고정 헥스) */
export function MarkAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="Eatripin">
      <rect width="512" height="512" fill={MARK_CREAM} />
      <path d={`${TP_OUTER} ${TP_COUNTER}`} fill={MARK_WAX} fillRule="evenodd" />
    </svg>
  );
}
