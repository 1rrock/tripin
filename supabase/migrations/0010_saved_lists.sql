-- ═══════════════════════════════════════════════════════
-- 저장 그룹 — "도쿄 3박4일", "가보고 싶은 카페" 처럼 묶는다.
--
-- 구글 지도·네이버 지도의 목록과 같은 모델이다:
--   · 하트(saved_places) = 저장한 곳 **전체**. 여기가 원장이다.
--   · 그룹(saved_lists)  = 그 위에 얹는 분류. 한 장소가 여러 그룹에 들어간다.
--
-- 그룹을 saved_places 의 컬럼(list_id)으로 만들지 않은 이유가 그것이다.
-- 컬럼이면 한 장소가 한 그룹에만 속한다 — "도쿄 여행" 이면서 "카페" 인 곳을
-- 표현하지 못한다. 여행 계획은 실제로 그렇게 겹친다.
--
-- 그룹에 넣으면 saved_places 에도 자동으로 들어간다(앱에서 같이 넣는다).
-- 저장 목록에 안 보이는데 그룹에는 있는 상태를 만들지 않는다.
-- ═══════════════════════════════════════════════════════

create table saved_lists (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,

  -- 유저가 끌어 옮기는 순서. 같은 값이면 created_at 으로 가른다.
  position integer not null default 0,

  -- 🚧 공개 공유 예비. 지금은 'private' 고정이고 UI 가 없다.
  --    ROADMAP.md "스키마를 미리 열어둔다 — 기능은 0개".
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),

  created_at timestamptz not null default now(),

  -- 빈 이름·공백만 있는 이름을 DB 에서 막는다. 앱 검증만 믿으면 반드시 새어 들어온다.
  constraint saved_lists_name_not_blank check (length(btrim(name)) between 1 and 40)
);

-- 같은 이름의 그룹을 두 개 만들지 못하게 한다.
-- 대소문자·앞뒤 공백을 무시하는 이유: "도쿄" 와 "도쿄 " 가 따로 생기면
-- 유저는 왜 두 개인지 모른다. 실수로 두 번 눌러 생기는 중복이 대부분이다.
create unique index saved_lists_user_name_idx
  on saved_lists (user_id, lower(btrim(name)));

create index saved_lists_user_order_idx on saved_lists (user_id, position, created_at);

-- ── 그룹 ↔ 장소 (N:M) ─────────────────────────────────
create table saved_list_places (
  list_id  uuid not null references saved_lists(id) on delete cascade,
  place_id uuid not null references places(id)      on delete cascade,

  -- ⚠️ 정규화하면 없어도 되는 컬럼이다. 그런데도 두는 이유는 RLS 다.
  --    이게 없으면 모든 정책이 saved_lists 로 조인해 소유자를 확인해야 하고,
  --    그 서브쿼리가 목록을 그릴 때마다 행마다 돈다.
  --    아래 insert 정책이 list 의 실제 소유자와 이 값이 같은지 확인하므로
  --    위조해서 넣을 수는 없다.
  user_id uuid not null references auth.users(id) on delete cascade,

  added_at timestamptz not null default now(),

  primary key (list_id, place_id)
);

create index saved_list_places_user_idx on saved_list_places (user_id);
create index saved_list_places_place_idx on saved_list_places (place_id);

-- ═══════════════════════════════════════════════════════
-- RLS — 0009 와 같은 규율. 전부 소유자 전용이다.
-- ═══════════════════════════════════════════════════════

alter table saved_lists       enable row level security;
alter table saved_list_places enable row level security;

-- ── saved_lists ──
create policy "read own lists" on saved_lists
  for select using (auth.uid() = user_id);

create policy "insert own lists" on saved_lists
  for insert with check (auth.uid() = user_id);

create policy "update own lists" on saved_lists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own lists" on saved_lists
  for delete using (auth.uid() = user_id);

-- ── saved_list_places ──
create policy "read own list places" on saved_list_places
  for select using (auth.uid() = user_id);

-- 세 가지를 동시에 만족해야 넣을 수 있다:
--   1. user_id 가 자기 자신    — 남의 이름으로 못 넣는다
--   2. 그 그룹이 실제로 내 것  — 위 user_id 를 위조해도 여기서 걸린다
--   3. 장소가 공개된 것        — 0009 와 같은 이유(미공개 장소 존재 확인 통로 차단)
create policy "insert own list places" on saved_list_places
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from saved_lists l
      where l.id = saved_list_places.list_id and l.user_id = auth.uid()
    )
    and exists (
      select 1 from places p
      where p.id = saved_list_places.place_id and p.is_published = true
    )
  );

create policy "delete own list places" on saved_list_places
  for delete using (auth.uid() = user_id);
