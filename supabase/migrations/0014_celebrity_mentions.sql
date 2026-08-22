-- 홈 "연예인이 간 장소" 섹션의 데이터 발판.
--
-- 연예인은 채널 주인이 아니라 **인물**이다 — 성시경처럼 본인 채널이 있는 경우도,
-- "신동엽·성시경도 몰래 다녀간 해장국집"(김사원세끼)처럼 남의 영상이 언급만
-- 하는 경우도 있다. 전자(a)는 creators 에서 파생하고, 후자(b)만 이 테이블에 담는다.
-- (a)까지 물화하면 영상이 늘 때마다 동기화 배치가 필요해진다 — 그래서 안 한다.

-- (b) 언급: 이 장소를 어떤 연예인이 다녀갔다고 영상이 말한다.
-- ⚠️ 제목 정규식으로 자동 시드하지 않는다. "백종원과 정반대인 셰프" 같은
-- 오탐이 있어(08-18 place_id 오확정 사고와 같은 급의 리스크) 사람이 승인한
-- 행만 is_published 를 올린다. 시드는 db-run.mjs(service_role) 경로.
create table place_celebrity_mentions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  -- 인물 표시명. (a)의 creators.celebrity_name 과 같은 표기를 쓴다 —
  -- 라운드로빈이 이 문자열로 인물을 묶는다.
  person_name text not null,
  person_name_en text,
  -- 언급이 나온 영상 — 카드 썸네일이 이 영상의 컷을 쓴다
  source_video_id uuid references videos(id) on delete set null,
  -- 사람 승인 전 false. RLS 가 anon 노출을 이 값으로 건다
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (place_id, person_name)
);

alter table place_celebrity_mentions enable row level security;

-- 읽기: 승인된 행만 공개. 쓰기 정책은 없다 — anon 은 못 쓰고,
-- 시드·승인은 service_role(db-run.mjs)만 한다 (0013 의 봉쇄 원칙에서
-- select 한 장만 열어 둔 꼴).
create policy "public read published celebrity mentions" on place_celebrity_mentions
  for select using (is_published = true);

-- (a) 파생용 인물 표기 — display_name("추성훈 ChooSungHoon")에서 파싱하지 않고
-- 명시 등록한다. 값이 있는 채널만 섹션의 (a) 풀에 들어간다.
alter table creators add column celebrity_name text;

update creators set celebrity_name = '성시경' where slug = 'sungsikyung';
update creators set celebrity_name = '추성훈' where slug = 'chuseonghoon';
update creators set celebrity_name = '강레오' where slug = 'kang-leo';
update creators set celebrity_name = '최강록' where slug = 'choi-kangrok';

-- celebrity 태그 정합 — 이미 성시경·강레오에 있고, 추성훈·최강록에 추가(멱등)
update creators set tags = array_append(tags, 'celebrity')
where slug in ('chuseonghoon', 'choi-kangrok')
  and not tags @> '{celebrity}';
