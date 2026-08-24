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
 *
 * KO: 한글명 메인.
 * EN: `nameEn` → `nameLocal` → `name` 순.
 *
 * ⚠️ 2026-08-24 이전에는 EN 이 `nameLocal` 만 봤고 `nameEn` 은 **어느 화면도 읽지
 *    않았다.** 공개 장소 1,884곳 중 `nameLocal` 이 있는 것은 145곳뿐이라, EN 트리의
 *    장소 이름이 사실상 전부 한국어로 나갔다. 지금은 1,599곳에 `nameEn` 이 있다
 *    (나머지 285곳은 이름이 이미 라틴 문자라 채울 것이 없다).
 *
 * 왜 `nameEn` 이 `nameLocal` 보다 위인가: 이 화면을 EN 으로 보는 사람은 그 글자를
 * **읽어야** 한다. 간판 표기(한자·한글)는 아래 보조줄에 그대로 남으므로 길찾기·
 * 현지 검색에 필요한 정보는 잃지 않는다 — 자리만 바뀐다.
 */
export function displayPlaceName(
  place: { name: string; nameLocal?: string | null; nameEn?: string | null },
  locale: Locale,
): string {
  if (locale === "en") {
    if (place.nameEn?.trim()) return place.nameEn.trim();
    if (place.nameLocal?.trim()) return place.nameLocal.trim();
  }
  return place.name;
}

/**
 * 보조줄 — **간판에 적힌 표기**다. 메인이 읽는 이름이면 여기가 찾는 이름이 된다.
 * 메인으로 이미 쓴 문자열은 여기 다시 쓰지 않는다.
 */
export function displayPlaceSecondary(
  place: { name: string; nameLocal?: string | null; nameEn?: string | null },
  locale: Locale,
): string | null {
  if (locale === "en") {
    const primary = displayPlaceName(place, locale);
    const local = place.nameLocal?.trim();
    // 현지어 간판이 있으면 그것이 우선 — 없으면 한글명이 간판 노릇을 한다
    if (local && local !== primary) return local;
    const ko = place.name.trim();
    return ko && ko !== primary ? ko : null;
  }
  return place.nameLocal?.trim() || null;
}

/**
 * 보조줄의 `lang` 속성 — 보조줄이 어느 언어인지는 **고정이 아니다.**
 *
 * EN 에서 보조줄은 현지어(`nameLocal`, 대개 일본어)일 수도 한글명일 수도 있다.
 * 예전엔 호출부가 `locale === "en" ? "ko" : "ja"` 로 못박아 뒀는데, `nameEn` 이
 * 메인으로 올라오면서 EN 보조줄에 일본어가 서는 경우가 생겼다 — 그대로 두면
 * 스크린리더가 한자를 한국어로 읽는다.
 */
export function displayPlaceSecondaryLang(
  place: { name: string; nameLocal?: string | null; nameEn?: string | null },
  locale: Locale,
): "ko" | "ja" | undefined {
  const secondary = displayPlaceSecondary(place, locale);
  if (!secondary) return undefined;
  return secondary === place.name.trim() ? "ko" : "ja";
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
