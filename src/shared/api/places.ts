import { cachePublic } from "@/shared/api/cache";
import { fetchAll } from "@/shared/api/chunked-in";
import { supabase } from "@/shared/api/supabase";
import { loadHomeMap, type PlaceSource } from "@/shared/api/cities";
import type { PlaceType } from "@/shared/api/database.types";
import type { MapLink } from "@/shared/lib/map-links";
import type { SummaryDisplay } from "@/shared/i18n/display";
import type { Locale } from "@/shared/i18n/config";

/**
 * 장소 축 로더 — `/place/[slug]` 가 읽는 하나.
 *
 * 왜 있는가: 확정 장소 1732곳은 지금까지 **자기 URL 이 없었다.** 도시·조각 페이지에
 * 이름이 텍스트로만 박혀 있어서, "잇케이 JRJP 하카타점" 같은 상호명 질의가 오면
 * 561곳이 뭉친 도시 페이지밖에 내밀 게 없었다. 561개를 다루는 문서는 그중 어느
 * 이름으로도 뜨지 않는다. `PRODUCT.md` 원칙 2("답은 상호명이다")가 검색 쪽에서
 * 지켜지지 않던 자리다.
 *
 * ⚠️ **`loadPlaceBySlug` 를 `cachePublic` 으로 감싸지 마라.**
 *    cities.ts `loadMapPlace` 주석과 같은 이유다 — 캐시된 함수 안의 캐시된 함수는
 *    바깥이 miss 인 동안 그냥 실행된다. slug 마다 캐시 키가 갈리므로 처음 열리는
 *    장소 1732곳이 각각 `loadHomeMap → loadGraph` 를 통째로 다시 돌린다.
 *    캐시는 아래 인덱스 하나(로케일당 1항목)뿐이고, 조회는 그 위에서 한다.
 */

export interface PlaceDetail {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PlaceType;
  lat: number;
  lng: number;
  address: string | null;
  /** 열 수 있는 지도 앱 전부 — 첫 번째가 그 나라의 기본(shared/lib/map-links.ts) */
  mapLinks: MapLink[];
  citySlug: string;
  cityName: string;
  cityNameEn: string | null;
  countryCode: string;
  /** 로케일이 이미 확정된 표시용 — 캐시 키에 로케일이 들어가 있다 */
  summary: SummaryDisplay;
  /** 이 장소를 다녀간 채널·영상. 이른 타임스탬프가 먼저 */
  sources: PlaceSource[];
}

/** 같은 도시의 다른 장소 — 페이지 아래 "이 도시의 다른 곳". 크롤러가 옆으로 갈 길이다. */
export interface NearbyPlace {
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PlaceType;
  youtubeId: string | null;
}

/**
 * slug → 상세. 로케일당 항목 하나.
 *
 * `loadHomeMap` 이 이미 확정 장소 전부를 요약·출처·지도링크까지 들고 있으므로
 * 여기서는 slug 로 다시 색인하는 일만 한다. 새 쿼리는 없다.
 */
const loadPlaceIndex = cachePublic(async function loadPlaceIndex(
  locale: Locale,
): Promise<Record<string, PlaceDetail>> {
  const all = await loadHomeMap(locale);
  const out: Record<string, PlaceDetail> = {};
  for (const p of all) {
    out[p.slug] = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameLocal: p.nameLocal,
      placeType: p.placeType,
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      mapLinks: p.mapLinks,
      citySlug: p.citySlug,
      cityName: p.cityName,
      cityNameEn: p.cityNameEn,
      countryCode: p.countryCode,
      summary: p.summary,
      sources: p.sources,
    };
  }
  return out;
}, ["places:slug-index"]);

/**
 * 도시 slug → 그 도시의 장소 목록(가벼운 형태).
 *
 * 로케일 무관이라 항목 하나다 — 이름은 원본, 정렬도 `localeCompare("ko")` 고정.
 * 상세 인덱스와 나눠 둔 이유는 크기다: 관련 장소 12개를 뽑자고 561곳짜리 상세를
 * 훑을 필요가 없다.
 */
const loadCityPlaceIndex = cachePublic(async function loadCityPlaceIndex(): Promise<
  Record<string, NearbyPlace[]>
> {
  const all = await loadHomeMap("ko");
  const out: Record<string, NearbyPlace[]> = {};
  for (const p of all) {
    (out[p.citySlug] ??= []).push({
      slug: p.slug,
      name: p.name,
      nameLocal: p.nameLocal,
      placeType: p.placeType,
      youtubeId: p.youtubeId,
    });
  }
  return out;
}, ["places:by-city"]);

/** 캐시하지 마라 — 위 주석의 이유로, 감싸는 순간 인덱스가 캐시를 못 탄다. */
export async function loadPlaceBySlug(
  slug: string,
  locale: Locale,
): Promise<PlaceDetail | null> {
  const index = await loadPlaceIndex(locale);
  return index[slug] ?? null;
}

