/** 한국어 UI 문자열 — 공개 화면 크롬·라벨. 콘텐츠(요약)는 DB. */
export const ko = {
  brand: "Tripin",
  brandAria: "Tripin 홈",
  nav: {
    region: "지역",
    regionHint: "도시별로 — 여러 채널이 간 곳을 한 지도에",
    channel: "채널",
    channelHint: "유튜버별로 — 그 사람이 간 곳만",
    type: "종류",
    typeHint: "맛집·카페·숙소·명소 — 유형부터 고르기",
    menu: "메뉴",
    openMenu: "메뉴 열기",
    closeMenu: "메뉴 닫기",
    notice: "고지",
  },
  home: {
    title: "유튜브에서 본",
    titleLine2: "그 가게, 지도로.",
    stats: "간 곳 {places} · 도시 {cities} · 검수한 영상 {videos}",
    searchAria: "가게 이름·영상·도시·채널 검색",
    searchPlaceholder: "가게 이름으로 찾기",
    allCities: "전체 도시",
    allChannels: "전체 채널",
    recentVideos: "최근 영상",
    foundVideos: "찾은 영상 {n}",
    recentPaged: "최근 영상 · {shown} / {total}",
    empty: "찾는 곳이 아직 시트에 없어요.",
    showAll: "전체 보기",
    loadMore: "더 보기",
    channels: "채널 {n}",
    placesUnit: "{n}곳",
    comingTitle: "곧 열립니다",
    comingBody: "첫 지도를 준비하고 있습니다. 확정된 장소가 쌓이는 대로 채널이 열립니다.",
    openChannel: "{name} 채널 열기",
  },
  cityIndex: {
    title: "어디 가세요?",
    stats: "도시 {cities} · 간 곳 {places}",
    blurb: "도시를 고르면 그 도시에 간 채널들의 장소가 한 지도에 모입니다.",
    empty: "아직 공개된 도시가 없어요.",
    openMap: "{name} 지도 열기 — 간 곳 {places}곳, 채널 {creators}",
    placesChannels: "{places}곳 · 채널 {creators}",
  },
  cityDetail: {
    home: "홈",
    region: "지역",
    creatorsTitle: "{city}에 간 유튜버들",
    stats: "채널 {creators} · 간 곳 {places}",
    allTypes: "전체",
    allChannels: "전체 채널",
    placesAll: "간 곳 {n}",
    placesFiltered: "{shown} / {total}곳",
    pinHint: " · 핀을 누르면 상세가 열립니다",
    onlyThisChannel: "이 채널 지도만 보기",
    noMatch: "조건에 맞는 장소가 없어요.",
    clearFilters: "필터 지우기",
    channelsInCity: "{city}에 간 채널",
    otherCities: "다른 도시 보기",
    openMap: "지도 열기",
  },
  channels: {
    title: "채널",
    stats: "채널 {creators} · 간 곳 {places} · 도시 {cities}",
    empty: "아직 공개된 채널이 없어요.",
    openChannel: "{name} 채널 열기 — 간 곳 {places}곳",
    placesUnit: "{n}곳",
  },
  typeIndex: {
    title: "뭐 볼래요?",
    stats: "종류 {types} · 간 곳 {places}",
    blurb: "맛집·카페·숙소·명소 같은 종류를 고르면, 그 유형의 장소가 도시별로 모입니다.",
    empty: "아직 공개된 장소가 없어요.",
    openType: "{label} — {places}곳, 도시 {cities}",
    citiesChannels: "도시 {cities} · 채널 {creators}",
    placesUnit: "{n}곳",
  },
  typeDetail: {
    home: "홈",
    type: "종류",
    stats: "{places}곳 · 도시 {cities}",
    blurb: "도시를 누르면 그 도시 지도에서 {label}만 볼 수 있습니다.",
    placesUnit: "{n}곳",
    viewOnMap: "지도에서 보기",
    openMap: "지도 열기",
    channelMap: "채널 지도",
    otherTypes: "다른 종류 보기",
  },
  placeTypes: {
    restaurant: "맛집",
    cafe: "카페",
    attraction: "명소",
    hotel: "숙소",
    bar: "바",
    shop: "상점",
    viewpoint: "뷰포인트",
    other: "기타",
    unknown: "미분류",
  },
  common: {
    openMap: "지도 열기",
    watchVideo: "영상 보기",
    home: "홈",
    language: "Language",
    ko: "한국어",
    en: "English",
  },
  notice: {
    title: "고지",
    p1: "Tripin은 공개된 영상 정보를 정리한 비공식 디렉터리입니다. 각 크리에이터·채널과 제휴 관계가 없으며, 모든 장소 정보에는 출처 영상이 표기됩니다. 가격·영업 정보는 영상 촬영 시점 기준으로 실제와 다를 수 있습니다.",
    p1Strong: "비공식",
    p2: "영상 썸네일과 제목은 YouTube 원본을 변형 없이 표시하며, 저작권은 각 채널에 있습니다.",
    p3: "삭제·수정 요청은 접수 즉시 우선 비공개 후 검토합니다. (요청 창구 준비 중)",
  },
  meta: {
    homeTitle: "여행 유튜버가 간 곳 지도",
    homeDescription:
      "채널을 고르면 그 여행 유튜버가 다녀간 맛집·명소가 지도에 뜹니다. 모든 장소에 출처 영상 링크가 있습니다.",
  },
};

