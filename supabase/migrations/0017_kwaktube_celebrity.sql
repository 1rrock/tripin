-- 곽튜브를 인물 풀에 넣는다 — 2026-08-23 운영자 결정.
-- 딥 인터뷰 1라운드("유명 유튜버까지 전부")의 원래 답을 복원하는 것.
-- 인물 개념 전환(4라운드) 때 빠졌지만, 구독 268만의 얼굴은 "알아볼 얼굴"이다.
update creators set celebrity_name = '곽튜브', celebrity_name_en = 'Kwaktube'
where slug = 'kwaktube';

update creators set tags = array_append(tags, 'celebrity')
where slug = 'kwaktube' and not tags @> '{celebrity}';
