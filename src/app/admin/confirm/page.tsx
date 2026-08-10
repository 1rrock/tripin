import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { ConfirmClient, type City, type Creator, type Video } from "./ConfirmClient";

export const metadata: Metadata = { title: "손입력 — Greatripin 어드민" };
export const dynamic = "force-dynamic";

/**
 * 손입력 화면.
 *
 * 예전에는 여기서 장소 목록까지 조회했는데, 훑어보기는 `/admin/places` 로 갔다.
 * 이 페이지는 **선택지 3종(크리에이터·도시·영상)** 만 있으면 된다.
 * 영상은 전 채널 것을 한 번에 받아 클라이언트에서 고른다 — 채널을 바꿀 때마다
 * 서버 왕복을 하면 입력 흐름이 끊긴다.
 */
export default async function ConfirmPage() {
  const db = getSupabaseAdmin();
  const [{ data: creators }, { data: cities }, { data: videos }] = await Promise.all([
    db.from("creators").select("id, slug, display_name").order("display_name"),
    db.from("cities").select("id, slug, name, country_code").order("name"),
    db.from("videos").select("id, title, creator_id").order("created_at", { ascending: false }),
  ]);

  return (
    <ConfirmClient
      creators={(creators ?? []) as Creator[]}
      cities={(cities ?? []) as City[]}
      videos={(videos ?? []) as Video[]}
    />
  );
}
