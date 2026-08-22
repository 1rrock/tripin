-- 인물 영문 표기 — 채널 영문명("ChooSungHoon") 대용을 걷어낸다.
-- /celebs 영문 그룹 제목과 커버 뱃지가 쓴다. 값이 없으면 화면은
-- display_name_en → 한글명 순으로 물러난다(home.ts).
alter table creators add column celebrity_name_en text;

update creators set celebrity_name_en = 'Sung Si-kyung' where slug = 'sungsikyung';
update creators set celebrity_name_en = 'Choo Sung-hoon' where slug = 'chuseonghoon';
update creators set celebrity_name_en = 'Kang Leo' where slug = 'kang-leo';
update creators set celebrity_name_en = 'Choi Kang-rok' where slug = 'choi-kangrok';
