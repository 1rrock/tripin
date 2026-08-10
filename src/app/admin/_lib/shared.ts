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

/** 주소가 "인근·추정" 같은 얼버무림을 담고 있으면 검수 대상이다. */
const VAGUE_ADDRESS = /인근|추정|근처|일대|부근|\(/;

export function isVagueAddress(address: string | null): boolean {
  return Boolean(address && VAGUE_ADDRESS.test(address));
}

export function hasSummary(p: { summary: string | null; summaryBullets: string[] }): boolean {
  return Boolean(p.summary?.trim()) || p.summaryBullets.length > 0;
}

/** 공개 UI 와 동일 라벨 — `shared/ui/place-types` 단일 소스. */
export { PLACE_TYPE_LABELS as PLACE_TYPE_LABEL } from "@/shared/ui/place-types";
