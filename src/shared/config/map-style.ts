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
 * ⚠️ mapId 가 설정되면 구글은 이 인라인 styles 를 **무시하고** Cloud 콘솔의
 *    맵 스타일을 쓴다. 그런데 AdvancedMarkerElement 는 mapId 를 요구한다.
 *    따라서 배포에서 이 월드를 보려면 아래 값과 같은 스타일을 Cloud 콘솔에
 *    업로드하고 그 Map ID 를 NEXT_PUBLIC_GOOGLE_MAPS_ID 로 주입해야 한다.
 *    (미설정 시 DEMO_MAP_ID 폴백 → 로컬에서만 이 인라인 스타일이 적용된다)
 */
export const LIGHTBOX_MAP_STYLE: google.maps.MapTypeStyle[] = [
  // 라벨은 지명만 남기고 전부 끈다 — 핀 번호가 유일한 숫자여야 한다
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },

  // 지면 — 라이트박스의 흰 면
  { elementType: "geometry", stylers: [{ color: "#f6f5f1" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f6f5f1" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#efeee9" }] },

  // 물 — 지면보다 한 단만 어둡게. 파랑을 쓰면 왁스 핀과 색이 싸운다
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dedcd5" }] },
  { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] },

  // 도로 — 흰 선 + 회색 윤곽. 위계는 굵기로만 준다
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e2e0d9" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d5d2c9" }] },

  // 지명 — 아주 조용하게. 지면 대비는 유지하되 핀보다 앞서지 않는다
  { elementType: "labels.text.fill", stylers: [{ color: "#6d6a63" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f6f5f1" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];
