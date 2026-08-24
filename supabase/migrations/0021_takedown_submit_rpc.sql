-- 삭제·정정 요청의 **인입 경로**를 연다 — `/takedown` 폼이 쏘는 유일한 목적지.
--
-- 왜 지금인가: 이 테이블은 어드민 큐(`/admin/queue`)가 읽기만 하고, 리포 어디에도
-- INSERT 하는 코드가 없었다. 실측 행 수 0. 즉 운영자는 **빈 큐를 "요청 없음"으로**
-- 읽고 대시보드의 `openTakedowns > 0` 경보는 영원히 안 뜬다. 그 사이 정보통신망법
-- §44조의2④ 의 30일 시계는 돈다 — 접수 창구가 mailto: 하나뿐이라 접수 사실 자체가
-- 운영자 메일함에만 남았다.
--
-- ⚠️ `0006` 이 지운 "anyone can submit takedown"(for insert with check(true), roles=public)을
--    **되살리지 않는다.** anon 키는 클라이언트 번들에 노출되는 게 전제라 그 정책은
--    "키를 아는 아무나 무제한 INSERT" 와 같았다. 0006 자신이 남긴 지시가
--    *"다시 열 때는 rate limit 과 함께"* 였고, 여기서는 한 발 더 가서 테이블을
--    아예 안 연다 — 접근 모양은 `0013`(channel_applications)·`0008`(search_misses)과
--    동일하다: RLS 켜짐 + 정책 0개, 쓰기는 아래 definer RPC 를 service_role 라우트
--    (`/api/takedown`)가 대신 부른다. IP 별 상한은 그 라우트에 있다.
--
--    (`ROADMAP.md` 3단계가 "0006 의 '누구나 INSERT, 아무도 SELECT' 패턴을 재사용한다"
--     고 적어 뒀는데, 0006 은 그 정책을 **지운** 파일이다. 살아 있는 패턴은 0013 쪽이다.)
--
-- 왜 RPC 로 감싸나: PostgREST 는 테이블 INSERT 정책이 없어도 함수를 `/rpc` 로 노출한다.
-- 실행 권한을 잠가 service_role 경유만 남긴다 — 0008 과 같은 이유다.

create or replace function submit_takedown_request(
  p_target_type    text,
  p_target_id      uuid,
  p_target_url     text,
  p_requester_email text,
  p_reason         text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- target_type 은 plain text 컬럼이라 DB 가 값을 막아주지 않는다. 어드민 큐의
  -- TARGET_LABEL 이 모르는 값을 받으면 "무엇에 대한 요청인지"가 화면에서 사라지므로
  -- 여기서 잠근다. 'other' 는 우리 URL 로 해석되지 않은 접수를 담는 자리다.
  if p_target_type not in ('place', 'creator', 'video', 'other') then
    raise exception 'invalid target_type: %', p_target_type;
  end if;

  -- reason 은 not null 이다. 빈 사유가 들어오면 큐에서 판단할 재료가 없다.
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason is required';
  end if;

  insert into takedown_requests (target_type, target_id, target_url, requester_email, reason)
  values (p_target_type, p_target_id, p_target_url, p_requester_email, btrim(p_reason));
end;
$$;

revoke execute on function submit_takedown_request(text, uuid, text, text, text) from public;
revoke execute on function submit_takedown_request(text, uuid, text, text, text) from anon;
revoke execute on function submit_takedown_request(text, uuid, text, text, text) from authenticated;
