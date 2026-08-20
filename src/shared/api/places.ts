import { cachePublic } from "@/shared/api/cache";
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

/** 사이트맵용 — 확정 장소 전부의 slug + 도시. 상세를 들고 다니지 않는다. */
export const loadPlaceSitemapRows = cachePublic(async function loadPlaceSitemapRows(): Promise<
  { slug: string; citySlug: string }[]
> {
  const all = await loadHomeMap("ko");
  return all.map((p) => ({ slug: p.slug, citySlug: p.citySlug }));
}, ["places:sitemap"]);
