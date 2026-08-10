-- 영문 콘텐츠 컬럼 — EN 화면의 산문을 채우기 위한 자리.
--
-- 왜 필요한가: UI 크롬은 i18n 이 붙었는데 요약·주소 같은 **산문은 DB 에만** 있어서
-- /en 화면이 반쪽만 영어였다. 도시명·장소명은 name_en / name_local 로 이미 풀렸고,
-- 남은 것이 아래 네 가지(+도시 인트로)다.
--
-- ⚠️ docs/I18N.md §7 은 "기계번역 일괄 공개 금지"를 명시한다. 근거는 톤·품질과
--    AdSense 독립적 가치 요건(LEGAL.md:359)이다. 그래서 번역문을 그냥 붓지 않고
--    **출처를 함께 저장**한다:
--
--      en_source = 'machine'  기계 초벌. 화면에 자동 번역임을 표시하고 원문을 함께 준다
--      en_source = 'human'    운영자가 검수·수정 완료. 표시 없이 그대로 노출
--      en_source = null       영문 없음 → 화면은 요약을 숨긴다(/type 의 기존 정책과 통일)
--
--    "검수 없는 일괄 공개"를 피하면서 EN 화면이 비지 않게 하는 절충이다.
--    원문(한국어)은 그대로 남으므로 되돌리는 비용은 컬럼 하나 비우는 것뿐이다.

alter table places
  add column if not exists summary_en          text,
  add column if not exists summary_bullets_en  text[] not null default '{}',
  add column if not exists address_en          text,
  add column if not exists price_hint_en       text,
  add column if not exists en_source           text,
  add column if not exists en_translated_at    timestamptz;

alter table places
  drop constraint if exists places_en_source_check;
alter table places
  add constraint places_en_source_check
  check (en_source is null or en_source in ('machine', 'human'));

comment on column places.en_source is
  'null=영문 없음(요약 숨김) / machine=기계 초벌(자동번역 표시+원문 제공) / human=검수 완료';

-- 도시 인트로도 같은 화면(조각 페이지)에 나온다. 여기만 한국어로 남으면
-- 장소를 번역한 의미가 없어서 함께 둔다. 행 수가 적어 비용은 무시할 수준이다.
alter table creator_cities
  add column if not exists intro_text_en text;

-- 검수 대기열을 어드민에서 빠르게 뽑기 위한 부분 인덱스.
create index if not exists places_en_review_queue
  on places (updated_at desc)
  where en_source = 'machine';
