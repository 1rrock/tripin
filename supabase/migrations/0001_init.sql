-- ═══════════════════════════════════════════════════════
-- Tripin 초기 스키마
-- 스키마 설계 근거: CONCEPT.md 6장 / 법적 제약: LEGAL.md
--
-- 적용: Supabase 대시보드 → SQL Editor 에 붙여넣고 실행
-- ═══════════════════════════════════════════════════════

-- ── 크리에이터 ─────────────────────────────────────────
create table creators (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  display_name    text not null,
  display_name_en text,

  youtube_channel_id text not null unique,
  youtube_handle     text,

  country   text,
  languages text[] not null default '{}',
  tags      text[] not null default '{}',   -- 먹방/배낭/럭셔리/커플

  -- ⚠️ avatar_url 이 아니라 initials.
  --    부정경쟁방지법 제2조 제1호 타목은 성명과 '초상'을 나란히 규정한다.
  --    이름은 지시적 사용 항변이 서지만 초상은 대체 수단(텍스트)이 있어 방어가 약하다.
  --    LEGAL.md 1.3
  initials     text not null,
  accent_color text not null default '#2563eb',
  bio          text,

  -- 핀이 부족하거나(품질) 삭제 요청을 받으면(법적) false.
  -- 채널 단위 즉시 비공개 스위치 역할 — 정보통신망법 제44조의3 근거. LEGAL.md 4.7
  is_published boolean not null default false,

  -- 빌드 타임 집계 캐시. 런타임 집계 쿼리 금지(SSG 속도).
  -- ⚠️ 조회수·구독자수는 절대 넣지 않는다 — YouTube API §III.E.2 교차집계 제한. LEGAL.md 4.5
  place_count integer not null default 0,
  city_count  integer not null default 0,
  video_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 도시 ───────────────────────────────────────────────
create table cities (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  name_en      text not null,
  name_local   text,
  country_code text not null,
  lat          double precision not null,
  lng          double precision not null,
  default_zoom integer not null default 12,
  created_at   timestamptz not null default now()
);

-- ── 영상 ───────────────────────────────────────────────
create table videos (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references creators(id) on delete cascade,
  youtube_video_id  text not null unique,
  title             text not null,
  published_at      timestamptz,
  thumbnail_url     text,
  duration_sec      integer,

  -- ⚠️ YouTube API 정책 §III.E.4.d — Non-Authorized Data 는 30일 초과 보관 금지.
  --    월 1회 갱신 배치가 이 값을 리셋한다. 선택이 아니라 정책 요건. LEGAL.md 4.5
  api_fetched_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

-- 30일 넘은 레코드를 빨리 찾기 위한 인덱스 (갱신 배치용)
create index videos_api_fetched_at_idx on videos (api_fetched_at);
create index videos_creator_id_idx on videos (creator_id);

-- 저장하지 않는 것: view_count, like_count, subscriber_count
--   → YouTube API §III.E.2 교차 채널 집계 제한 대상

-- ── 장소 ───────────────────────────────────────────────
create type place_type as enum (
  'restaurant', 'cafe', 'attraction', 'hotel',
  'bar', 'shop', 'viewpoint', 'other', 'unknown'
);

-- confirmed 만 지도에 강조. candidate 는 리스트 하단 '위치 확인 중'. none 은 비공개.
create type map_status as enum ('confirmed', 'candidate', 'none');

create table places (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  name_local text,
  name_en    text,

  city_id      uuid not null references cities(id) on delete restrict,
  country_code text not null,
  place_type   place_type not null default 'unknown',

  -- 지도에 찍는 좌표·주소 — Overture / Foursquare 오픈 데이터셋 출처.
  lat     double precision,
  lng     double precision,
  address text,

  -- ⛔ 딥링크 전용. 이 값으로 받은 상호·주소·좌표를 MapLibre 지도에 표시하면 약관 위반이다.
  --    "Customer will not (i) display or use Places content on a non-Google Map"
  --    place_id 자체는 캐싱 제한 면제라 무기한 보관 가능. LEGAL.md 4장
  google_place_id text,
  kakao_place_id  text,

  map_status map_status not null default 'candidate',

  -- 자체 작성 요약. 40~200자. 대사 복붙 금지.
  -- AdSense '독립적 가치' 요건이기도 하다 — 미작성 시 광고 게재 조건 미충족. LEGAL.md 4.5
  summary         text,
  summary_bullets text[] not null default '{}',

  -- ★ 확정 근거 기록 필수 (영상 속 간판 / 지역 언급 / 타임스탬프).
  --   동명이점 오확정이 이 프로젝트 유일한 구조적 리스크다. LEGAL.md 4.6
  source_note text,

  price_hint text,   -- "영상 촬영 시점 기준" 전제. 구체 숫자보다 구간 권장
  tips       text,

  is_published boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index places_city_id_idx on places (city_id);
create index places_map_status_idx on places (map_status);

-- confirmed 인데 좌표가 없으면 지도에 못 찍는다 — 데이터 무결성 방어
alter table places add constraint places_confirmed_needs_coords
  check (map_status <> 'confirmed' or (lat is not null and lng is not null));

-- ── 영상 ↔ 장소 (N:M) ──────────────────────────────────
create type confidence_level as enum ('high', 'medium', 'low');

create table video_places (
  video_id      uuid not null references videos(id) on delete cascade,
  place_id      uuid not null references places(id) on delete cascade,

  -- 아웃링크에 &t= 로 붙는다. 70% 이상 확보가 조각 완성 기준. CONCEPT.md 7.1
  timestamp_sec integer,
  mention_note  text,

  -- low 는 공개하지 않는다 (어드민에만 표시)
  confidence confidence_level not null default 'medium',

  created_at timestamptz not null default now(),
  primary key (video_id, place_id)
);

create index video_places_place_id_idx on video_places (place_id);

-- ── 채널×도시 조각 (콘텐츠 제작·공개 단위) ──────────────
create table creator_cities (
  creator_id   uuid not null references creators(id) on delete cascade,
  city_id      uuid not null references cities(id) on delete cascade,
  place_count  integer not null default 0,
  intro_text   text,                       -- 도시 요약 2~3문장, 직접 작성
  published_at timestamptz,                -- null 이면 미공개
  primary key (creator_id, city_id)
);

-- ── 삭제·정정 요청 ─────────────────────────────────────
-- 정보통신망법 제44조의2 법정 절차. 약관에 절차 명시가 법정 의무(§44조의2⑤).
-- 임시조치는 30일 이내에 결론. LEGAL.md 4.7
create type takedown_status as enum ('received', 'blinded', 'resolved', 'rejected');

create table takedown_requests (
  id              uuid primary key default gen_random_uuid(),
  target_type     text not null,           -- 'creator' | 'place' | 'video'
  target_id       uuid,
  target_url      text,
  requester_email text,
  reason          text not null,
  status          takedown_status not null default 'received',

  -- 임시조치 시작 시각. +30일이 결론 기한.
  blinded_at  timestamptz,
  resolved_at timestamptz,

  created_at timestamptz not null default now()
);

-- ── 검색 실패 로그 (콘텐츠 수요 수집) ───────────────────
-- 다음에 만들 조각의 우선순위를 정하는 최고의 데이터. CONCEPT.md 4.7
create table search_misses (
  query        text primary key,
  count        integer not null default 1,
  last_seen_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════
-- RLS — 반드시 켠다.
--
-- anon 키는 브라우저에 노출되는 것이 전제다. RLS가 유일한 방어선이므로
-- 새 테이블을 만들 때마다 enable + 정책을 같이 쓴다.
--
-- 공개 페이지는 SSG로 빌드 타임에 구워지지만, anon 키가 노출된 이상
-- 누구든 직접 API를 때릴 수 있다. 미공개 데이터가 새면 안 된다.
-- ═══════════════════════════════════════════════════════

alter table creators          enable row level security;
alter table cities            enable row level security;
alter table videos            enable row level security;
alter table places            enable row level security;
alter table video_places      enable row level security;
alter table creator_cities    enable row level security;
alter table takedown_requests enable row level security;
alter table search_misses     enable row level security;

-- 공개 읽기 — is_published = true 인 것만.
-- 삭제 요청으로 is_published 를 false 로 내리면 즉시 안 보인다.
create policy "public read published creators" on creators
  for select using (is_published = true);

create policy "public read cities" on cities
  for select using (true);

create policy "public read published places" on places
  for select using (is_published = true);

-- 영상·연결은 공개된 장소에 딸린 것만 보이게
create policy "public read videos of published creators" on videos
  for select using (
    exists (select 1 from creators c where c.id = videos.creator_id and c.is_published)
  );

create policy "public read video_places of published places" on video_places
  for select using (
    exists (select 1 from places p where p.id = video_places.place_id and p.is_published)
  );

create policy "public read published creator_cities" on creator_cities
  for select using (published_at is not null);

-- 삭제 요청은 누구나 넣을 수 있어야 한다(법정 창구). 단 조회는 못 한다.
create policy "anyone can submit takedown" on takedown_requests
  for insert with check (true);

-- takedown_requests / search_misses 에 select 정책이 없다 = anon 은 읽을 수 없다.
-- 어드민은 service_role 키로 RLS를 우회하므로 별도 정책이 필요 없다.

-- ── updated_at 자동 갱신 ───────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger creators_touch before update on creators
  for each row execute function touch_updated_at();
create trigger places_touch before update on places
  for each row execute function touch_updated_at();
