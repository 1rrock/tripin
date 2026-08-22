-- 언급 후보의 근거 문장 — 검수자가 "어느 문장 때문에 잡혔나"를 행에서 바로 본다.
-- places.source_note(확정 근거, 0001)와 같은 역할: 판단 근거를 데이터 옆에 둔다.
-- 프로브(probe-celebrity-mentions.mjs --insert)가 is_published=false 후보를 넣을 때
-- 채우고, 사람이 검수 후 is_published 만 올린다. RLS 는 0014 그대로 —
-- 미승인 행은 anon 에 보이지 않으므로 이 컬럼도 새 정책이 필요 없다.
alter table place_celebrity_mentions add column source_note text;
