import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import type { City, Creator, Video } from "@/shared/api/database.types";
import { ConfirmClient, type PieceRow } from "./ConfirmClient";

export const metadata: Metadata = {
  title: "장소 확정 — Tripin 어드민",
};

export const dynamic = "force-dynamic";

/**
 * 크리에이터의 장소 목록.
 *   cityId 지정  → 해당 조각(작업 모드)
 *   cityId null  → 전 도시(브라우즈 모드 — 핀 훑어보기)
 */
async function loadRows(creatorId: string | null, cityId: string | null): Promise<PieceRow[]> {
  if (!creatorId) return [];
  const db = getSupabaseAdmin();

  const { data: videos } = await db
    .from("videos")
    .select("id, title, youtube_video_id")
    .eq("creator_id", creatorId);
  if (!videos || videos.length === 0) return [];
  const videoById = new Map(videos.map((v) => [v.id, v]));

  const { data: links } = await db
    .from("video_places")
    .select("video_id, place_id, timestamp_sec")
    .in(
      "video_id",
      videos.map((v) => v.id),
    );
  if (!links || links.length === 0) return [];

  let query = db
    .from("places")
    .select(
      "id, slug, name, name_local, place_type, map_status, lat, lng, address, source_note, summary, summary_bullets, city_id, google_place_id, google_maps_url, kakao_place_id, naver_place_id",
    )
    .in("id", [...new Set(links.map((l) => l.place_id))])
    .order("created_at", { ascending: true });
  if (cityId) query = query.eq("city_id", cityId);
  const { data: places } = await query;
  if (!places) return [];

  const cityIds = [...new Set(places.map((p) => p.city_id))];
  const { data: cities } = cityIds.length
    ? await db.from("cities").select("id, name").in("id", cityIds)
    : { data: [] };
  const cityNameById = new Map((cities ?? []).map((c) => [c.id, c.name]));

  return places.map((p) => {
    const link = links.find((l) => l.place_id === p.id);
    const video = link ? videoById.get(link.video_id) : undefined;
    return {
      ...p,
      cityName: cityNameById.get(p.city_id) ?? "",
      videoTitle: video?.title ?? "(영상 없음)",
      youtubeVideoId: video?.youtube_video_id ?? null,
      timestampSec: link?.timestamp_sec ?? null,
    };
  });
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ creator?: string; city?: string }>;
}) {
  const params = await searchParams;
  const db = getSupabaseAdmin();

  const [{ data: creators }, { data: cities }] = await Promise.all([
    db.from("creators").select("*").order("display_name"),
    db.from("cities").select("*").order("name"),
  ]);

  const creator = (creators ?? []).find((c) => c.slug === params.creator) ?? null;
  const city = (cities ?? []).find((c) => c.slug === params.city) ?? null;

  const [{ data: videos }, rows] = await Promise.all([
    creator
      ? db
          .from("videos")
          .select("*")
          .eq("creator_id", creator.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Video[] }),
    loadRows(creator?.id ?? null, city?.id ?? null),
  ]);

  return (
    <ConfirmClient
      creators={(creators ?? []) as Creator[]}
      cities={(cities ?? []) as City[]}
      videos={(videos ?? []) as Video[]}
      selectedCreator={creator as Creator | null}
      selectedCity={city as City | null}
      rows={rows}
    />
  );
}
