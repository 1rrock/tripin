/**
 * 여행사식 지역 섹션 — ISO country_code → 권역.
 *
 * 목록 UI 전용. 지도·SEO slug 와는 무관하다.
 * 데이터가 늘면 여기 표만 키우면 된다.
 */

export type GeoRegionId =
  | "japan"
  | "korea"
  | "eastAsia"
  | "seAsia"
  | "europe"
  | "americas"
  | "oceania"
  | "other";

/** 화면 노출 순서 */
export const GEO_REGION_ORDER: GeoRegionId[] = [
  "japan",
  "korea",
  "eastAsia",
  "seAsia",
  "europe",
  "americas",
  "oceania",
  "other",
];

const BY_COUNTRY: Record<string, GeoRegionId> = {
  JP: "japan",
  KR: "korea",
  // 동아시아 (일본·한국 제외)
  CN: "eastAsia",
  TW: "eastAsia",
  HK: "eastAsia",
  MO: "eastAsia",
  MN: "eastAsia",
  // 동남아
  TH: "seAsia",
  VN: "seAsia",
  PH: "seAsia",
  ID: "seAsia",
  MY: "seAsia",
  SG: "seAsia",
  KH: "seAsia",
  LA: "seAsia",
  MM: "seAsia",
  BN: "seAsia",
  // 유럽 (자주 나오는 것만 — 나머지는 other 로 떨어졌다가 필요 시 추가)
  GB: "europe",
  FR: "europe",
  IT: "europe",
  ES: "europe",
  DE: "europe",
  PT: "europe",
  NL: "europe",
  BE: "europe",
  CH: "europe",
  AT: "europe",
  GR: "europe",
  CZ: "europe",
  HU: "europe",
  PL: "europe",
  SE: "europe",
  NO: "europe",
  DK: "europe",
  FI: "europe",
  IE: "europe",
  // 미주
  US: "americas",
  CA: "americas",
  MX: "americas",
  BR: "americas",
  AR: "americas",
  CL: "americas",
  PE: "americas",
  CO: "americas",
  // 오세아니아
  AU: "oceania",
  NZ: "oceania",
  FJ: "oceania",
};

export function regionForCountry(countryCode: string): GeoRegionId {
  const key = countryCode.trim().toUpperCase();
  return BY_COUNTRY[key] ?? "other";
}

export function groupByGeoRegion<T extends { countryCode: string; placeCount: number }>(
  items: T[],
): { id: GeoRegionId; items: T[] }[] {
  const buckets = new Map<GeoRegionId, T[]>();
  for (const item of items) {
    const id = regionForCountry(item.countryCode);
    const list = buckets.get(id) ?? [];
    list.push(item);
    buckets.set(id, list);
  }

  return GEO_REGION_ORDER.flatMap((id) => {
    const list = buckets.get(id);
    if (!list || list.length === 0) return [];
    // 섹션 안은 장소 수 많은 도시 먼저
    list.sort((a, b) => b.placeCount - a.placeCount);
    return [{ id, items: list }];
  });
}

/**
 * 지역 인덱스용 — 도시가 거의 없는 권역은 `other` 로 접는다.
 *
 * 3도시 미만을 같은 무게의 칸으로 열면 일본 12곳과 싱가포르 1곳이
 * 나란히 선다. 데이터가 늘면 이 숫자만 넘기면 칸이 알아서 갈라진다.
 */
export const OWN_REGION_MIN_CITIES = 3;

export function groupForCityIndex<T extends { countryCode: string; placeCount: number }>(
  items: T[],
): { id: GeoRegionId; items: T[] }[] {
  const own: { id: GeoRegionId; items: T[] }[] = [];
  const folded: T[] = [];

  for (const group of groupByGeoRegion(items)) {
    if (group.id !== "other" && group.items.length >= OWN_REGION_MIN_CITIES) {
      own.push(group);
    } else {
      folded.push(...group.items);
    }
  }

  folded.sort((a, b) => b.placeCount - a.placeCount);
  if (folded.length > 0) own.push({ id: "other", items: folded });
  return own;
}
