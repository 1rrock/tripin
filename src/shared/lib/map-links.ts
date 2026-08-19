/**
 * 지도 앱 딥링크 — 장소가 가진 ID 에 따라 열 수 있는 앱을 전부 돌려준다.
 *
 *   구글  google_place_id  →  https://www.google.com/maps/place/?q=place_id:{id}
 *   카카오 kakao_place_id   →  https://place.map.kakao.com/{id}
 *   네이버 naver_place_id   →  https://map.naver.com/p/entry/place/{id}
 *   폴백  좌표만 있을 때     →  구글 좌표 검색
 *
 * 유저 화면은 첫 번째(primary) 하나만, 어드민은 전부 보여준다.
 *
 * 순서는 나라에 따라 다르다 — 한국은 구글 지도로 도보·차량 길찾기가 막혀 있어
 * 사실상 못 쓴다. 한국(KR) 장소는 네이버 → 카카오 → 구글, 그 외는 구글 → 카카오 → 네이버.
 */

export interface MapLinkInput {
  /** 공유 링크(maps.app.goo.gl/…) — 가게 페이지로 바로 열린다. place_id 보다 우선. */
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  kakaoPlaceId: string | null;
  naverPlaceId: string | null;
  lat: number | null;
  lng: number | null;
  /** 나라 코드(ISO 3166-1 alpha-2) — "KR" 이면 네이버를 먼저 보여준다. */
  countryCode: string | null;
}

export interface MapLink {
  /** 'google' | 'kakao' | 'naver' — 버튼 스타일 구분용 */
  app: "google" | "kakao" | "naver";
  label: string;
  url: string;
}

export function mapLinks(place: MapLinkInput): MapLink[] {
  let google: MapLink | null = null;
  if (place.googleMapsUrl) {
    // 공유 링크는 가게 페이지(리뷰·사진·영업시간)로 바로 열린다 — 좌표 검색보다 항상 낫다
    google = { app: "google", label: "구글 지도", url: place.googleMapsUrl };
  } else if (place.googlePlaceId) {
    google = {
      app: "google",
      label: "구글 지도",
      url: `https://www.google.com/maps/place/?q=place_id:${place.googlePlaceId}`,
    };
  }

  const kakao: MapLink | null = place.kakaoPlaceId
    ? {
        app: "kakao",
        label: "카카오맵",
        url: `https://place.map.kakao.com/${place.kakaoPlaceId}`,
      }
    : null;

  const naver: MapLink | null = place.naverPlaceId
    ? {
        app: "naver",
        label: "네이버 지도",
        url: `https://map.naver.com/p/entry/place/${place.naverPlaceId}`,
      }
    : null;

  // 한국은 구글 지도 길찾기가 막혀 있어 네이버(없으면 카카오)를 먼저 보여준다
  const isKorea = place.countryCode?.toUpperCase() === "KR";
  const ordered = isKorea ? [naver, kakao, google] : [google, kakao, naver];
  const links = ordered.filter((link): link is MapLink => link !== null);

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
