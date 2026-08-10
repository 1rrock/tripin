-- 검색 실패어 기록 RPC — 홈 검색이 0건일 때 어떤 말로 찾았는지 남긴다.
--
-- 왜 RPC 인가: supabase-js 의 upsert 는 `count = count + 1` 같은 증가식을
-- 표현하지 못한다. 원자적 카운트 증가는 DB 함수가 맡는다.
--
-- 왜 실행 권한을 잠그나: search_misses 는 RLS 만 켜져 있고 정책이 없어 anon 이
-- 테이블을 직접 못 만지지만, PostgREST 는 함수를 /rpc 로도 노출한다. 잠그지
-- 않으면 takedown INSERT 구멍(0006)과 같은 모양의 구멍이 열린다. 호출은
-- service_role(라우트 핸들러)만 한다.

create or replace function log_search_miss(q text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into search_misses (query, count, last_seen_at)
  values (q, 1, now())
  on conflict (query) do update
    set count = search_misses.count + 1,
        last_seen_at = now();
$$;

revoke execute on function log_search_miss(text) from public;
revoke execute on function log_search_miss(text) from anon;
revoke execute on function log_search_miss(text) from authenticated;