/** 리프 문자열은 string — en 카탈로그가 literal 타입에 묶이지 않게. */
export type Messages = {
  brand: string;
  brandAria: string;
  nav: {
    region: string;
    regionHint: string;
    channel: string;
    channelHint: string;
    type: string;
    typeHint: string;
    menu: string;
    openMenu: string;
    closeMenu: string;
    notice: string;
  };
  home: {
    title: string;
    titleLine2: string;
    stats: string;
    searchAria: string;
    searchPlaceholder: string;
    allCities: string;
    allChannels: string;
    recentVideos: string;
    foundVideos: string;
    recentPaged: string;
    empty: string;
    showAll: string;
    loadMore: string;
    channels: string;
    placesUnit: string;
    comingTitle: string;
    comingBody: string;
    openChannel: string;
  };
  cityIndex: {
    title: string;
    stats: string;
    blurb: string;
    empty: string;
    openMap: string;
    placesChannels: string;
  };
  cityDetail: {
    home: string;
    region: string;
    creatorsTitle: string;
    stats: string;
    allTypes: string;
    allChannels: string;
    placesAll: string;
    placesFiltered: string;
    pinHint: string;
    onlyThisChannel: string;
    noMatch: string;
    clearFilters: string;
    channelsInCity: string;
    otherCities: string;
    openMap: string;
  };
  channels: {
    title: string;
    stats: string;
    empty: string;
    openChannel: string;
    placesUnit: string;
  };
  typeIndex: {
    title: string;
    stats: string;
    blurb: string;
    empty: string;
    openType: string;
    citiesChannels: string;
    placesUnit: string;
  };
  typeDetail: {
    home: string;
    type: string;
    stats: string;
    blurb: string;
    placesUnit: string;
    viewOnMap: string;
    openMap: string;
    channelMap: string;
    otherTypes: string;
  };
  placeTypes: {
    restaurant: string;
    cafe: string;
    attraction: string;
    hotel: string;
    bar: string;
    shop: string;
    viewpoint: string;
    other: string;
    unknown: string;
  };
  common: {
    openMap: string;
    watchVideo: string;
    home: string;
    language: string;
    ko: string;
    en: string;
  };
  notice: {
    title: string;
    p1: string;
    p1Strong: string;
    p2: string;
    p3: string;
  };
  meta: {
    homeTitle: string;
    homeDescription: string;
  };
};
