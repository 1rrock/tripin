/** 한국어 UI 문자열 — 공개 화면 크롬·라벨. 콘텐츠(요약)는 DB. */
export const ko = {
  brand: "Greatripin",
  brandAria: "Greatripin 홈",
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
    blurb: "권역에서 도시를 고르면, 그 도시에 간 채널들의 장소가 한 지도에 모입니다.",
    empty: "아직 공개된 도시가 없어요.",
    openMap: "{name} 지도 열기 — 간 곳 {places}곳, 채널 {creators}",
    placesChannels: "{places}곳 · 채널 {creators}",
    regionStats: "도시 {cities} · {places}곳",
    regions: {
      japan: "일본",
      korea: "한국",
      eastAsia: "동아시아",
      seAsia: "동남아시아",
      europe: "유럽",
      americas: "미주",
      oceania: "오세아니아",
      other: "그 외",
    },
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
    /** `<title>`·메타 전용 — 화면 헤드라인은 heading 이다 */
    title: "채널",
    heading: "누구 따라갈까요?",
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
    moreInCity: "+{n}곳 더 — 지도에서 모두 보기",
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
    watchAt: "영상 {ts}",
    home: "홈",
    language: "Language",
    ko: "한국어",
    en: "English",
    about: "소개",
    policy: "콘텐츠 정책",
    takedown: "삭제 요청",
    privacy: "개인정보처리방침",
  },
  hub: {
    channelNav: "채널",
    stats: "간 곳 {places} · 도시 {cities} · 검수한 영상 {videos}",
    citiesHeading: "도시 {n} — 지도로 열기",
    cityMapAria: "{name} 지도 열기 — 확정 {places}곳",
    videosHeading: "영상 {n} — 나온 시각으로 열기",
    channelLink: "유튜브 채널 열기",
    noVideoMatch: "조건에 맞는 영상이 없어요.",
    allCities: "전체 지역",
    allTypes: "전체",
    placesAll: "간 곳 {n}",
    placesFiltered: "{shown} / {total}곳",
    pinHint: " · 목록은 영상 · 핀은 상세",
    onlyThisCity: "이 도시 지도만 보기",
    noMatch: "조건에 맞는 장소가 없어요.",
    clearFilters: "필터 지우기",
    openMap: "지도 열기",
    openVideoAria: "{name} — 출처 영상 열기",
  },
  piece: {
    title: "{creator}의 {city}",
    statsConfirmed: "확정 {n}",
    statsCandidates: " · 확인 중 {n}",
    statsTypes: " · 유형 {n}",
    filterAll: "전체",
    emptyFiltered: "이 카테고리의 확정 장소가 아직 없어요.",
    emptyAll: "확정된 장소가 아직 없어요.",
    pick: "담기",
    picked: "담음",
    pendingHeading: "위치 확인 중 {n}",
    otherCitiesHeading: "{creator}의 다른 도시",
    otherCreatorsHeading: "{city}에 간 다른 채널",
    myListCount: "내 목록 {n}곳",
    copyLink: "링크 복사",
    copied: "복사됨",
    sourceVideoFallback: "출처 영상",
    machineTranslated: "자동 번역",
    showOriginal: "원문 보기",
  },
  video: {
    breadcrumbLabel: "영상",
    stats: "나온 곳 {stops} · 도시 {cities}",
    thumbnailNotice: "썸네일과 제목은 YouTube 원본 표기 그대로입니다.",
    otherVideos: "{creator}의 다른 영상",
    viewCityMap: "{city} 지도로 보기",
    pendingLocation: " · 위치 확인 중",
    searchAtLocation: "지도에서 검색",
    clipCount: "클립 {n}",
    clipCurrent: "현재 {t}",
    durationKnown: "길이",
    durationEstimated: "길이(추정)",
    clipListAria: "장소 클립 목록",
    scrubHint: "위 클립을 누르거나 바를 드래그하세요. 화살표 키로도 시간을 옮길 수 있습니다.",
    scrubberAria: "{creator} 영상 타임라인 — 좌우 화살표로 이동",
    seekToAria: "{time} {name} 로 이동",
    untimedHeading: "시각 미확인 {n}",
  },
  map: {
    loading: "지도 불러오는 중",
    clusterHint: "이 자리에 장소 {n}곳 — 누르면 펼쳐집니다",
    failedTitle: "지도를 잠시 불러오지 못했어요",
    failedBody: "목록만으로도 모든 장소를 확인할 수 있어요",
    retry: "다시 시도",
    viewAll: "전체 핀 보기",
    detailAria: "{name} 상세",
    closeDetail: "상세 닫기",
    openInMapApp: "지도 앱에서 열기",
  },
  notice: {
    title: "고지",
    linksAria: "정책 문서",
    /* 한 문단에 사실을 세 개씩 넣지 않는다 — 한 줄에 한 가지만. */
    p1Before: "Greatripin은 공개된 영상을 정리한 ",
    p1Strong: "비공식",
    p1After: " 디렉터리입니다. 어떤 채널과도 제휴하지 않으며, 장소마다 출처 영상을 답니다.",
    p2: "썸네일과 제목은 YouTube 원본 그대로이며, 저작권은 각 채널에 있습니다. 가격·영업 정보는 영상 촬영 시점 기준입니다.",
    p3: "삭제·수정 요청은 접수 즉시 비공개로 내린 뒤 검토합니다.",
    p3LinkLabel: "요청 보내기",
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
    regionStats: string;
    regions: {
      japan: string;
      korea: string;
      eastAsia: string;
      seAsia: string;
      europe: string;
      americas: string;
      oceania: string;
      other: string;
    };
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
    heading: string;
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
    moreInCity: string;
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
    watchAt: string;
    home: string;
    language: string;
    ko: string;
    en: string;
    about: string;
    policy: string;
    takedown: string;
    privacy: string;
  };
  hub: {
    channelNav: string;
    stats: string;
    citiesHeading: string;
    cityMapAria: string;
    videosHeading: string;
    channelLink: string;
    noVideoMatch: string;
    allCities: string;
    allTypes: string;
    placesAll: string;
    placesFiltered: string;
    pinHint: string;
    onlyThisCity: string;
    noMatch: string;
    clearFilters: string;
    openMap: string;
    openVideoAria: string;
  };
  piece: {
    title: string;
    statsConfirmed: string;
    statsCandidates: string;
    statsTypes: string;
    filterAll: string;
    emptyFiltered: string;
    emptyAll: string;
    pick: string;
    picked: string;
    pendingHeading: string;
    otherCitiesHeading: string;
    otherCreatorsHeading: string;
    myListCount: string;
    copyLink: string;
    copied: string;
    sourceVideoFallback: string;
    machineTranslated: string;
    showOriginal: string;
  };
  video: {
    breadcrumbLabel: string;
    stats: string;
    thumbnailNotice: string;
    otherVideos: string;
    viewCityMap: string;
    pendingLocation: string;
    searchAtLocation: string;
    clipCount: string;
    clipCurrent: string;
    durationKnown: string;
    durationEstimated: string;
    clipListAria: string;
    scrubHint: string;
    scrubberAria: string;
    seekToAria: string;
    untimedHeading: string;
  };
  map: {
    loading: string;
    clusterHint: string;
    failedTitle: string;
    failedBody: string;
    retry: string;
    viewAll: string;
    detailAria: string;
    closeDetail: string;
    openInMapApp: string;
  };
  notice: {
    title: string;
    linksAria: string;
    p1Before: string;
    p1Strong: string;
    p1After: string;
    p2: string;
    p3: string;
    p3LinkLabel: string;
  };
  meta: {
    homeTitle: string;
    homeDescription: string;
  };
};
