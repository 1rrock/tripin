-- 구글 지도 딥링크를 "가게 페이지"로 열기 위한 공유 링크 저장.
--
-- place_id(ChIJ…)는 Places API 없이 얻을 수 없고, 공유 링크(maps.app.goo.gl/…)는
-- 운영자가 지도에서 2클릭으로 복사할 수 있다. 링크가 있으면 좌표 검색 대신 이걸 연다.
alter table places add column google_maps_url text;
