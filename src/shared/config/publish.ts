/**
 * 공개 게이트 — 채널×도시에 확정 핀이 이 수 이상이면 공개한다.
 *
 * 2026-08-10 운영자 결정: **1개면 충분.** 예전 8핀 완성형 조각 원칙은 폐기.
 * 빈 조각(0핀)만 막는다. 홈·허브·조각 페이지·사이트맵이 같은 상수를 쓴다.
 *
 * 환경변수로 덮어쓸 수 있다:
 *   NEXT_PUBLIC_MIN_CONFIRMED_PINS=0 npm run dev   ← 0이면 빈 조각까지 통과(비권장)
 *
 * ⚠️ NEXT_PUBLIC_ 값은 정적 리터럴로 접근해야 번들에 인라인된다 (`env.ts` 상단 주석 참조).
 */
const OVERRIDE = Number.parseInt(process.env["NEXT_PUBLIC_MIN_CONFIRMED_PINS"] ?? "", 10);

/** 제품 기준값 — 확정 핀 1개면 공개. */
export const PRODUCTION_MIN_CONFIRMED_PINS = 1;

export const MIN_CONFIRMED_PINS =
  Number.isInteger(OVERRIDE) && OVERRIDE >= 0 ? OVERRIDE : PRODUCTION_MIN_CONFIRMED_PINS;
