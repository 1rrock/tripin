-- 언급 정책이 **대상 장소의 공개 여부**까지 보게 한다.
--
-- 0014 의 정책은 `is_published = true`(언급 행 자신)만 봤다. 승인된 언급이 비공개
-- 장소를 가리키면 anon 이 그 `place_id` 와 `source_note`(근거 문장, 0015)를 그대로
-- 읽는다. 삭제·정정 요청으로 장소를 내려도(정보통신망법 제44조의2 임시조치,
-- 0001_init.sql:171) 언급 쪽 통로가 열린 채 남는다는 뜻이다 — "삭제 요청으로
-- is_published 를 false 로 내리면 즉시 안 보인다"(0001_init.sql:219)가 깨진다.
--
-- 같은 통로는 이미 두 번 막아 뒀다. videos·video_places(0001_init.sql:230-238)와
-- saved_places 의 insert with check(0009:139-146)가 전부 대상 테이블과 조인해 공개
-- 여부를 확인한다 — 후자의 주석은 "미공개 장소의 id 존재 확인 통로를 닫는다"고
-- 적고 있고, 여기는 id 에 더해 근거 문장까지 나간다. 그 모양을 그대로 따른다.
--
-- 실측(2026-08-24): 언급 8행 전부 mention_pub=t / place_pub=t — **지금 새는 것은
-- 0건이다.** 승인 뒤 장소를 비공개로 내리는 순간 열린다. 지금이 고칠 때다.
--
-- 정책 **이름은 유지**한다 — 같은 이름으로 다시 만든다. 0014 의 나머지(쓰기 정책
-- 없음 = anon 은 못 쓰고 시드·승인은 service_role 만)는 그대로다.

drop policy if exists "public read published celebrity mentions" on place_celebrity_mentions;

create policy "public read published celebrity mentions" on place_celebrity_mentions
  for select using (
    is_published = true
    and exists (
      select 1 from places p
      where p.id = place_celebrity_mentions.place_id and p.is_published
    )
  );
