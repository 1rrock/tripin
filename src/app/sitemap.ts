import type { MetadataRoute } from "next";
import { fetchAll } from "@/shared/api/chunked-in";
import { supabase } from "@/shared/api/supabase";
import { publicEnv } from "@/shared/config/env";
import { MIN_CITY_PINS, MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { loadPlaceSitemapRows } from "@/shared/api/places";
import { placePath } from "@/shared/lib/place-path";
import { sitemapLanguages } from "@/shared/seo/page-meta";
import { localePath } from "@/shared/i18n/paths";

/**
 * 사이트맵 — 홈 + 진입점(지역·채널·종류) + 정적 페이지 + 공개 게이트를 통과한 채널 허브·조각·도시.
 *
 * 게이트 미달 조각은 페이지가 noindex 를 내보내므로(`[city]/page.tsx`),
 * 사이트맵도 같은 기준으로 잘라야 한다 — 광고해놓고 색인을 막는 모순을 만들지 않는다.
 * anon 클라이언트라 RLS 가 is_published 데이터만 내려준다.
 *
 * 도시 페이지(`/city/[city]`)는 조각과 장소가 겹치지만 둘 다 넣는다 —
 * "곽튜브 도쿄"와 "도쿄"는 다른 질의라 서로를 끌어내리지 않는다.
 * 영상 페이지만 noindex 이고 그건 같은 채널의 조각과 같은 상호명으로 싸우기 때문이다.
 *
 * ko/en 은 별도 `<url>` 항목이 아니라 `alternates.languages` 로만 표현한다 —
 * 내부 페이지 트리가 로케일 간에 동일하고(`src/proxy.ts` rewrite) `localePath` 가
 * ko/en 경로를 이미 1:1로 도출하므로, en URL 을 또 한 줄 넣는 건 같은 정보의 중복이고
 * (사이트맵은 URL을 "발견"시키는 목적이지 hreflang 을 대신하지 않는다) 항목 수만 2배로
 * 불린다. `x-default` 는 ko(기본 로케일)를 가리킨다. 각 페이지 `generateMetadata` 의
 * hreflang 과 같은 짝이다.
 */
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];
type EntryMeta = Omit<Entry, "url" | "alternates">;

