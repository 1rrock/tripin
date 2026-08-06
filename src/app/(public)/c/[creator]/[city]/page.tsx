import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/shared/api/supabase";
import type { PlaceType } from "@/shared/api/database.types";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { Explorer, type PublicPlace, type RelatedPiece } from "./Explorer";

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

  const [otherCities, otherCreators] = await Promise.all([
    loadOtherCities(placeIds, city.id),
    loadOtherCreators(creator.id, city.id),
  ]);

  return {
    creator,
    city,
    places: publicPlaces,
    introText: piece?.intro_text ?? null,
    otherCities,
    otherCreators,
  };
}

/** 이 크리에이터의 확정 장소가 있는 다른 도시 — 다음 행동 칩용. */
async function loadOtherCities(placeIds: string[], currentCityId: string): Promise<RelatedPiece[]> {
  if (placeIds.length === 0) return [];
  const { data: allPlaces } = await supabase
    .from("places")
    .select("id, city_id, map_status")
    .in("id", placeIds);
  const countByCity = new Map<string, number>();
  for (const p of allPlaces ?? []) {
    if (p.map_status !== "confirmed" || p.city_id === currentCityId) continue;
    countByCity.set(p.city_id, (countByCity.get(p.city_id) ?? 0) + 1);
  }
  if (countByCity.size === 0) return [];
  const { data: cities } = await supabase
    .from("cities")
    .select("id, slug, name")
    .in("id", [...countByCity.keys()]);
  return (cities ?? [])
    .map((c) => ({ slug: c.slug, name: c.name, count: countByCity.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

/** 같은 도시에 확정 장소가 있는 다른 크리에이터 — 교차 뷰로 가는 유일한 입구. */
async function loadOtherCreators(
  currentCreatorId: string,
  cityId: string,
): Promise<RelatedPiece[]> {
  const { data: cityPlaces } = await supabase
    .from("places")
    .select("id")
    .eq("city_id", cityId)
    .eq("map_status", "confirmed");
  const cityPlaceIds = (cityPlaces ?? []).map((p) => p.id);
  if (cityPlaceIds.length === 0) return [];

  const { data: cityLinks } = await supabase
    .from("video_places")
    .select("video_id, place_id")
    .in("place_id", cityPlaceIds);
  const cityVideoIds = [...new Set((cityLinks ?? []).map((l) => l.video_id))];
  if (cityVideoIds.length === 0) return [];

  const { data: cityVideos } = await supabase
    .from("videos")
    .select("id, creator_id")
    .in("id", cityVideoIds);
  const creatorByVideo = new Map((cityVideos ?? []).map((v) => [v.id, v.creator_id]));
  const placesByCreator = new Map<string, Set<string>>();
  for (const link of cityLinks ?? []) {
    const creatorId = creatorByVideo.get(link.video_id);
    if (!creatorId || creatorId === currentCreatorId) continue;
    if (!placesByCreator.has(creatorId)) placesByCreator.set(creatorId, new Set());
    placesByCreator.get(creatorId)!.add(link.place_id);
  }
  if (placesByCreator.size === 0) return [];

  const { data: creators } = await supabase
    .from("creators")
    .select("id, slug, display_name")
    .in("id", [...placesByCreator.keys()]);
  return (creators ?? [])
    .map((c) => ({
      slug: c.slug,
      name: c.display_name,
      count: placesByCreator.get(c.id)?.size ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const routeParams = await params;
  const data = await loadPiece(routeParams);
  if (!data) return { title: "찾을 수 없는 페이지" };
  const confirmed = data.places.filter((p) => p.mapStatus === "confirmed");
  const topNames = confirmed.slice(0, 3).map((p) => p.name).join(", ");
  const title = `${data.creator.display_name} ${data.city.name} 맛집·간 곳 지도 (${confirmed.length}곳)`;
  const description = `${data.creator.display_name}이(가) ${data.city.name}에서 간 곳 ${confirmed.length}곳 — ${topNames}. 모든 장소에 출처 영상 링크 포함.`;
  const url = `/c/${routeParams.creator}/${routeParams.city}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", url },
    // 공개 게이트 — 미달 조각은 직접 링크로만 열리고 검색에는 노출하지 않는다
    ...(confirmed.length < MIN_CONFIRMED_PINS
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

/** 브레드크럼 구분자 — Explorer 와 같은 SVG 획. */
function CrumbIcon() {
  return (
    <svg
      aria-hidden
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-1 inline text-line"
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}

/**
 * 준비 중 화면 — 확정 핀이 게이트에 못 미치는 조각.
 * 404 가 아니라 200 + noindex: 직접 링크(운영자 미리보기)는 살리고 검색에서만 뺀다.
 */
function PendingPiece({
  creatorName,
  cityName,
  confirmedCount,
}: {
  creatorName: string;
  cityName: string;
  confirmedCount: number;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 pt-8 pb-16 md:px-8">
      <nav className="flex items-center text-xs text-ink-soft">
        <Link href="/" className="font-medium transition hover:text-ink">
          홈
        </Link>
        <CrumbIcon />
        <span>{creatorName}</span>
        <CrumbIcon />
        <span className="text-ink">{cityName}</span>
      </nav>
      <h1 className="mt-3.5 text-3xl font-black tracking-tight">
        {creatorName}의 {cityName}
      </h1>
      <div className="mt-6 rounded-2xl border border-line bg-card p-6">
        <p className="text-[15px] leading-relaxed">이 조각은 아직 준비 중이에요.</p>
        <p className="mt-2 text-[13px] text-ink-soft">
          확정 장소{" "}
          <b className="tnum font-extrabold text-ink">
            {confirmedCount}/{MIN_CONFIRMED_PINS}
          </b>{" "}
          · {MIN_CONFIRMED_PINS}곳을 채우면 공개돼요
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-9 items-center rounded-full bg-fill px-3.5 text-[13px] font-bold transition hover:bg-line active:scale-[0.97]"
        >
          공개된 조각 보기
        </Link>
      </div>
    </main>
  );
}

export default async function CreatorCityPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<{ type?: string; picked?: string }>;
}) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  const data = await loadPiece(routeParams);
  if (!data) notFound();

  // 공개 게이트 — 확정 핀 미달 조각은 Explorer 대신 준비 중 화면 (404 아님)
  const confirmedCount = data.places.filter((p) => p.mapStatus === "confirmed").length;
  if (confirmedCount < MIN_CONFIRMED_PINS) {
    return (
      <PendingPiece
        creatorName={data.creator.display_name}
        cityName={data.city.name}
        confirmedCount={confirmedCount}
      />
    );
  }

  return (
    <Explorer
      creatorName={data.creator.display_name}
      accentColor={data.creator.accent_color}
      cityName={data.city.name}
      introText={data.introText}
      places={data.places}
      activeType={(query.type as PlaceType | undefined) ?? null}
      basePath={`/c/${routeParams.creator}/${routeParams.city}`}
      initialPicked={query.picked?.split(",").filter(Boolean) ?? []}
      otherCities={data.otherCities}
      otherCreators={data.otherCreators}
    />
  );
}
