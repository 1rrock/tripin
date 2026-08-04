/**
 * 지도 앱 딥링크 — 장소가 가진 ID 에 따라 열 수 있는 앱을 전부 돌려준다.
 *
 *   구글  google_place_id  →  https://www.google.com/maps/place/?q=place_id:{id}
 *   카카오 kakao_place_id   →  https://place.map.kakao.com/{id}
 *   네이버 naver_place_id   →  https://map.naver.com/p/entry/place/{id}
 *   폴백  좌표만 있을 때     →  구글 좌표 검색
 *
 * 유저 화면은 첫 번째(primary) 하나만, 어드민은 전부 보여준다.
 */

export interface MapLinkInput {
  /** 공유 링크(maps.app.goo.gl/…) — 가게 페이지로 바로 열린다. place_id 보다 우선. */
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  kakaoPlaceId: string | null;
  naverPlaceId: string | null;
  lat: number | null;
  lng: number | null;
}

export interface MapLink {
  /** 'google' | 'kakao' | 'naver' — 버튼 스타일 구분용 */
  app: "google" | "kakao" | "naver";
  label: string;
  url: string;
}

export function mapLinks(place: MapLinkInput): MapLink[] {
  const links: MapLink[] = [];
  if (place.googleMapsUrl) {
    // 공유 링크는 가게 페이지(리뷰·사진·영업시간)로 바로 열린다 — 좌표 검색보다 항상 낫다
    links.push({ app: "google", label: "구글 지도", url: place.googleMapsUrl });
  } else if (place.googlePlaceId) {
    links.push({
      app: "google",
      label: "구글 지도",
      url: `https://www.google.com/maps/place/?q=place_id:${place.googlePlaceId}`,
    });
  }
  if (place.kakaoPlaceId) {
    links.push({
      app: "kakao",
      label: "카카오맵",
      url: `https://place.map.kakao.com/${place.kakaoPlaceId}`,
    });
  }
  if (place.naverPlaceId) {
    links.push({
      app: "naver",
      label: "네이버 지도",
      url: `https://map.naver.com/p/entry/place/${place.naverPlaceId}`,
    });
  }
  // ID 가 하나도 없으면 좌표 검색으로 폴백 — 링크 없는 장소를 만들지 않는다
  if (links.length === 0 && place.lat !== null && place.lng !== null) {
    links.push({
      app: "google",
      label: "지도 열기",
      url: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`,
    });
  }
  return links;
}

export function primaryMapLink(place: MapLinkInput): MapLink | null {
  return mapLinks(place)[0] ?? null;
}
