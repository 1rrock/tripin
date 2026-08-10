import type { Metadata } from "next";
import { Suspense } from "react";
import { loadAdminPlaces } from "../_lib/queries";
import { PlacesClient } from "./PlacesClient";

export const metadata: Metadata = { title: "장소 — Greatripin 어드민" };
export const dynamic = "force-dynamic";

/**
 * 장소 목록 — 어드민의 실질적 홈.
 *
 * 이 화면이 없어서 불편했다. 기존 `/admin/confirm` 은 크리에이터 → 도시를 고른 **뒤에야**
 * 목록이 나와서, "전체에서 뭐가 이상한지"를 볼 수가 없었다.
 * 여기서는 전부 한 번에 불러 클라이언트에서 거른다 — 수백 건 규모라 서버 왕복이 오히려 느리다.
 */
export default async function AdminPlacesPage() {
  const places = await loadAdminPlaces();
  // useSearchParams 는 Suspense 경계를 요구한다 (대시보드에서 ?missing=summary 로 넘어온다)
  return (
    <Suspense fallback={<p className="px-6 py-8 text-sm text-neutral-500">불러오는 중…</p>}>
      <PlacesClient places={places} />
    </Suspense>
  );
}
