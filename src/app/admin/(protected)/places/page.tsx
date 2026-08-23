import type { Metadata } from "next";
import { Suspense } from "react";
import { loadAdminPlaces } from "../_lib/queries";
import { PlacesClient } from "./PlacesClient";

export const metadata: Metadata = { title: "장소 — Eatripin 어드민" };
export const dynamic = "force-dynamic";

/**
 * 장소 목록 — 어드민의 실질적 홈.
 *
 * 이 화면이 없어서 불편했다. 기존 `/admin/confirm` 은 크리에이터 → 도시를 고른 **뒤에야**
 * 목록이 나와서, "전체에서 뭐가 이상한지"를 볼 수가 없었다.
 * 여기서는 전부 한 번에 불러 클라이언트에서 거른다 — 검색·필터가 **전체**를 대상으로
 * 돌아야 운영자가 "어디 있는지 모르는 한 곳"을 찾을 수 있기 때문이다.
 *
 * ⚠️ "수백 건 규모" 는 옛말이다 — 실측 1,903행이다. 그래서 목록을 통째로 그리지 않고
 *    `PlacesClient` 가 화면에 올리는 행 수를 잘라 "더 보기"로 늘린다(거르기는 전체 대상).
 *    페이로드 자체(~1.3 MB)는 그대로다. 더 줄이려면 필터·검색을 서버로 옮겨야 하는데,
 *    그건 이 화면의 조작 방식을 바꾸는 일이라 별건으로 둔다.
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
