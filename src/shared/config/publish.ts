/**
 * 공개 게이트 — 완성형 조각 원칙 (PRODUCT.md "공개 게이트").
 *
 * 확정 핀이 이 수에 못 미치는 조각은 공개하지 않는다.
 * "밀도가 신뢰다"(원칙 2) — 빈 지도를 보여주면 서비스 전체가 비어 보인다.
 *
 * 적용 지점 네 곳이 같은 기준을 쓴다:
 *   · 홈(`/`)                    — 미달 조각을 크리에이터 카드의 도시 목록·집계에서 제외
 *   · 채널 허브(`/c/[creator]`)   — 미달 도시를 그리드에서 제외
 *   · 조각(`/c/[creator]/[city]`) — noindex + "준비 중" 화면 (404 아님: 운영자 미리보기는 살린다)
 *   · 사이트맵                    — 페이지가 noindex 하는 것을 사이트맵이 광고하면 신호가 엇갈린다
 *
 * ── 현재 상태: 게이트 해제 (2026-08-05, 사용자 지시) ──────────────
 * 0 이면 게이트가 완전히 꺼진다. 배포 전 개발 단계라 모든 조각을 화면에서 확인해야 하기 때문이다.
 *
 * 적용 코드는 그대로 남겨뒀다 — 되살릴 때 이 상수만 8 로 되돌리면 된다.
 * 배포 전에는 반드시 다시 켤 것. 근거는 PRODUCT.md "공개 게이트" 절.
 *
 * 환경변수로도 덮어쓸 수 있다:
 *   NEXT_PUBLIC_MIN_CONFIRMED_PINS=8 npm run dev   ← 게이트 동작 확인용
 *
 * ⚠️ NEXT_PUBLIC_ 값은 정적 리터럴로 접근해야 번들에 인라인된다 (`env.ts` 상단 주석 참조).
 */
const OVERRIDE = Number.parseInt(process.env["NEXT_PUBLIC_MIN_CONFIRMED_PINS"] ?? "", 10);

/** 배포 기준값 — PRODUCT.md 가 정한 완성형 조각의 크기. 지금은 적용하지 않는다. */
export const PRODUCTION_MIN_CONFIRMED_PINS = 8;

export const MIN_CONFIRMED_PINS = Number.isInteger(OVERRIDE) && OVERRIDE >= 0 ? OVERRIDE : 0;
