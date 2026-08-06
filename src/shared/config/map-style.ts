/**
 * 공항 사인 시스템 월드의 Google Maps 스타일.
 *
 * 지면은 사인 옐로, 도로는 제트 블랙 — 지도가 월드 밖으로 튀지 않게 한다.
 * POI·환승 라벨은 끈다: 이 화면에서 읽혀야 하는 건 크리에이터가 간 곳뿐이고,
 * 구글의 기본 POI 는 우리 핀과 경쟁한다.
 *
 * ⚠️ mapId 를 쓰면(AdvancedMarker 요구사항) 이 인라인 styles 는 무시되고
 *    Cloud 콘솔의 맵 스타일이 이긴다. 배포 시 같은 값을 Cloud 스타일로 올려야 한다.
 */
export const SIGN_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#ffcc00" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#0d0d0d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffcc00" }, { weight: 3 }] },

  // 도로 — 굵기 위계만으로 읽힌다
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#0d0d0d" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#0d0d0d" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#0d0d0d" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#0d0d0d" }, { lightness: 25 }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "simplified" }] },

  // 지면보다 살짝 진한 노랑 — 색을 늘리지 않고 면만 구분한다
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#f5c400" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#f1bd00" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e8b400" }] },

  // 구글 기본 POI 는 끈다 — 우리 핀과 경쟁한다
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
];
