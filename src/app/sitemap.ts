import type { MetadataRoute } from "next";
import { supabase } from "@/shared/api/supabase";
import { publicEnv } from "@/shared/config/env";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";

/**
 * 사이트맵 — 홈 + 진입점(지역·채널·지도) + 공개 게이트를 통과한 채널 허브·조각·도시.
 *
 * 게이트 미달 조각은 페이지가 noindex 를 내보내므로(`[city]/page.tsx`),
 * 사이트맵도 같은 기준으로 잘라야 한다 — 광고해놓고 색인을 막는 모순을 만들지 않는다.
 * anon 클라이언트라 RLS 가 is_published 데이터만 내려준다.
 *
 * 도시 페이지(`/city/[city]`)는 조각과 장소가 겹치지만 둘 다 넣는다 —
 * "곽튜브 도쿄"와 "도쿄"는 다른 질의라 서로를 끌어내리지 않는다.
 * 영상 페이지만 noindex 이고 그건 같은 채널의 조각과 같은 상호명으로 싸우기 때문이다.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl.replace(/\/$/, "");
  const now = new Date();
  const home: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/city`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/channels`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/map`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  const [{ data: creators }, { data: cities }, { data: places }] = await Promise.all([
    supabase.from("creators").select("id, slug, updated_at"),
    supabase.from("cities").select("id, slug"),
    supabase.from("places").select("id, city_id").eq("map_status", "confirmed"),
  ]);
  if (!creators?.length || !cities?.length || !places?.length) return home;

  const cityIdBySlug = new Map(cities.map((c) => [c.id, c.slug]));
  const cityByPlace = new Map(places.map((p) => [p.id, p.city_id]));

  const [{ data: videos }, { data: links }] = await Promise.all([
    supabase.from("videos").select("id, creator_id"),
    supabase.from("video_places").select("video_id, place_id").in("place_id", [...cityByPlace.keys()]),
  ]);
  const creatorByVideo = new Map((videos ?? []).map((v) => [v.id, v.creator_id]));

  // 크리에이터 → 도시 → 확정 장소 집합. 같은 장소가 여러 영상에 나와도 한 번만 센다
  const byCreator = new Map<string, Map<string, Set<string>>>();
  for (const link of links ?? []) {
    const creatorId = creatorByVideo.get(link.video_id);
    const cityId = cityByPlace.get(link.place_id);
    if (!creatorId || !cityId) continue;
    let cityMap = byCreator.get(creatorId);
    if (!cityMap) byCreator.set(creatorId, (cityMap = new Map()));
    let placeSet = cityMap.get(cityId);
    if (!placeSet) cityMap.set(cityId, (placeSet = new Set()));
    placeSet.add(link.place_id);
  }

  const entries: MetadataRoute.Sitemap = [];

  // 도시 페이지 — 확정 장소가 게이트를 넘는 도시. 채널을 가로지르므로 여기서 따로 센다
  const placesByCity = new Map<string, Set<string>>();
  for (const [placeId, cityId] of cityByPlace) {
    const set = placesByCity.get(cityId) ?? new Set<string>();
    set.add(placeId);
    placesByCity.set(cityId, set);
  }
  for (const [cityId, placeSet] of placesByCity) {
    if (placeSet.size < MIN_CONFIRMED_PINS) continue;
    const slug = cityIdBySlug.get(cityId);
    if (!slug) continue;
    entries.push({
      url: `${base}/city/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  for (const creator of creators) {
    const cityMap = byCreator.get(creator.id);
    if (!cityMap) continue;
    const lastModified = new Date(creator.updated_at);

    const citySlugs = [...cityMap.entries()]
      .filter(([, placeSet]) => placeSet.size >= MIN_CONFIRMED_PINS)
      .map(([cityId]) => cityIdBySlug.get(cityId))
      .filter((slug): slug is string => Boolean(slug));
    if (citySlugs.length === 0) continue;

    entries.push({
      url: `${base}/c/${creator.slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    for (const citySlug of citySlugs) {
      entries.push({
        url: `${base}/c/${creator.slug}/${citySlug}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
  }

  return [...home, ...entries];
}
