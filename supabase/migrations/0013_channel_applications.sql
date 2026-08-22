-- 채널 등록 신청 — 크리에이터가 "내 채널도 실어달라"고 접수하는 폼의 저장소.
--
-- ROADMAP "유저 참여는 폼이지 게시판이 아니다"의 세 번째 폼이다(신고·제보 다음).
-- 공개 표시가 없으므로 임시조치·모더레이션 의무가 발생하지 않고, 등록은
-- 기존 인제스트 파이프라인 + 어드민 확정 큐를 그대로 거친다 — 셀프 퍼블리시가
-- 아니다(오확정은 유일한 구조적 리스크, 0001_init.sql:121).
--
-- 접근 모양은 search_misses(0008)와 같다: RLS 만 켜고 정책은 없다 — anon 은
-- 테이블을 직접 못 만진다. 쓰기는 아래 definer RPC 를 service_role 라우트
-- (/api/channel-apply)가 대신 부르고, 읽기는 어드민(service_role)만 한다.
-- takedown INSERT 구멍(0006)을 반복하지 않기 위한 배치다.

create table channel_applications (
  id uuid primary key default gen_random_uuid(),
  -- 유튜브 채널 주소 (youtube.com/@handle 또는 /channel/UC…) — 라우트가 호스트를 검증한다
  channel_url text not null,
  -- 회신 창구. 등록/보류 결과를 알릴 유일한 길이라 필수다
  contact_email text not null,
  -- 대표 영상 링크들(줄바꿈 구분) — 설명란에 장소 정보가 있는지, 파이프라인이
  -- 먹히는 채널인지 신청 단계에서 가늠하는 재료
  video_urls text,
  note text,
  -- new → done(등록됨) / dismissed(보류·거절). 어드민만 바꾼다
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table channel_applications enable row level security;

-- 원자적일 필요는 없지만 RPC 로 감싸는 이유는 0008 과 같다: PostgREST 가
-- 테이블 INSERT 정책 없이도 함수를 /rpc 로 노출하므로, 실행 권한을 잠가
-- service_role 경유만 남긴다.
create or replace function submit_channel_application(
  p_channel_url text,
  p_contact_email text,
  p_video_urls text,
  p_note text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into channel_applications (channel_url, contact_email, video_urls, note)
  values (p_channel_url, p_contact_email, p_video_urls, p_note);
$$;

revoke execute on function submit_channel_application(text, text, text, text) from public;
revoke execute on function submit_channel_application(text, text, text, text) from anon;
revoke execute on function submit_channel_application(text, text, text, text) from authenticated;