/** `bare`(로케일 없는 내부 경로)로 ko URL + ko/en/x-default hreflang 짝을 만든다. */
function entry(base: string, bare: string, meta: EntryMeta): Entry {
  return {
    url: `${base}${localePath(bare, "ko")}`,
    alternates: {
      languages: sitemapLanguages(base, bare),
    },
    ...meta,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl.replace(/\/$/, "");
  const now = new Date();
  const home: MetadataRoute.Sitemap = [
    entry(base, "/", { lastModified: now, changeFrequency: "daily", priority: 1 }),
    entry(base, "/map", { lastModified: now, changeFrequency: "daily", priority: 0.9 }),
    entry(base, "/channels", { lastModified: now, changeFrequency: "weekly", priority: 0.7 }),
    entry(base, "/about", { lastModified: now, changeFrequency: "monthly", priority: 0.3 }),
    entry(base, "/policy", { lastModified: now, changeFrequency: "monthly", priority: 0.3 }),
    entry(base, "/privacy", { lastModified: now, changeFrequency: "monthly", priority: 0.3 }),
    entry(base, "/takedown", { lastModified: now, changeFrequency: "monthly", priority: 0.3 }),
    entry(base, "/apply", { lastModified: now, changeFrequency: "monthly", priority: 0.3 }),
  ];

  /* 전 테이블 조회는 전부 fetchAll — PostgREST 는 1000행에서 자르고, 잘린
     사이트맵은 그 너머의 장소·조각을 검색엔진에서 조용히 지운다(d49e695 와 동일 계열). */
  const [creators, cities, places] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("creators").select("id, slug, updated_at").range(from, to),
    ),
    fetchAll((from, to) => supabase.from("cities").select("id, slug").range(from, to)),
    fetchAll((from, to) =>
      supabase
        .from("places")
        .select("id, city_id, place_type")
        .eq("map_status", "confirmed")
        .range(from, to),
    ),
  ]);
  if (!creators.length || !cities.length || !places.length) return home;

  // 종류 상세 — 확정 장소가 있는 유형
  const typesWithPlaces = [
    ...new Set(
      places
        .map((p) => p.place_type)
        .filter((t) => t && t !== "unknown")
        .map(String),
    ),
  ];
  for (const t of typesWithPlaces) {
    home.push(
      entry(base, `/type/${t}`, { lastModified: now, changeFrequency: "weekly", priority: 0.75 }),
    );
  }

  const cityIdBySlug = new Map(cities.map((c) => [c.id, c.slug]));
  const cityByPlace = new Map(places.map((p) => [p.id, p.city_id]));

  /* video_places 는 .in(place_id 수백 개) 대신 통째로 받는다 — URL 길이 제한으로
     조용히 실패하던 패턴(chunked-in.ts 주석)이고, 아래 루프가 cityByPlace 로
     어차피 확정 장소만 걸러낸다. */
  const [videos, links] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("videos").select("id, creator_id").range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from("video_places").select("video_id, place_id").range(from, to),
    ),
  ]);
  const creatorByVideo = new Map(videos.map((v) => [v.id, v.creator_id]));

  // 크리에이터 → 도시 → 확정 장소 집합. 같은 장소가 여러 영상에 나와도 한 번만 센다
  const byCreator = new Map<string, Map<string, Set<string>>>();
  for (const link of links) {
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

  /* 채널이 하나뿐인 도시는 `/city/[city]` 가 조각 페이지로 308 한다
     (`city/[city]/page.tsx`). 사이트맵이 그 URL 을 광고하면 Search Console 에
     "리디렉션이 있는 페이지 — 색인 생성 안 됨"으로 쌓이므로 여기서 뺀다.
     판정 기준을 리다이렉트 쪽과 같게 유지할 것. */
  const creatorsByCity = new Map<string, Set<string>>();
  for (const [creatorId, cityMap] of byCreator) {
    for (const [cityId, placeSet] of cityMap) {
      if (placeSet.size < MIN_CONFIRMED_PINS) continue;
      const set = creatorsByCity.get(cityId) ?? new Set<string>();
      set.add(creatorId);
      creatorsByCity.set(cityId, set);
    }
  }

  for (const [cityId, placeSet] of placesByCity) {
    // 도시 단위 판정 — 조각 게이트가 아니다 (publish.ts MIN_CITY_PINS 주석)
    if (placeSet.size < MIN_CITY_PINS) continue;
    if ((creatorsByCity.get(cityId)?.size ?? 0) < 2) continue;
    const slug = cityIdBySlug.get(cityId);
    if (!slug) continue;
    entries.push(
      entry(base, `/city/${slug}`, { lastModified: now, changeFrequency: "weekly", priority: 0.9 }),
    );
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

    entries.push(
      entry(base, `/c/${creator.slug}`, { lastModified, changeFrequency: "weekly", priority: 0.8 }),
    );
    for (const citySlug of citySlugs) {
      entries.push(
        entry(base, `/c/${creator.slug}/${citySlug}`, {
          lastModified,
          changeFrequency: "weekly",
          priority: 0.9,
        }),
      );
    }
  }

  /* 장소 낱개 — 이 사이트맵의 대부분을 차지한다(확정·공개 1692곳, 전체의 87%).
     게이트를 따로 걸지 않는 이유: `loadPlaceSitemapRows` 가 읽는 `loadHomeMap` 이
     이미 공개 도시(loadCityIndex)만 통과시키고, anon 클라이언트라 RLS 가
     is_published 를 걸러 준다. 페이지(`/place/[slug]`)가 200 인지도 **같은 인덱스**로
     판정되므로, "사이트맵에는 있는데 열면 404" 가 구조적으로 생기지 않는다.

     `placePath` 를 반드시 거친다 — 한글 slug 를 그대로 넣으면 `<loc>` 만 인코딩이
     빠져 canonical 과 표기가 갈린다(shared/lib/place-path.ts 주석). */
  const placeRows = await loadPlaceSitemapRows();
  for (const row of placeRows) {
    entries.push(
      entry(base, placePath(row.slug), {
        /* 실제 수정 시각을 싣는다 — `now` 를 쓰면 가져갈 때마다 1692개가 전부
           방금 바뀐 것으로 보이고, 그건 크롤 예산만 태운다(places.ts 주석). */
        lastModified: new Date(row.updatedAt),
        changeFrequency: "monthly",
        priority: 0.7,
      }),
    );
  }

  return [...home, ...entries];
}
