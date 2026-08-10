/**
 * 어드민 클라이언트·서버가 **함께** 쓰는 것만 둔다.
 *
 * ⚠️ 여기에 서버 전용 import(`@/shared/api/supabase` 등)를 넣지 마라.
 *    클라이언트 컴포넌트가 이 파일을 import 하므로 서비스 롤 키 경로가 번들에 끌려 들어간다.
 *    DB 를 읽는 건 `queries.ts`(서버 전용) 쪽이다.
 */

export interface AdminPlaceRow {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: string;
  mapStatus: string;
  isPublished: boolean;
  lat: number | null;
  lng: number | null;
  address: string | null;
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  sourceNote: string | null;
  summaryBullets: string[];
  summary: string | null;
  priceHint: string | null;
  citySlug: string;
  cityName: string;
  creatorSlug: string;
  creatorName: string;
  /** 이 장소가 나온 영상 중 가장 이른 게시일 — 데이터가 얼마나 오래됐는지 */
  sourceDate: string | null;
  videoTitle: string | null;
  youtubeVideoId: string | null;
  timestampSec: number | null;
}

export interface AdminPiece {
  creatorId: string;
  creatorSlug: string;
  creatorName: string;
  cityId: string;
  citySlug: string;
  cityName: string;
  /** 유저에 노출 중인 핀 수 (places.is_published) */
  published: number;
  /** 확정됐지만 is_published=false (수동 내리기 등) */
  confirmedHidden: number;
  /** 검수 대기 */
  candidates: number;
  /** 요약이 빈 장소 수 */
  summaryMissing: number;
  /** 캐시된 값 — 실제와 다르면 재계산이 필요하다는 신호 */
  cachedCount: number | null;
  publishedAt: string | null;
}

export interface AdminTranslationRow {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  citySlug: string;
  cityName: string;
  creatorSlug: string;
  creatorName: string;
  summary: string | null;
  summaryBullets: string[];
  address: string | null;
  priceHint: string | null;
  summaryEn: string | null;
  summaryBulletsEn: string[];
  addressEn: string | null;
  priceHintEn: string | null;
  enSource: "machine" | "human" | null;
  enTranslatedAt: string | null;
}

export interface AdminCityIntroRow {
  creatorId: string;
  creatorSlug: string;
  creatorName: string;
  cityId: string;
  citySlug: string;
  cityName: string;
  introText: string;
  introTextEn: string | null;
}

/** "인근·추정" 처럼 장소를 특정하지 못하겠다고 말하는 표현. */
const VAGUE_HEDGE = /인근|근처|주변|부근|일대|추정|미상|불명|미특정|어딘가|확인\s*필요/;

/**
 * 주소가 가게를 특정하지 못하면 검수 대상이다.
 *
 * ⚠️ 예전 규칙은 `\(` 를 얼버무림으로 쳤다. 한국 주소는 지번을 괄호로 병기하는 게
 *    표준이라(`… 수영로594번길 28-2 (광안2동 146-17)`) **정확한 주소 9건이 모호로
 *    표시됐다.** 괄호는 신호가 아니다.
 *
 * 대신 두 가지를 본다:
 *   1. 얼버무리는 표현이 들어 있다
 *   2. **숫자가 하나도 없다** — 번지가 없으면 동/구 수준이라 가게를 못 찾는다.
 *      단 `attraction` 은 구역·거리 자체가 대상이라(아메리칸 빌리지, 나카스 포장마차
 *      거리) 번지가 없는 게 정상이므로 제외한다.
 */
export function isVagueAddress(address: string | null, placeType?: string | null): boolean {
  if (!address) return false;
  if (VAGUE_HEDGE.test(address)) return true;
  return placeType !== "attraction" && !/\d/.test(address);
}

export function hasSummary(p: { summary: string | null; summaryBullets: string[] }): boolean {
  return Boolean(p.summary?.trim()) || p.summaryBullets.length > 0;
}

/** 공개 UI 와 동일 라벨 — `shared/ui/place-types` 단일 소스. */
export { PLACE_TYPE_LABELS as PLACE_TYPE_LABEL } from "@/shared/ui/place-types";
