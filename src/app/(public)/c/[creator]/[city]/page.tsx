import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/shared/api/supabase";
import type { PlaceType } from "@/shared/api/database.types";
import { Explorer, type PublicPlace } from "./Explorer";

/**
 * ★ 채널×도시 — 이 서비스의 핵심 페이지 (CONCEPT.md 4.3).
 * anon 클라이언트 → RLS 가 공개(is_published) 데이터만 내려준다.
 */
export const revalidate = 3600;

interface PageParams {
  creator: string;
  city: string;
}

async function loadPiece(params: PageParams) {
  const [{ data: creator }, { data: city }] = await Promise.all([
    supabase.from("creators").select("*").eq("slug", params.creator).single(),
    supabase.from("cities").select("*").eq("slug", params.city).single(),
  ]);
  if (!creator || !city) return null;

  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, youtube_video_id")
    .eq("creator_id", creator.id);
  const videoById = new Map((videos ?? []).map((v) => [v.id, v]));

  const videoIds = (videos ?? []).map((v) => v.id);
  const { data: links } = videoIds.length
    ? await supabase
        .from("video_places")
        .select("video_id, place_id, timestamp_sec")
        .in("video_id", videoIds)
    : { data: [] };

  const placeIds = [...new Set((links ?? []).map((l) => l.place_id))];
  const { data: places } = placeIds.length
    ? await supabase
        .from("places")
        .select(
          "id, slug, name, name_local, place_type, map_status, lat, lng, address, summary, summary_bullets, price_hint, google_place_id, google_maps_url, kakao_place_id, naver_place_id",
        )
        .in("id", placeIds)
        .eq("city_id", city.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const publicPlaces: PublicPlace[] = (places ?? []).map((p) => {
    const link = (links ?? []).find((l) => l.place_id === p.id);
    const video = link ? videoById.get(link.video_id) : undefined;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameLocal: p.name_local,
      placeType: p.place_type,
      mapStatus: p.map_status,
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      googlePlaceId: p.google_place_id,
      googleMapsUrl: p.google_maps_url,
      kakaoPlaceId: p.kakao_place_id,
      naverPlaceId: p.naver_place_id,
      summary: p.summary,
      summaryBullets: p.summary_bullets,
      priceHint: p.price_hint,
      videoTitle: video?.title ?? null,
      youtubeVideoId: video?.youtube_video_id ?? null,
      timestampSec: link?.timestamp_sec ?? null,
    };
  });

  const { data: piece } = await supabase
    .from("creator_cities")
    .select("intro_text")
    .eq("creator_id", creator.id)
    .eq("city_id", city.id)
    .maybeSingle();

  return { creator, city, places: publicPlaces, introText: piece?.intro_text ?? null };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const data = await loadPiece(await params);
  if (!data) return { title: "찾을 수 없는 페이지" };
  const confirmed = data.places.filter((p) => p.mapStatus === "confirmed");
  const topNames = confirmed.slice(0, 3).map((p) => p.name).join(", ");
  return {
    title: `${data.creator.display_name} ${data.city.name} 맛집·간 곳 지도 (${confirmed.length}곳)`,
    description: `${data.creator.display_name}이(가) ${data.city.name}에서 간 곳 ${confirmed.length}곳 — ${topNames}. 모든 장소에 출처 영상 링크 포함.`,
  };
}

export default async function CreatorCityPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  const data = await loadPiece(routeParams);
  if (!data) notFound();

  return (
    <Explorer
      creatorName={data.creator.display_name}
      accentColor={data.creator.accent_color}
      cityName={data.city.name}
      introText={data.introText}
      places={data.places}
      activeType={(query.type as PlaceType | undefined) ?? null}
      basePath={`/c/${routeParams.creator}/${routeParams.city}`}
    />
  );
}