/**
 * 같은 도시의 다른 장소 — 자기 자신은 뺀다.
 *
 * 12개에서 끊는다. 이 목록의 일은 크롤러에게 옆길을 열어 주는 것이지 도시 전체를
 * 다시 그리는 게 아니다 — 후쿠오카(561곳)를 다 실으면 장소 페이지가 도시 페이지의
 * 중복이 되고, 그 도시 페이지가 이미 3MB 라 같은 실수를 한 번 더 하는 꼴이다.
 */
export async function loadNearbyPlaces(
  citySlug: string,
  excludeSlug: string,
  limit = 12,
): Promise<NearbyPlace[]> {
  const index = await loadCityPlaceIndex();
  return (index[citySlug] ?? []).filter((p) => p.slug !== excludeSlug).slice(0, limit);
}

/**
 * 장소 slug → 생성·수정 시각. **별도 쿼리다.**
 *
 * `loadHomeMap`(HomeMapPlace)에 얹지 않는 이유가 있다 — 그 타입은 2MiB 상한
 * 근처의 파생 캐시 항목들(`map:detail-index`·`places:slug-index`)의 재료라,
 * 필드 하나가 1,845배로 불어난다. 실제로 여기 두 필드를 거기 넣었더니 2.11MB
 * 가 되어 **캐시가 조용히 꺼졌다**(빌드 로그의 "items over 2MB can not be
 * cached" 한 줄이 유일한 신호였고, 그 뒤로는 요청마다 풀스캔이 나간다).
 *
 * 이 로더는 3개 컬럼만 읽어 ~200KB 다. `map_status=confirmed` 로 좁히고, 공개
 * 판정은 호출부가 `loadHomeMap` 인덱스와 교차해서 한다 — 판정 기준을 두 벌로
 * 나누지 않기 위해서다.
 */
const loadPlaceTimestamps = cachePublic(async function loadPlaceTimestamps(): Promise<
  Record<string, { createdAt: string; updatedAt: string }>
> {
  const rows = await fetchAll((from, to) =>
    supabase
      .from("places")
      .select("slug, created_at, updated_at")
      .eq("map_status", "confirmed")
      .range(from, to),
  );
  const out: Record<string, { createdAt: string; updatedAt: string }> = {};
  for (const r of rows) out[r.slug] = { createdAt: r.created_at, updatedAt: r.updated_at };
  return out;
}, ["places:timestamps"]);

/**
 * 사이트맵용 — 확정 장소 전부의 slug + 실제 수정 시각.
 *
 * `lastModified` 에 `new Date()` 를 쓰면 사이트맵을 가져갈 때마다 1692개가 전부
 * 방금 바뀐 것으로 보인다. 구글은 부정확한 lastmod 를 무시하고, 네이버는 매번
 * 전량 재수집을 시도해 크롤 예산만 태운다. 실제 `updated_at` 을 싣는다.
 */
export const loadPlaceSitemapRows = cachePublic(async function loadPlaceSitemapRows(): Promise<
  { slug: string; updatedAt: string }[]
> {
  const [all, ts] = await Promise.all([loadHomeMap("ko"), loadPlaceTimestamps()]);
  return all.map((p) => ({
    slug: p.slug,
    // 시각을 못 찾으면 에폭 대신 빼는 게 낫지만, 공개 판정은 인덱스가 이미 했다.
    updatedAt: ts[p.slug]?.updatedAt ?? new Date(0).toISOString(),
  }));
}, ["places:sitemap"]);

/** RSS 한 줄. */
export interface FeedItem {
  slug: string;
  name: string;
  cityName: string;
  placeType: PlaceType;
  /** 요약 불릿을 이어 붙인 한 문장. 없으면 빈 문자열 — 지어내지 않는다. */
  description: string;
  publishedAt: string;
}

/** RSS 에 실을 개수. 피드는 "최근에 뭐가 생겼나"를 알리는 것이지 전체 목록이 아니다. */
export const FEED_SIZE = 50;

/**
 * RSS 피드 — 최근 확정된 장소.
 *
 * 왜 장소인가: 이 서비스에서 **새로 생기는 것은 확정 장소**다. 도시·조각은
 * 그 부산물로 늘어난다. 네이버는 사이트맵보다 RSS 를 색인 트리거로 적극적으로
 * 쓰는데, 그 트리거가 가리켜야 할 곳이 여기다.
 *
 * ko 고정이다. 이 피드의 수신자는 네이버이고 x-default 도 ko 라, 로케일별로
 * 두 벌을 만들 이유가 없다. 판정(공개 여부)은 사이트맵·페이지와 같은 인덱스에서
 * 나오므로 "피드엔 있는데 열면 404" 가 생기지 않는다.
 */
export const loadPlaceFeed = cachePublic(async function loadPlaceFeed(): Promise<FeedItem[]> {
  const [all, ts] = await Promise.all([loadHomeMap("ko"), loadPlaceTimestamps()]);
  return all
    .map((p) => ({ p, at: ts[p.slug]?.createdAt }))
    .filter((r): r is { p: (typeof all)[number]; at: string } => Boolean(r.at))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, FEED_SIZE)
    .map(({ p, at }) => ({
      slug: p.slug,
      name: p.name,
      cityName: p.cityName,
      placeType: p.placeType,
      description: p.summary.bullets.join(" ") || p.summary.summary || "",
      publishedAt: at,
    }));
}, ["places:feed"]);
