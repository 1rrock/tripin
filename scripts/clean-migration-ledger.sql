-- 적용 이력(_migrations) 정리 — 임시 파일이 남긴 오염 행을 지우고 키를 상대경로로 바꾼다.
--
-- ⛔ 이 파일은 **마이그레이션이 아니다.** supabase/migrations/ 에 옮기지 마라 —
--    거기 있으면 `npm run db:migrate` 가 자동으로 돌린다. 여기 있는 이유가 그거다.
--
-- ⛔ **자동으로 실행하지 마라. 사람이 눈으로 보고 직접 돌린다.**
--      npm run db:run -- scripts/clean-migration-ledger.sql
--    (db-run.mjs 는 supabase/migrations/ 밖의 파일을 이력에 남기지 않으므로,
--     이 파일을 돌려도 _migrations 가 다시 더러워지지 않는다)
--
-- 왜 필요한가 — db-run.mjs 의 apply() 가 한동안 **아무 파일이나** basename 으로
-- _migrations 에 넣었다. 임시 SQL(`q.sql`, `q2~q15.sql`, `check.sql`, `cleanup2.sql` …)을
-- 이 도구로 돌린 것들이 그대로 이력이 됐다 — 실측 44행 중 26행. 문제는 낭비가 아니라
-- **오작동**이다: 나중에 같은 basename 의 정식 마이그레이션이 추가되면
-- `npm run db:migrate` 가 "이미 적용됨"으로 보고 조용히 건너뛴다.
--
-- 지금은 apply() 가 supabase/migrations/ 안의 파일만, 리포 기준 상대경로로 남긴다.
-- 이 스크립트는 (1) 과거 오염 행을 지우고 (2) 남은 정상 행의 키를 새 형식으로 바꾼다.

begin;

-- ── 0) 지우기 전에 통째로 백업 ──────────────────────────────────────────
--    되돌릴 일이 생기면 이 테이블에서 복사한다. 확인 후 사람이 drop 하면 된다.
create table if not exists _migrations_backup_20260824 as
  select * from _migrations;

-- ── 1) 무엇이 지워지고 무엇이 남는지 먼저 본다 ─────────────────────────
--    (psql 은 트랜잭션 안에서도 select 결과를 보여준다. 이상하면 rollback 하라)
select name,
       case
         when name in (
           '0001_init.sql', '0002_confirm_all_candidates.sql', '0002_naver_place_id.sql',
           '0003_google_maps_url.sql', '0004_creator_avatar.sql', '0005_recount_stats.sql',
           '0006_close_takedown_insert.sql', '0007_en_content.sql', '0008_search_miss_log.sql',
           '0009_accounts.sql', '0010_saved_lists.sql', '0011_drop_visited.sql',
           '0012_place_type_fishing.sql', '0013_channel_applications.sql',
           '0014_celebrity_mentions.sql', '0015_mention_source_note.sql',
           '0016_celebrity_name_en.sql', '0017_kwaktube_celebrity.sql'
         ) then '유지 → supabase/migrations/ 로 개명'
         when name like 'supabase/migrations/%' then '유지 (이미 새 형식)'
         else '삭제 (임시 파일)'
       end as 조치
from _migrations
order by 조치, name;

-- ── 2) 정식 마이그레이션 파일명이 아닌 행을 지운다 ─────────────────────
--    ⚠️ 위 목록은 2026-08-24 기준 supabase/migrations/ 전량이다.
--       나중에 돌린다면 파일 목록을 현재 디렉터리와 맞춰 놓고 돌려라 —
--       빠뜨린 이름이 있으면 그 마이그레이션이 재실행 대상이 된다.
delete from _migrations
where name not like 'supabase/migrations/%'
  and name not in (
    '0001_init.sql', '0002_confirm_all_candidates.sql', '0002_naver_place_id.sql',
    '0003_google_maps_url.sql', '0004_creator_avatar.sql', '0005_recount_stats.sql',
    '0006_close_takedown_insert.sql', '0007_en_content.sql', '0008_search_miss_log.sql',
    '0009_accounts.sql', '0010_saved_lists.sql', '0011_drop_visited.sql',
    '0012_place_type_fishing.sql', '0013_channel_applications.sql',
    '0014_celebrity_mentions.sql', '0015_mention_source_note.sql',
    '0016_celebrity_name_en.sql', '0017_kwaktube_celebrity.sql'
  );

-- ── 3) 남은 basename 키를 상대경로로 바꾼다 ────────────────────────────
--    db-run.mjs 는 옛 basename 키도 "적용됨"으로 읽어 주므로(하위호환) 이 단계를
--    건너뛰어도 재실행 사고는 안 난다. 다만 형식이 섞여 있으면 나중에 헷갈린다.
update _migrations
set name = 'supabase/migrations/' || name
where name not like 'supabase/migrations/%';

select count(*) as 남은_이력행 from _migrations;

commit;

-- 확인이 끝나면:
--   drop table _migrations_backup_20260824;
