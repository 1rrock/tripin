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

export interface MapChoiceInput extends MapLinkInput {
  /** 검색 폴백에 쓸 이름 */
  name: string;
  /** 현지 표기 — 있으면 이쪽을 질의로 쓴다. 지도가 아는 진짜 상호에 가깝다. */
  nameLocal: string | null;
}

/**
 * 상세 드로어용 — **구글과 네이버는 항상 고를 수 있게** 만든다.
 *
 * `mapLinks` 는 저장된 ID 로 만들 수 있는 딥링크만 준다. 그래서 일본 장소처럼
 * google_place_id 하나만 있는 곳은 유저가 네이버 지도를 고를 방법이 없었다.
 * 한국 유저는 해외에서도 네이버 지도를 쓴다(한글 리뷰·길찾기) — 그래서 ID 가
 * 없는 쪽은 이름 검색 링크로 채운다. 검색은 404 가 안 나므로 깨진 링크가 없다.
 *
 * 카카오맵은 ID 가 있을 때만 남긴다 — 해외 POI 가 거의 없어서 검색으로 채우면
 * 빈 결과 화면만 열린다.
 */
export function mapChoices(place: MapChoiceInput): MapLink[] {
  /* 좌표 폴백(`mapLinks` 마지막 줄)은 여기서 안 쓴다 — 그건 이름을 버리고 핀만 찍는
     링크라, 이름 검색보다 늘 못하다. 그래서 ID 가 있을 때만 딥링크를 집는다. */
  const hasId = {
    google: Boolean(place.googleMapsUrl || place.googlePlaceId),
    kakao: Boolean(place.kakaoPlaceId),
    naver: Boolean(place.naverPlaceId),
  };
  const byId = mapLinks(place);
  const deep = (app: MapLink["app"]) =>
    hasId[app] ? (byId.find((link) => link.app === app) ?? null) : null;

  const query = (place.nameLocal ?? place.name).trim();
  const hasCoords = place.lat !== null && place.lng !== null;
  // `/@위도,경도,16z` — 구글 지도가 검색 결과를 그 근처로 좁히게 하는 고전 URL 문법
  const googleNear = hasCoords ? `/@${place.lat},${place.lng},16z` : "";
  // 네이버는 `c=경도,위도,줌,0,0,0,dh` 로 지도 중심을 잡는다 (경도가 먼저다)
  const naverNear = hasCoords ? `?c=${place.lng},${place.lat},15,0,0,0,dh` : "";

  const searchOr = (app: "google" | "naver", label: string, deepLink: MapLink | null): MapLink | null => {
    if (deepLink) return deepLink;
    if (query) {
      return {
        app,
        label,
        url:
          app === "google"
            ? `https://www.google.com/maps/search/${encodeURIComponent(query)}${googleNear}`
            : `https://map.naver.com/p/search/${encodeURIComponent(query)}${naverNear}`,
      };
    }
    // 이름조차 없으면 좌표 핀이라도 — 구글만 가능하다
    if (app === "google" && hasCoords) {
      return {
        app,
        label,
        url: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`,
      };
    }
    return null;
  };

  const google = searchOr("google", "구글 지도", deep("google"));
  const naver = searchOr("naver", "네이버 지도", deep("naver"));

  const isKorea = place.countryCode?.toUpperCase() === "KR";
  const ordered = isKorea ? [naver, deep("kakao"), google] : [google, deep("kakao"), naver];
  return ordered.filter((link): link is MapLink => link !== null);
}
