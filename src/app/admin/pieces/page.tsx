import type { Metadata } from "next";
import { PRODUCTION_MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { loadAdminPieces } from "../_lib/queries";
import { PiecesClient } from "./PiecesClient";

export const metadata: Metadata = { title: "조각 — Greatripin 어드민" };
export const dynamic = "force-dynamic";

/**
 * 조각(채널×도시) 노출 현황 + 수동 내리기/올리기.
 *
 * 상태 라벨은 places.is_published 기준(유저와 동일). 내리기 버튼은 삭제 요청 대응용.
 */
export default async function AdminPiecesPage() {
  const { pieces } = await loadAdminPieces(PRODUCTION_MIN_CONFIRMED_PINS);
  return <PiecesClient pieces={pieces} gate={PRODUCTION_MIN_CONFIRMED_PINS} />;
}
