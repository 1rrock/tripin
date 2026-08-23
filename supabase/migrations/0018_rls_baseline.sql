-- ═══════════════════════════════════════════════════════
-- RLS 기본선 — 리포에 없던 방어를 코드로 되돌린다.
--
-- 배경: 라이브 DB 에는 이벤트 트리거 `ensure_rls`(ddl_command_end) →
--       `public.rls_auto_enable()`(SECURITY DEFINER, search_path=pg_catalog)가
--       살아 있어 public 스키마에 새로 생기는 테이블의 RLS 를 자동으로 켠다.
--       그런데 그 정의가 **리포에 한 줄도 없다**(전체 grep 0건). 즉 새 Supabase
--       프로젝트에 `npm run db:migrate` 를 돌리면 그 방어가 통째로 빠진 채 선다.
--
-- 지금 그 트리거가 유일하게 막고 있는 것 둘:
--   · `_migrations`            — `scripts/db-run.mjs:117` 의 `create table if not exists`
--   · `_bulk_confirm_20260805` — `0002_confirm_all_candidates.sql:19` 의 `create table as`
-- 둘 다 스스로 RLS 를 켜지 않는다. anon 은 Supabase 기본 grant 로 두 테이블에
-- SELECT·INSERT·UPDATE·DELETE·TRUNCATE 를 전부 들고 있다(grant 실측). `_migrations`
-- 행을 지우면 이미 적용된 마이그레이션이 다시 도는 것까지 유발한다.
--
-- "anon 키는 브라우저에 노출되는 것이 전제다. RLS가 유일한 방어선"(0001_init.sql:200).
-- 그 원칙이 정작 인프라 테이블 두 개에서 코드로는 지켜지지 않고 있었다.
--
-- ⚠️ 이벤트 트리거만으로는 못 메운다. `_migrations` 는 `ensureLedger()` 가
--    **어떤 마이그레이션보다 먼저** 만들기 때문에, 새 프로젝트에서 이 파일이 돌 때는
--    이미 존재한다 — 트리거가 잡을 기회가 아예 없다. 그래서 ②에서 명시적으로 켠다.
--    ①은 "앞으로 생길 테이블"용 안전망이고, 실제 구멍을 메우는 것은 ②다.
--
-- 이 파일은 멱등하다. 두 번 돌려도 결과가 같다.
-- ═══════════════════════════════════════════════════════


-- ── ① rls_auto_enable() + ensure_rls 이벤트 트리거 ─────
--
-- 라이브와 같은 모양으로 맞춘다: SECURITY DEFINER, `search_path = pg_catalog` 고정.
-- search_path 고정은 선택이 아니다 — definer 함수에서 빠뜨리면 호출자가 심어 둔
-- 스키마의 동명 함수가 대신 불릴 수 있다(0013 의 definer RPC 와 같은 원칙).
--
-- 전체를 DO + 예외 처리로 감싼 이유: 이벤트 트리거 생성은 슈퍼유저 권한을 요구하고
-- 관리형 Postgres 에서는 그 권한이 없을 수 있다. 라이브에는 이미 존재하므로 실패해도
-- 잃는 것이 없고, 여기서 파일 전체를 죽이면 ②(진짜 구멍)까지 같이 못 돈다.
-- 대신 조용히 넘기지 않는다 — WARNING 을 남긴다.
do $do$
begin
  execute $fn$
    create or replace function public.rls_auto_enable()
    returns event_trigger
    language plpgsql
    security definer
    set search_path = pg_catalog
    as $body$
    declare
      obj record;
    begin
      for obj in select * from pg_event_trigger_ddl_commands() loop
        -- public 스키마의 **일반 테이블**(relkind='r')만. 뷰·시퀀스·외부 테이블은 대상이 아니고,
        -- 이미 켜져 있으면(relrowsecurity) 건드리지 않는다.
        if obj.schema_name = 'public'
           and exists (
             select 1 from pg_class c
             where c.oid = obj.objid and c.relkind = 'r' and not c.relrowsecurity
           )
        then
          -- object_identity 는 PG 가 스키마까지 붙여 인용해 준 이름이라 그대로 쓴다
          execute format('alter table %s enable row level security', obj.object_identity);
        end if;
      end loop;
    end
    $body$;
  $fn$;

  -- 재적용 안전 — drop 후 생성. `alter table` 은 아래 tag 목록에 없으므로
  -- 함수가 부르는 DDL 이 자기 트리거를 다시 깨우는 재귀는 생기지 않는다.
  execute 'drop event trigger if exists ensure_rls';
  execute $et$
    create event trigger ensure_rls on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable()
  $et$;

  raise notice 'ensure_rls 이벤트 트리거를 (재)설치했습니다.';
