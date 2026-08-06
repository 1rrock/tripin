-- 후보 장소 전부 확정 승격 (2026-08-05, 사용자 지시)
--
-- 배경: 확정 8곳 / 후보 12곳이라 8핀 공개 게이트를 넘는 조각이 하나도 없었다.
--       (도쿄 5 · 부산 1 · 고베 1 · 후쿠오카 1 · 오사카 0 · 삿포로 0 · LA 0)
--       배포 전 개발 단계이므로 일괄 확정해 화면을 실제 데이터로 채운다.
--
-- ⚠️ 이건 검수를 거친 확정이 아니다. LEGAL.md 는 "동명이점·체인은 지점 특정 전까지
--    확정 금지"를 요구한다. 공개 배포 전에 아래 항목들은 반드시 사람이 다시 검수해야 한다:
--      · 매드해피 도쿄        — 브랜드명, 지점 특정 필요
--      · 다케시타 거리        — 점이 아니라 거리, 좌표 기준점 판단 필요
--      · 이마카츠 롯폰기 본점  — 체인, "본점" 표기로 특정되는지 확인 필요
--      · 쿠시카츠 다나카 아메리카무라점 · 나가하마 넘버원 기온점 — 체인 지점
--      · 돈키호테 후쿠오카 텐진 본점 — 체인 지점
--    되돌리려면: update places set map_status = 'candidate' where id in (...);

begin;

-- 승격 대상을 먼저 남겨둔다 (되돌릴 때 참조용)
create table if not exists _bulk_confirm_20260805 as
select id, name, map_status as prev_status, now() as promoted_at
from places
where map_status <> 'confirmed';

update places
set map_status = 'confirmed'
where map_status <> 'confirmed';

-- 공개 플래그도 함께 켠다 (RLS 가 is_published 로 anon 노출을 거른다)
update places
set is_published = true
where is_published = false;

commit;

-- 결과 확인
select
  c.name as city,
  count(*) filter (where p.map_status = 'confirmed') as confirmed,
  count(*) filter (where p.map_status <> 'confirmed') as candidate
from places p
join cities c on c.id = p.city_id
group by c.name
order by confirmed desc;
