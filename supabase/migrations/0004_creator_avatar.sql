-- 크리에이터 프로필 사진 + 채널 메타 정확도
--
-- 그동안 아바타 컬럼을 일부러 두지 않았다(0001_init 의 initials 주석 참조 — 초상 사용
-- 리스크 회피, LEGAL.md 1.3). 사용자가 프로필 노출을 명시적으로 요청해 방침을 바꾼다.
-- 근거와 남은 리스크는 LEGAL.md 1.3 과 PRODUCT.md 에 함께 기록한다.
--
-- ⚠️ avatar_url 과 display_name 은 YouTube 유래 메타다. 영상 제목과 같은 범주라
--    무기한 보관하면 정책 위반이다(§III.E.4.d, 30일 — LEGAL.md 4.5).
--    videos.api_fetched_at 과 같은 방식으로 여기에도 시각을 남겨,
--    월 1회 갱신 배치가 두 테이블을 한 번에 훑을 수 있게 한다.
--
--    영상 썸네일은 youtube_video_id 에서 URL 을 유도하므로(shared/lib/youtube.ts)
--    저장 대상이 아니지만, 채널 아바타 URL 은 해시라 유도할 수 없어 저장이 불가피하다.

alter table creators
  add column if not exists avatar_url     text,
  add column if not exists api_fetched_at timestamptz not null default now();

comment on column creators.avatar_url is
  'YouTube 채널 프로필 이미지 URL (yt3.googleusercontent.com). 크기 접미사(=s88-c-k-...)를 '
  '렌더 시점에 바꿔 쓴다. NULL 이면 initials 로 폴백한다. 30일 갱신 대상.';

comment on column creators.api_fetched_at is
  'display_name / avatar_url 을 마지막으로 갱신한 시각. 30일 초과 시 정책 위반(LEGAL.md 4.5).';

-- 30일 넘은 레코드를 빨리 찾기 위한 인덱스 (갱신 배치용) — videos 와 같은 패턴
create index if not exists creators_api_fetched_at_idx on creators (api_fetched_at);
