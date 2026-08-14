-- ═══════════════════════════════════════════════════════
-- '가봤어요' 를 걷어낸다.
--
-- 0009 에서 하트(저장)와 같은 행에 visited 플래그를 뒀는데, 화면에서 이 버튼이
-- 하는 일이 약했다. 저장은 "갈 곳" 을 모으는 행위고 방문 기록은 다른 성격의
-- 제품이다 — 지금 제품이 답하는 질문("그 가게 어디였지")과 이어지지 않는다.
--
-- 되살릴 여지: 나중에 "다녀온 여행" 을 하게 되면 그때는 saved_places 의 컬럼이
-- 아니라 별도 테이블이어야 한다. 방문은 한 장소에 여러 번 생기고 날짜가 붙는데,
-- 지금 구조는 (유저, 장소) 당 한 줄이라 두 번째 방문을 표현하지 못한다.
-- 그래서 컬럼을 남겨두는 것이 미래에 도움이 되지 않는다. 지운다.
-- ═══════════════════════════════════════════════════════

-- 제약을 먼저 떨군다 — 컬럼만 지우면 제약이 남아 다음 마이그레이션에서 걸린다.
alter table saved_places drop constraint if exists saved_places_visited_needs_time;

alter table saved_places drop column if exists visited;
alter table saved_places drop column if exists visited_at;
