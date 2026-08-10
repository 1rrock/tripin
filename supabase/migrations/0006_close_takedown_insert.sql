-- takedown_requests 의 열린 익명 INSERT 정책을 닫는다.
--
-- 0001_init 이 만든 "anyone can submit takedown" (for insert with check (true), roles=public) 은
-- 공개 제출 폼이 있다는 전제로 넣은 정책이다. 그런데 `/takedown` 페이지는 폼 없이
-- mailto: 링크만 쓴다(src/app/(public)/takedown/page.tsx) — 이 테이블에 INSERT 하는 코드는
-- 이 리포 어디에도 없다(admin/queue 는 select·update 만 한다).
--
-- Supabase anon 키는 클라이언트 번들에 그대로 노출되는 게 정상이라, with_check(true) +
-- roles=public 조합은 "그 키를 아는 아무나 이 테이블에 무제한 INSERT 가능"과 같다.
-- 실제로 쓰는 코드가 없으니 막아도 깨지는 기능이 없고, 막지 않으면 스팸이 쌓여
-- 진짜 삭제요청(정보통신망법 §44조의2 — 지체 없이 조치해야 하는 법정 절차)이 묻힐 수 있다.
--
-- ⚠️ 나중에 공개 제출 폼을 실제로 만들 때는, 이 정책을 그대로 되살리지 말고
--    rate limit(예: IP·이메일당 시간당 N건)과 함께 다시 열 것.

drop policy if exists "anyone can submit takedown" on takedown_requests;
