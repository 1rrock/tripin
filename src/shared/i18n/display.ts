import type { Locale } from "./config";
import type { EnSource } from "@/shared/api/database.types";

export type { EnSource };

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

/** 원문(한국어) — "원문 보기" 토글용. */
export interface OriginalSummary {
  bullets: string[];
  summary: string | null;
  priceHint: string | null;
}

export interface SummaryDisplay {
  bullets: string[];
  summary: string | null;
  priceHint: string | null;
  /** true 면 자동번역 표시 + 원문 토글을 그린다. */
  isMachine: boolean;
  /** isMachine 일 때만 값이 있다. */
  original: OriginalSummary | null;
}

/**
 * 요약·가격힌트 표시 선택 — 로케일 + `en_source` 조합에 따른 유일한 분기점.
 *
 * KO: 항상 한국어 원문 그대로.
 * EN + en_source null: 영문 없음 → 숨긴다(`/type` 페이지가 이미 쓰는 정책과 같은 방향).
 * EN + en_source 'machine': 영문을 보여주되 자동번역 표시 + 원문 토글.
 * EN + en_source 'human': 영문을 표시 없이 그대로.
 */
export function displaySummary(
  place: {
    summary: string | null;
    summaryBullets: string[];
    priceHint: string | null;
    summaryEn?: string | null;
    summaryBulletsEn?: string[];
    priceHintEn?: string | null;
    enSource?: EnSource;
  },
  locale: Locale,
): SummaryDisplay {
  if (locale === "ko") {
    return {
      bullets: place.summaryBullets,
      summary: place.summary,
      priceHint: place.priceHint,
      isMachine: false,
      original: null,
    };
  }
  if (!place.enSource) {
    return { bullets: [], summary: null, priceHint: null, isMachine: false, original: null };
  }
  const isMachine = place.enSource === "machine";
  return {
    bullets: place.summaryBulletsEn ?? [],
    summary: place.summaryEn ?? null,
    priceHint: place.priceHintEn ?? null,
    isMachine,
    original: isMachine
      ? { bullets: place.summaryBullets, summary: place.summary, priceHint: place.priceHint }
      : null,
  };
}

/**
 * 채널×도시 인트로 — `creator_cities.intro_text_en`.
 * 요약과 달리 출처(en_source) 컬럼이 없어 기계/검수를 구분하지 못한다.
 * 있으면 그대로 노출, 없으면(en 로케일) 숨긴다 — 요약의 null 케이스와 같은 방향.
 */
export function displayIntro(
  city: { introText: string | null; introTextEn?: string | null },
  locale: Locale,
): string | null {
  if (locale === "ko") return city.introText;
  return city.introTextEn?.trim() || null;
}
