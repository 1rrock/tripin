-- ═══════════════════════════════════════════════════════
-- 계정 — 저장 · 갔던 곳 · 채널 구독
--
-- 설계 근거: ROADMAP.md "계정: 만든다. 단, 회원가입은 만들지 않는다"
--
-- 흐름은 이렇다:
--   1. 하트를 처음 누르면 클라이언트가 signInAnonymously() 를 부른다.
--      화면에 로그인 UI 가 뜨지 않는다 — PRODUCT.md 원칙 5 "게이트는 없다".
--   2. 저장은 처음부터 이 테이블들에 들어간다. localStorage 를 쓰지 않는 이유는
--      인스타 인앱 웹뷰(WKWebView)가 저장소를 앱 샌드박스에 가두고,
--      Safari ITP 가 7일 미접속 시 스크립트로 쓴 저장소를 지우기 때문이다.
--      "모아뒀다가 한 달 뒤 출발" 이 이 제품의 사용 주기라 정확히 그 구간이 깨진다.
--   3. 구글 로그인은 /saved 화면에서만 권유한다. 로그인 시 익명 계정이
--      그대로 승격되므로(auth.users.id 불변) 아래 테이블은 손댈 필요가 없다.
--
-- ⚠️ 익명 유저도 auth.users 의 정식 row 다 (is_anonymous = true).
--    그래서 아래 정책들은 익명/정식을 구분하지 않는다 — auth.uid() 하나로 충분하다.
-- ═══════════════════════════════════════════════════════

-- ── 프로필 ─────────────────────────────────────────────
--
-- 지금은 쓰는 컬럼이 사실상 없다. 그런데도 만드는 이유는
-- 나중에 커뮤니티를 열게 될 때 마이그레이션이 아니라 값 채우기로 끝내기 위해서다
-- (ROADMAP.md "스키마를 미리 열어둔다 — 기능은 0개").
-- 지금 이 테이블을 안 만들면 그때 auth.users 에 조인하는 코드가 전부 바뀐다.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  -- 🚧 커뮤니티 확장 예비 컬럼. 지금은 아무 화면에서도 읽지 않는다.
  --    익명 유저에게 이름을 물어보지 않으므로 nullable 이 기본값이다.
  display_name text,
  avatar_url   text,

  created_at timestamptz not null default now()
);

-- ── 저장한 장소 · 갔던 곳 ──────────────────────────────
--
-- 하트(저장)와 체크(갔던 곳)를 별도 테이블로 쪼개지 않는다.
-- 같은 (유저, 장소) 쌍에 붙는 두 개의 상태라서, 나누면 조회할 때마다 조인이 붙고
-- "저장했는데 가본 곳" 을 세는 것이 어려워진다.
create table saved_places (
  user_id  uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references places(id)     on delete cascade,

  -- 갔던 곳 체크. 저장 없이 방문만 표시하는 경우도 이 테이블에 들어간다
  -- (saved_at 은 항상 채워지므로 "저장 목록" 은 visited 와 무관하게 전부 나온다).
  visited    boolean not null default false,
  visited_at timestamptz,

  -- 🚧 공개 목록 공유 예비. 지금은 'private' 고정이고 UI 가 없다.
  --    나중에 "내 목록 공유" 를 열 때 값만 바뀌면 된다 — 컬럼 추가가 아니라.
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),

  saved_at timestamptz not null default now(),

  primary key (user_id, place_id)
);

-- 목록 화면은 "내 저장 전부를 최신순" 이 기본 질의다.
create index saved_places_user_recent_idx on saved_places (user_id, saved_at desc);

-- visited 플래그와 시각이 어긋나지 않게 막는다.
-- (체크를 해제하면 visited_at 도 같이 지워야 한다 — 앱 코드 실수를 DB 가 잡는다)
alter table saved_places add constraint saved_places_visited_needs_time
  check (visited = false or visited_at is not null);

-- ── 채널 구독 ──────────────────────────────────────────
--
-- 유튜브 구독이 아니라 이 서비스 안에서의 구독이다.
-- "이 채널이 새 도시를 올리면 알려줘" 가 목적이고, 푸시는 PWA 단계에서 붙는다.
create table subscriptions (
  user_id    uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references creators(id)   on delete cascade,

  created_at timestamptz not null default now(),

  primary key (user_id, creator_id)
);

create index subscriptions_user_idx on subscriptions (user_id, created_at desc);

-- ── 프로필 자동 생성 ───────────────────────────────────
--
-- 익명 로그인은 클라이언트가 부르므로, 프로필 생성을 앱 코드에 맡기면
-- "계정은 있는데 프로필이 없는" 상태가 반드시 생긴다(네트워크 끊김·탭 종료).
-- DB 트리거로 못 박는다.
--
-- security definer 인 이유: auth.users 에 대한 트리거는 auth 스키마 권한으로 돌아야 한다.
-- search_path 를 고정하는 이유는 0008 과 같다 — 함수 하이재킹 방어.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ═══════════════════════════════════════════════════════
-- RLS — 0001 과 같은 규율. 새 테이블에는 항상 enable + 정책을 같이 쓴다.
--
-- anon 키는 브라우저에 노출되는 것이 전제다. 여기서 정책이 하나라도 헐거우면
-- 남의 저장 목록이 통째로 읽힌다 — 공개 데이터가 새는 것과 차원이 다르다.
--
-- 기존 테이블들은 "공개 읽기" 정책이었지만 이 셋은 **전부 소유자 전용**이다.
-- select 정책조차 auth.uid() 로 잠근다.
-- ═══════════════════════════════════════════════════════

alter table profiles      enable row level security;
alter table saved_places  enable row level security;
alter table subscriptions enable row level security;

-- ── profiles ──
create policy "read own profile" on profiles
  for select using (auth.uid() = id);

create policy "update own profile" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- insert 정책을 주지 않는다 — 생성은 위 트리거(security definer)만 한다.
-- delete 정책도 주지 않는다 — 계정 삭제 시 auth.users cascade 로 지워진다.

-- ── saved_places ──
create policy "read own saves" on saved_places
  for select using (auth.uid() = user_id);

-- ⚠️ with check 에 published 검사를 넣는 이유:
--    place_id 는 uuid 라 추측이 어렵지만, 어드민 큐에 있는 미공개 장소의 id 를
--    어떻게든 알아낸 경우 "저장" 을 통해 그 id 의 존재를 확인할 수 있게 된다.
--    공개된 장소만 저장 가능하게 막으면 그 통로가 닫힌다.
create policy "insert own saves" on saved_places
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from places p
      where p.id = saved_places.place_id and p.is_published = true
    )
  );

create policy "update own saves" on saved_places
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own saves" on saved_places
  for delete using (auth.uid() = user_id);

-- ── subscriptions ──
create policy "read own subs" on subscriptions
  for select using (auth.uid() = user_id);

-- 장소와 같은 이유로 미공개 채널은 구독할 수 없다.
create policy "insert own subs" on subscriptions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from creators c
      where c.id = subscriptions.creator_id and c.is_published = true
    )
  );

create policy "delete own subs" on subscriptions
  for delete using (auth.uid() = user_id);
