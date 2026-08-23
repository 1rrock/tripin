import type { AdminPiece } from "./shared";

/** 유저 화면 노출 여부 — places.is_published 핀 ≥ gate. */
export function isPieceLive(p: Pick<AdminPiece, "published">, gate: number): boolean {
  return p.published >= gate;
}

/**
 * 다시 올릴 수 있는가 — 확정 핀은 있으나 전부/일부 비공개(내리기) 상태.
 * 게이트를 채울 확정 핀 재고(노출+숨김)가 있을 때 true.
 */
export function canRepublishPiece(
  p: Pick<AdminPiece, "published" | "confirmedHidden">,
  gate: number,
): boolean {
  return p.published < gate && p.published + p.confirmedHidden >= gate;
}

/** 노출 가능 재고(확정 공개+숨김)가 게이트 이상. */
export function hasConfirmableStock(
  p: Pick<AdminPiece, "published" | "confirmedHidden">,
  gate: number,
): boolean {
  return p.published + p.confirmedHidden >= gate;
}