exception
  when insufficient_privilege then
    raise warning 'ensure_rls 를 만들지 못했습니다(권한 부족). 라이브 DB 에는 이미 있으므로 그 경우는 정상입니다. 새 프로젝트라면 슈퍼유저로 이 파일의 ① 블록을 수동 적용하세요 — ② 는 그대로 적용됩니다.';
end
$do$;


-- ── ② 이벤트 트리거가 잡을 수 없는 두 테이블 ───────────
--
-- ⚠️ `force row level security` 는 **쓰지 않는다.** Postgres 는 RLS 를 테이블
--    소유자에게 적용하지 않는데(FORCE 를 붙였을 때만 적용된다), `_migrations` 를
--    만드는 것도 읽고 쓰는 것도 `scripts/db-run.mjs` 가 SUPABASE_DB_URL 로 붙는
--    바로 그 롤이다(`ensureLedger()` 가 `create table if not exists` 로 만든다 →
--    그 롤이 소유자다). 즉 FORCE 없이 켜면 마이그레이션 도구는 영향을 받지 않고,
--    anon/authenticated 만 정책 0개 = 전면 차단이 된다.
--    FORCE 를 붙이는 순간 소유자까지 막혀 `db:migrate` 자체가 잠긴다.
--
-- 그래도 소유자를 실행 시점에 확인하고 넘어간다 — 만약 이 롤이 소유자가 아니라면
-- RLS 를 켜는 순간 도구가 잠기므로, 그때는 켜지 말고 사람에게 알린다.
--
-- 되돌리려면: alter table public._migrations disable row level security;
do $$
declare
  t text;
  ref regclass;
  owned boolean;
begin
  foreach t in array array['public._migrations', 'public._bulk_confirm_20260805'] loop
    ref := to_regclass(t);
    if ref is null then
      -- `_migrations` 는 ensureLedger() 가, `_bulk_confirm_20260805` 는 0002 가 만든다.
      -- 없다면 이후에 생기고, 그때는 ①의 ensure_rls 가 잡는다.
      raise notice '% 가 없어 건너뜁니다.', t;
      continue;
    end if;

    select pg_has_role(c.relowner, 'USAGE') into owned from pg_class c where c.oid = ref;
    if not owned then
      raise warning '% 의 소유자가 현재 롤이 아닙니다 — RLS 를 켜면 이 롤이 스스로 잠기므로 건너뜁니다. 소유자 롤로 다시 적용하세요.', t;
      continue;
    end if;

    execute format('alter table %s enable row level security', ref);

    -- 정책은 만들지 않는다. RLS on + 정책 0개 = 소유자 외 전면 차단이고,
    -- 그게 이 두 테이블에 맞는 모양이다 (search_misses(0008)·channel_applications(0013)
    -- 와 같은 봉쇄 원칙 — "RLS 만 켜고 정책은 없다").
    -- grant 도 같이 회수한다: RLS 가 꺼지는 사고가 나도 한 겹이 더 남는다.
    begin
      execute format('revoke all on %s from anon, authenticated', ref);
    exception
      when undefined_object then
        raise notice 'anon/authenticated 롤이 없어 revoke 를 건너뜁니다(Supabase 밖 DB).';
    end;
  end loop;
end
$$;
