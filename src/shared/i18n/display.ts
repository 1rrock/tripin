import type { Locale } from "./config";

/** 도시 표시명 — EN 이면 name_en 우선. */
export function displayCityName(
  city: { name: string; nameEn?: string | null },
  locale: Locale,
): string {
  if (locale === "en" && city.nameEn?.trim()) return city.nameEn.trim();
  return city.name;
}

/**
 * 장소 표시명.
 * EN: 현지어(nameLocal)가 있으면 그걸 메인(길찾기·현지 표기), 없으면 한글명.
 * KO: 한글명 메인.
 */
export function displayPlaceName(
  place: { name: string; nameLocal?: string | null },
  locale: Locale,
): string {
  if (locale === "en" && place.nameLocal?.trim()) return place.nameLocal.trim();
  return place.name;
}

export function displayPlaceSecondary(
  place: { name: string; nameLocal?: string | null },
  locale: Locale,
): string | null {
  if (locale === "en") {
    // 메인에 원어를 썼으면 한글명을 보조로
    if (place.nameLocal?.trim() && place.name.trim()) return place.name.trim();
    return null;
  }
  return place.nameLocal?.trim() || null;
}
