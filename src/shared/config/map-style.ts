import styleJson from "./lightbox-map-style.json";

/**
 * 지도 스타일 — 라이트박스.
 *
 * 이 월드의 지면은 암실(어두움)인데 지도는 낮에 길 위에서 봐야 한다. 그 충돌을
 * 테마 분기가 아니라 **재료**로 푼다: 지도는 암실 작업대에 놓인 라이트박스,
 * 즉 어두운 화면에서 유일하게 밝은 면이다.
 *
 * 목표는 "예쁜 지도"가 아니라 **우리 핀이 유일한 주인공이 되는 바탕**이다.
 * 그래서 POI·교통·행정경계 라벨을 끄고, 도로는 흰 지면 위 회색 선으로만 남긴다.
 * 색이 하나라도 살아 있으면 왁스 핀이 배경과 경쟁한다.
 *
 * ── ⚠️ 이 값은 런타임에 쓰이지 않는다 ────────────────────────────────
 * AdvancedMarkerElement 는 mapId 를 **요구**하고, mapId 가 있으면 구글은 인라인
 * styles 를 무시한다("A Map's styles property cannot be set when a mapId is
 * present"). DEMO_MAP_ID 폴백도 mapId 라서 로컬에서조차 적용되지 않는다.
 *
 * 그래서 이 파일은 코드가 아니라 **Cloud 콘솔에 올릴 명세**다.
 * 실제 원본은 옆의 `lightbox-map-style.json` 이고, 콘솔의 "Import JSON" 에
 * 그 파일을 그대로 붙여넣으면 된다. TS 배열을 따로 두면 둘이 갈라지므로
 * 여기서는 JSON 을 읽어 타입만 입힌다.
 *
 * 적용 절차 (Google Cloud Console)
 *   1. Google Maps Platform → Map Styles → Create Map Style
 *   2. "Import JSON" 에 lightbox-map-style.json 내용을 붙여넣기
 *   3. 저장 → Map Management → 새 Map ID 생성(JavaScript) → 위 스타일 연결
 *   4. 그 Map ID 를 NEXT_PUBLIC_GOOGLE_MAPS_ID 로 주입
 * 이걸 하기 전까지 지도는 구글 기본 스타일 + POI 아이콘으로 나온다.
 */
export const LIGHTBOX_MAP_STYLE = styleJson as google.maps.MapTypeStyle[];
