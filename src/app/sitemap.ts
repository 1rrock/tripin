import type { MetadataRoute } from "next";
import { fetchAll } from "@/shared/api/chunked-in";
import { supabase } from "@/shared/api/supabase";
import { publicEnv } from "@/shared/config/env";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { loadCityIndex } from "@/shared/api/cities";
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

/**
 * `lastModified` 는 **값이 있을 때만** 얹는다.
 *
 * 예전엔 홈·정적문서·종류·도시 35개가 전부 `new Date()` 였다. `revalidate = 3600`
 * 이라 한 시간마다 35개가 "방금 수정됨"으로 나갔고, `/about`·`/policy` 처럼 몇 달째
 * 안 바뀌는 문서까지 그랬다. 장소 1,845개는 이미 실제 `updated_at` 을 싣는다 —
 * 이유는 `places.ts` 에 적혀 있다("크롤 예산만 태운다"). 같은 원칙을 나머지에도 건다.
 *
 * 근거 시각이 없으면 **아예 뺀다.** lastmod 없음은 사이트맵 규격상 "모름"이고,
 * 크롤러는 그때 자기 휴리스틱을 쓴다 — 틀린 값을 주는 것보다 낫다.
 */
function at(when: Date | null, meta: EntryMeta): EntryMeta {
  return when ? { ...meta, lastModified: when } : meta;
}

/** 여럿 중 가장 늦은 시각. 쓸 수 있는 값이 하나도 없으면 null. */
function latest(values: (string | null | undefined)[]): Date | null {
  let best: number | null = null;
  for (const v of values) {
    if (!v) continue;
    const t = new Date(v).getTime();
    if (Number.isNaN(t)) continue;
    if (best === null || t > best) best = t;
  }
  return best === null ? null : new Date(best);
}

/** ISO 한 개 → Date. 비었거나 못 읽으면 null(= lastmod 를 안 싣는다). */
function dateOf(value: string | null | undefined): Date | null {
  return latest([value]);
}

