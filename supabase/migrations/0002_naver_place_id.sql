-- 네이버 지도 딥링크 지원.
-- 장소마다 확보된 ID 에 따라 구글/카카오/네이버 앱으로 열어준다 (shared/lib/map-links.ts).
alter table places add column naver_place_id text;
