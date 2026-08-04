/**
 * DB 스키마 타입 — `supabase/migrations/` 와 손으로 동기화한다.
 *
 * supabase CLI 의 타입 생성(`supabase gen types`)을 쓰지 않는 이유:
 * CLI 가 히든스팟 계정으로 로그인돼 있어 이 프로젝트에 link 가 안 된다(DATABASE.md 참조).
 * 마이그레이션을 추가하면 이 파일도 같이 고칠 것.
 */

export type PlaceType =
  | "restaurant"
  | "cafe"
  | "attraction"
  | "hotel"
  | "bar"
  | "shop"
  | "viewpoint"
  | "other"
  | "unknown";

/** confirmed 만 지도에 강조 핀. candidate 는 '위치 확인 중' 섹션. none 은 비공개. */
export type MapStatus = "confirmed" | "candidate" | "none";

export type ConfidenceLevel = "high" | "medium" | "low";

export type TakedownStatus = "received" | "blinded" | "resolved" | "rejected";

export type Creator = {
  id: string;
  slug: string;
  display_name: string;
  display_name_en: string | null;
  youtube_channel_id: string;
  youtube_handle: string | null;
  country: string | null;
  languages: string[];
  tags: string[];
  /** ⚠️ avatar_url 이 아니다 — 초상 사용 리스크 회피(LEGAL.md 1.3). */
  initials: string;
  accent_color: string;
  bio: string | null;
  /** 삭제 요청 시 이 값만 false 로 내리면 RLS 가 즉시 차단한다. */
  is_published: boolean;
  place_count: number;
  city_count: number;
  video_count: number;
  created_at: string;
  updated_at: string;
}

export type City = {
  id: string;
  slug: string;
  name: string;
  name_en: string;
  name_local: string | null;
  country_code: string;
  lat: number;
  lng: number;
  default_zoom: number;
  created_at: string;
}

export type Video = {
  id: string;
  creator_id: string;
  youtube_video_id: string;
  title: string;
  published_at: string | null;
  thumbnail_url: string | null;
  duration_sec: number | null;
  /** ⚠️ 30일 초과 시 정책 위반. 월 1회 갱신 배치가 리셋한다(LEGAL.md 4.5). */
  api_fetched_at: string;
  created_at: string;
}

export type Place = {
  id: string;
  slug: string;
  name: string;
  name_local: string | null;
  name_en: string | null;
  city_id: string;
  country_code: string;
  place_type: PlaceType;
  /** 지도 표시용 — Overture/Foursquare 출처. */
  lat: number | null;
  lng: number | null;
  address: string | null;
  /** 지도 앱 딥링크용 ID — 있는 것에 따라 구글/카카오/네이버로 연다 (shared/lib/map-links.ts). */
  google_place_id: string | null;
  /** 구글 지도 공유 링크(maps.app.goo.gl/…) — place_id 없이 가게 페이지로 열 수 있는 경로. 최우선. */
  google_maps_url: string | null;
  kakao_place_id: string | null;
  naver_place_id: string | null;
  map_status: MapStatus;
  summary: string | null;
  summary_bullets: string[];
  /** ★ 확정 근거 — 동명이점 오확정 방어(LEGAL.md 4.6). */
  source_note: string | null;
  price_hint: string | null;
  tips: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export type VideoPlace = {
  video_id: string;
  place_id: string;
  /** 아웃링크 &t= 용. */
  timestamp_sec: number | null;
  mention_note: string | null;
  confidence: ConfidenceLevel;
  created_at: string;
}

/** 콘텐츠 제작·공개의 최소 단위 = 채널 × 도시 한 조각. */
export type CreatorCity = {
  creator_id: string;
  city_id: string;
  place_count: number;
  intro_text: string | null;
  /** null 이면 미공개. */
  published_at: string | null;
}

export type TakedownRequest = {
  id: string;
  target_type: string;
  target_id: string | null;
  target_url: string | null;
  requester_email: string | null;
  reason: string;
  status: TakedownStatus;
  /** 임시조치 시작. +30일이 결론 기한(정보통신망법 §44조의2④). */
  blinded_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export type SearchMiss = {
  query: string;
  count: number;
  last_seen_at: string;
}

/**
 * supabase-js 가 기대하는 테이블 타입 형태.
 * Insert/Update 는 Partial<Row> — 필수 필드 검증은 DB 제약(NOT NULL·check)에 맡긴다.
 * 손으로 관리하는 타입이라 정밀한 Insert 타입 유지비가 이득보다 크다.
 */
type TableOf<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      creators: TableOf<Creator>;
      cities: TableOf<City>;
      videos: TableOf<Video>;
      places: TableOf<Place>;
      video_places: TableOf<VideoPlace>;
      creator_cities: TableOf<CreatorCity>;
      takedown_requests: TableOf<TakedownRequest>;
      search_misses: TableOf<SearchMiss>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      place_type: PlaceType;
      map_status: MapStatus;
      confidence_level: ConfidenceLevel;
      takedown_status: TakedownStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