/** 둘 중 늦은 쪽. 한쪽만 있으면 그쪽, 둘 다 없으면 null. */
function later(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl.replace(/\/$/, "");

  /* 전 테이블 조회는 전부 fetchAll — PostgREST 는 1000행에서 자르고, 잘린
     사이트맵은 그 너머의 장소·조각을 검색엔진에서 조용히 지운다(d49e695 와 동일 계열). */
  const [creators, cities, places] = await Promise.all([
    fetchAll((from, to) =>
      supabase.from("creators").select("id, slug, updated_at").range(from, to),
    ),
    fetchAll((from, to) => supabase.from("cities").select("id, slug").range(from, to)),
    fetchAll((from, to) =>
      supabase
        /* `updated_at` 은 새 쿼리가 아니라 **같은 조회의 한 컬럼**이다 — 도시·종류
           lastmod 를 이 한 벌에서 전부 유도하려고 얹었다. */
        .from("places")
        .select("id, city_id, place_type, updated_at")
        .eq("map_status", "confirmed")
        .range(from, to),
    ),
  ]);

  /* 데이터가 늘면 실제로 바뀌는 화면들 — 마지막으로 바뀐 장소·채널의 시각을 쓴다.
     `/celebs` 는 채널 유래(a)와 언급 유래(b)를 섞으므로 둘 중 늦은 쪽이다. */
  const placesAt = latest(places.map((p) => p.updated_at));
  const creatorsAt = latest(creators.map((c) => c.updated_at));
  const anyAt = later(placesAt, creatorsAt);

  const home: MetadataRoute.Sitemap = [
    entry(base, "/", at(placesAt, { changeFrequency: "daily", priority: 1 })),
    entry(base, "/map", at(placesAt, { changeFrequency: "daily", priority: 0.9 })),
    entry(base, "/channels", at(creatorsAt, { changeFrequency: "weekly", priority: 0.7 })),
    entry(base, "/celebs", at(anyAt, { changeFrequency: "daily", priority: 0.8 })),
    /* 정적 문서 — lastmod 를 **싣지 않는다.** 데이터와 무관하게 사람이 문안을 고칠
       때만 바뀌고, 그 시각을 코드에 상수로 박아 두면 다음 개정 때 같이 안 고쳐져
       조용히 거짓말이 된다. 없음("모름")이 틀린 값보다 낫다. */
    entry(base, "/about", { changeFrequency: "monthly", priority: 0.3 }),
    entry(base, "/policy", { changeFrequency: "monthly", priority: 0.3 }),
    entry(base, "/privacy", { changeFrequency: "monthly", priority: 0.3 }),
    entry(base, "/takedown", { changeFrequency: "monthly", priority: 0.3 }),
    entry(base, "/apply", { changeFrequency: "monthly", priority: 0.3 }),
  ];
  if (!creators.length || !cities.length || !places.length) return home;

  const cityIdBySlug = new Map(cities.map((c) => [c.id, c.slug]));
  const cityByPlace = new Map(places.map((p) => [p.id, p.city_id]));

  /* 도시·종류의 lastmod 재료 — 그 도시/종류에 속한 확정 장소의 **최대 updated_at**.
     위 places 한 벌에서 그대로 접는다(추가 쿼리 없음). */
  const cityUpdatedAt = new Map<string, string>();
  const typeUpdatedAt = new Map<string, string>();
  for (const p of places) {
    const u = p.updated_at;
    if (!u) continue;
    const citySlug = cityIdBySlug.get(p.city_id);
    if (citySlug) {
      const cur = cityUpdatedAt.get(citySlug);
      if (!cur || u > cur) cityUpdatedAt.set(citySlug, u);
    }
    const t = p.place_type;
    if (t && t !== "unknown") {
      const cur = typeUpdatedAt.get(String(t));
      if (!cur || u > cur) typeUpdatedAt.set(String(t), u);
    }
  }

  /* 종류 상세 — 확정 장소가 있는 유형. 목록 자체는 예전과 같은 판정이다
     (updated_at 이 비어도 유형은 빠지지 않는다 — 그때는 lastmod 만 없다). */
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
      entry(
        base,
        `/type/${t}`,
        at(dateOf(typeUpdatedAt.get(t)), { changeFrequency: "weekly", priority: 0.75 }),
      ),
    );
  }

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

  /**
   * 도시 페이지 — 판정을 **리다이렉트 쪽과 한 소스로** 묶는다.
   *
   * 채널이 하나뿐인 도시는 `/city/[city]/layout.tsx` 가 조각 페이지로 307 한다.
   * 사이트맵이 그 URL 을 광고하면 Search Console 에 "리디렉션이 있는 페이지 —
   * 색인 생성 안 됨"으로 쌓이므로 빼야 한다. 그런데 예전 코드는 그 수를 여기서
   * **다시 셌고**, 조건이 하나 더 붙어 있었다("그 도시에 확정 ≥MIN_CONFIRMED_PINS
   * 곳인 채널"만 셈). 리다이렉트가 보는 `loadCityDetail(...).creators` 는 그 문턱이
   * 없다(장소 ≥1곳이면 센다). 그래서 200 을 내는 도시 15개가 사이트맵에서 빠져
   * 있었다 — 도시 20개 실림 / 실제 200 인 도시 35개.
   *
   * 이제 `loadCityIndex()` 의 `creatorCount` 를 그대로 본다. 그 수는 리다이렉트가
   * 읽는 `loadCityDetail` 과 **같은 `loadGraph()`** 에서 나온다(cities.ts:161
   * "목록과 상세가 같은 판정을 쓰게 한다"). 두 함수의 유일한 차이인 좌표 유무
   * 필터는 확정 장소에선 무효다 — `places_confirmed_needs_coords` 체크 제약이
   * confirmed 행에 lat/lng 를 강제한다(0001_init.sql:137). 목록에 없는 도시는
   * `loadCityDetail` 이 null 을 주는 도시(=404)와 같은 집합이라, MIN_CITY_PINS
   * 필터도 여기서 다시 셀 필요가 없다.
   *
   * ⚠️ `loadCityDetail(slug)` 를 도시마다 부르지 않은 이유: 그건 도시별 캐시 항목
   *    130여 개이고, 이 파일은 라우트 핸들러라 `reactCache` 가 no-op 일 수 있어
   *    콜드일 때 5테이블 전수 스캔이 도시 수만큼 돈다(cities.ts:639 의 1.6초 사례와
   *    같은 함정). `loadCityIndex()` 는 캐시 항목 하나이고 홈·지역 목록이 이미
   *    데우고 있다.
   */
  const cityIndex = await loadCityIndex();
  for (const city of cityIndex) {
    if (city.creatorCount < 2) continue;
    entries.push(
      entry(
        base,
        `/city/${city.slug}`,
        /* 그 도시 확정 장소의 최대 updated_at — 도시 페이지가 실제로 바뀌는 시점이다 */
        at(dateOf(cityUpdatedAt.get(city.slug)), { changeFrequency: "weekly", priority: 0.9 }),
      ),
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
