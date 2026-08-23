/** 한국어 UI 문자열 — 공개 화면 크롬·라벨. 콘텐츠(요약)는 DB. */
export const ko = {
  brand: "Eatripin",
  brandAria: "Eatripin 홈",
  nav: {
    region: "지역",
    channel: "채널",
    type: "카테고리",
    map: "지도",
    menu: "메뉴",
    /** 모바일 하단 탭바 */
    tabsAria: "주요 화면",
    notice: "고지",
  },
  home: {
    title: "여행 유튜브에 나온 맛집",
    /** 헤드라인에서 산호로 찍는 구절 — 핀과 같은 역할 */
    titleHot: "맛집",
    titleLine2: "",
    /** 히어로 부제 — 처음 온 사람에게 핵심 고리(영상 → 상호 → 지도)를 한 문장으로 */
    blurb: "여행 유튜브에서 본 그 가게, 확인된 상호명으로 찾아 지도 앱으로 바로 가세요.",
    /** 지면 카드 검색 알약 */
    fieldSearch: "채널·도시·가게 이름으로",
    fieldSearchMob: "채널·도시·가게",
    stats: "{places}곳 · 도시 {cities} · 채널 {creators}",
    searchAria: "가게 이름·영상·도시·채널 검색",
    searchPlaceholder: "가게·음식·도시로 찾기",
    allCities: "전체 도시",
    allChannels: "전체 채널",
    /** 홈 필터 줄 — 종류·지역·채널이 한 줄에 섞여 있어 "전체"가 셋 다 푼다 */
    allFilters: "전체",
    filterAria: "피드 필터 — 종류·지역·채널",
    citiesAria: "도시로 지도 열기",
    allRegions: "모든 지역",
    morePlaces: "+{n}곳",
    /** 채널 행의 도시 꼬리 — 13개를 다 늘어놓으면 375에서 3개만 보이고 잘린다 */
    moreCities: "외 {n}",
    goWhere: "어디로 가세요?",
    goWhereHint: "도시·가게·채널",
    whatToSee: "뭐 볼래요?",
    whatToSeeHint: "맛집·카페·숙소",
    searchGo: "검색",
    popular: "지금 많이 찾는 곳",
    categoryMore: "더보기",
    tabRecommend: "추천",
    tabRecent: "최근",
    /** 연예인 스팟 레일 — 인물(성시경·백종원…)이 다녀간 장소 카드 */
    celebHeading: "연예인이 간 장소",
    /** 조각(채널×도시) 레일 — 홈에서 지도로 들어가는 주 입구 */
    piecesHeading: "채널이 간 도시",
    feedRecent: "최근 영상",
    feedChannels: "채널",
    feedTabsAria: "홈 목록",
    moreFeed: "더 보기",
    recentVideos: "최근 영상",
    foundVideos: "찾은 영상 {n}",
    recentPaged: "최근 영상 · {shown} / {total}",
    empty: "찾는 곳이 아직 없어요.",
    showAll: "전체 보기",
    loadMore: "더 보기",
    channels: "채널 {n}",
    placesUnit: "{n}곳",
    comingTitle: "곧 열립니다",
    comingBody: "첫 지도를 준비하고 있습니다. 확정된 장소가 쌓이는 대로 채널이 열립니다.",
    openChannel: "{name} 채널 열기",
    /** 화면에 안 보이는 h1 — 홈 타이틀은 훅이 아니라 설명형이어야 한다. */
    srHeading: "여행 유튜버가 간 곳 지도",
    regionFilter: "지역",
    regionAll: "전체 지역",
    /** 2depth 목록 맨 위 — 이 권역을 통째로 고른다 */
    regionWhole: "{name} 전체",
    regionPick: "지역 고르기",
    filterFind: "검색",
    typeAll: "전체 종류",
    channelPick: "채널 고르기",
    typePick: "종류 고르기",
    homeRegions: {
      europe: "유럽",
      asia: "아시아",
      korea: "국내",
      japan: "일본",
      china: "중국",
      americas: "미주",
      oceania: "오세아니아",
      other: "그 외",
    },
  },
  cityIndex: {
    title: "어디 가세요?",
    /** 화면에 안 보이는 h1 — 스크린리더·검색엔진만 읽는다. 훅이 아니라 설명이어야 한다. */
    srHeading: "지역별 여행 유튜버 장소 지도",
    stats: "도시 {cities} · {places}곳",
    blurb:
      "많이 간 도시를 먼저 보고, 나머지는 아래에서 찾습니다. 도시를 고르면 그 도시에 간 채널들의 장소가 한 지도에 모입니다.",
    empty: "아직 공개된 도시가 없어요.",
    openMap: "{name} 지도 열기 — {places}곳, 채널 {creators}",
    placesChannels: "{places}곳 · 채널 {creators}",
    rowMeta: "{places}곳 · 채널 {creators} · 영상 {videos}",
    minorHeading: "다른 도시",
    minorMeta: "{places}곳 · 영상 {videos}",
    popularHeading: "많이 간 도시",
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
    stats: "채널 {creators} · {places}곳",
    allTypes: "전체",
    allChannels: "전체 채널",
    placesAll: "{n}곳",
    placesFiltered: "{shown} / {total}곳",
    pinHint: " · 핀을 누르면 상세가 열립니다",
    onlyThisChannel: "이 채널 지도만 보기",
    noMatch: "조건에 맞는 장소가 없어요.",
    clearFilters: "필터 지우기",
    channelsInCity: "{city}에 간 채널",
    otherCities: "다른 도시 보기",
    openMap: "지도 열기",
  },
  placeDetail: {
    /* 이 화면이 받는 질의는 상호명 하나다(PRODUCT.md 원칙 2). h1 은 이름만 세우고
       도시·종류는 그 아래 줄로 내린다 — 제목에 "{도시} 맛집"을 겹쳐 쓰면 도시
       페이지와 같은 말로 싸우고, 둘 다 밀린다. */
    breadcrumbAria: "현재 위치",
    typeInCity: "{city}의 {type}",
    address: "주소",
    openMapHeading: "지도 앱으로 열기",
    sourcesHeading: "이 가게가 나온 영상",
    /** 연예인 역링크 칩 — 조사(이/가) 문제를 피해 이름 뒤에 조사를 안 붙인다 */
    celebMore: "{person} 간 곳 전부 보기",
    nearbyHeading: "{city}의 다른 곳",
    nearbyMore: "{city} 전체 지도 보기",
    notFound: "찾을 수 없는 장소",
  },
  celebs: {
    /** `<title>`·메타 전용 — 화면 헤드라인은 heading 이다 */
    title: "연예인이 간 장소",
    heading: "그 사람이 간 곳, 전부",
    /** 화면에 안 보이는 h1 — 설명형. */
    srHeading: "연예인이 다녀간 맛집·명소 전체 목록",
    /** {people}=인물 수, {n}=장소 수 */
    intro: "{people}명이 다녀간 {n}곳 — 전부 영상으로 확인했다",
    empty: "아직 공개된 장소가 없어요.",
  },
  channels: {
    /** `<title>`·메타 전용 — 화면 헤드라인은 heading 이다 */
    title: "채널",
    heading: "누구 따라갈까요?",
    /** 화면에 안 보이는 h1 — 설명형. */
    srHeading: "등록된 여행 유튜버 채널",
    empty: "아직 공개된 채널이 없어요.",
    openChannel: "{name} 채널 열기 — {places}곳",
    placesUnit: "{n}곳",
    rollMeta: "영상 {videos} · {places}곳",
    applyCta: "내 채널도 등록하고 싶다면",
  },
  typeIndex: {
    title: "뭐 볼래요?",
    /** 화면에 안 보이는 h1 — 설명형. `title` 은 훅이라 그대로 쓰면 안 된다. */
    srHeading: "종류별 여행 유튜버 장소 — 맛집·카페·숙소·명소",
    stats: "종류 {types} · {places}곳",
    blurb: "맛집·카페·숙소·명소 같은 종류를 고르면, 그 유형의 장소가 도시별로 모입니다.",
    empty: "아직 공개된 장소가 없어요.",
    openType: "{label} — {places}곳, 도시 {cities}",
    citiesChannels: "도시 {cities} · 채널 {creators}",
    placesUnit: "{n}곳",
  },
  typeDetail: {
    home: "홈",
    type: "카테고리",
    stats: "{places}곳 · 도시 {cities}",
    blurb: "도시를 누르면 그 도시 지도에서 {label}만 볼 수 있습니다.",
    placesUnit: "{n}곳",
    openMap: "지도 열기",
    channelMap: "채널 지도",
    viewOnMap: "지도에서 보기",
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
    fishing: "낚시",
    other: "기타",
    unknown: "미분류",
  },
  search: {
    open: "검색",
    close: "검색 닫기",
    /** 헤더 버튼 안 문구 — 좁으면 숨는다. 짧게 */
    trigger: "채널·영상·지역 찾기",
    placeholder: "채널 · 영상 · 지역 · 종류 · 장소",
    hint: "채널·영상·지역·종류·장소를 한 번에 찾습니다. 초성도 됩니다 — ㄷㅋ 로 도쿄, ㅅㅍㄹ 로 삿포로.",
    empty: "“{q}” 에 맞는 것이 없어요.",
    /** 빈 결과 아래 한 줄 — 짧은 단어나 다른 언어 표기를 권한다 */
    emptyHint: "더 짧은 단어로 써보거나, 한글·영문 표기를 바꿔보세요.",
    /** 위 힌트로도 못 찾았을 사람이 막히지 않게 지도로 보내는 출구 */
    emptyCta: "지도에서 직접 찾아보기",
    /** 질의에 가장 잘 맞는 하나 — 대개 지도나 채널이다 */
    top: "대표 결과",
    more: "{n}개 더 보기",
    kinds: {
      city: "지역",
      channel: "채널",
      type: "카테고리",
      place: "장소",
      video: "영상",
    },
  },
  common: {
    openMap: "지도 열기",
    /** 외부 링크의 보조기기 안내 — 새 탭 전환을 미리 알린다(WCAG G200) */
    opensNewTab: "새 탭에서 열림",
    watchVideo: "영상 보기",
    watchAt: "영상 {ts}",
    /* 상세 드로어의 두 갈래 — 유튜브로 바로 나갈지, 타임라인이 있는 우리 영상 화면으로 갈지.
       예전엔 영상 화면 링크 하나뿐이라 "그냥 보고 싶다"가 두 번 눌러야 하는 일이 됐다. */
    watchOnYoutube: "유튜브 보기",
    watchOnYoutubeAt: "유튜브 {ts}부터",
    videoDetail: "영상 상세보기",
    home: "홈",
    about: "소개",
    policy: "콘텐츠 정책",
    takedown: "삭제 요청",
    privacy: "개인정보처리방침",
    loading: "불러오는 중",
    /* 공유 — 모바일은 시스템 시트, 데스크톱은 클립보드 복사(ShareButton) */
    shareAria: "{name} 링크 공유",
    linkCopied: "링크를 복사했어요",
    apply: "채널 등록",
  },
  saved: {
    /* 하트·체크·구독. 로그인 문구는 저장 목록 화면에서만 쓴다 —
       홈·지도·상세에는 로그인 권유가 뜨지 않는다. */
    nav: "저장",
    title: "저장한 곳",
    addAria: "{name} 저장하기",
    subscribe: "구독",
    subscribed: "구독중",
    subscribeAria: "{name} 채널 구독",
    unsubscribeAria: "{name} 채널 구독 해제",
    empty: "아직 저장한 곳이 없어요.",
    emptyHint: "지도나 채널에서 하트를 누르면 여기 모입니다.",
    emptyCta: "지도 열기",
    /* 기기 넘김 안내 — 가치를 이미 받은 사람에게만 보인다 */
    localOnly: "이 기기에서만 볼 수 있어요",
    localOnlyHint: "로그인하면 다른 기기에서도 이어서 볼 수 있어요.",
    connect: "로그인",
    connecting: "로그인하는 중",
    connectFailed: "로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    connected: "로그인됨",

    /* 그룹 — "도쿄 3박4일" 처럼 묶는다. 한 장소가 여러 그룹에 들어간다. */
    lists: "그룹",
    listAdd: "그룹에 담기",
    listAddAria: "{name} 를 그룹에 담기",
    listPickHint: "여러 그룹에 넣을 수 있어요. 다시 누르면 빠져요.",
    listSheetTitle: "어느 그룹에 담을까요",
    listNew: "새 리스트 만들기",
    listNamePlaceholder: "예: 도쿄 3박4일",
    listCreate: "만들기",
    listCancel: "취소",
    listRename: "이름 바꾸기",
    listMenuAria: "{name} 그룹 메뉴",
    listDelete: "그룹 삭제",
    listDeleteConfirm: "‘{name}’ 그룹을 지울까요? 담긴 장소는 저장 목록에 그대로 남아요.",
    listDuplicate: "같은 이름의 그룹이 이미 있어요.",
    listFailed: "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    listEmpty: "아직 그룹이 없어요.",
    listEmptyHint: "여행별로 묶어두면 갈 때 꺼내 보기 좋아요.",
    listCount: "{n}곳",
    /* 데스크톱 제목 아래 한 줄 — 화면 전체의 규모를 한 번에 말한다 */
    listSummary: "{p}곳 · 그룹 {l}개",
    listDone: "완료",
    /* 저장이 0개일 때 — 새 기기로 옮겨온 사람이 로그인을 찾을 수 있는 유일한 줄 */
    restore: "다른 기기에서 저장하셨나요?",
    restoreCta: "로그인해서 가져오기",
  },
  account: {
    /* 마이페이지. 게이트가 아니라 **설정함**이다 — 여기 안 와도 전부 된다.
       로그인 권유는 /saved 배너와 /login 이 맡고, 이 화면은 이미 만든 계정을
       관리하는 자리다(로그아웃·탈퇴는 여기 말고 있을 데가 없다). */
    nav: "마이",
    title: "마이페이지",
    anon: "이 기기에서만 쓰는 중",
    anonHint: "로그인하면 다른 기기에서도 이어서 볼 수 있어요.",
    connect: "로그인",
    connecting: "로그인하는 중",
    connectedAs: "로그인됨",
    signOut: "로그아웃",
    signOutHint: "이 기기에서만 나갑니다. 저장한 곳은 지워지지 않아요.",
    signOutConfirm: "로그아웃할까요? 다시 로그인하면 저장한 곳이 그대로 돌아와요.",
    loginPageTitle: "로그인",
    loginTitle: "로그인",
    loginHint: "다른 기기에서도 이어서 보려면 로그인하세요. 하트는 로그인 없이 그대로 됩니다.",
    loggingIn: "로그인하는 중",
    withGoogle: "구글로 로그인",
    withApple: "애플로 로그인",
    withKakao: "카카오로 로그인",
    withNaver: "네이버로 로그인",
    loginSoon: "준비 중",

    savedHeading: "저장",
    savedPlaces: "저장한 곳",
    savedLists: "그룹",
    countPlaces: "{n}곳",
    countLists: "{n}개",
    deviceList: "이 기기의 목록",
    savedLine: "저장한 곳 {n}",
    connectShort: "연결",

    subsHeading: "구독한 채널",
    subsCount: "{n}개 채널",
    subsEmpty: "아직 구독한 채널이 없어요.",
    subsEmptyHint: "채널 화면에서 구독하면 여기 모입니다.",
    subsEmptyCta: "채널 둘러보기",
    unsubscribeAria: "{name} 구독 해제",

    noticeHeading: "약관 · 정책",

    dangerHeading: "계정",
    deleteAccount: "탈퇴하기",
    deleteHint: "저장한 곳·그룹·구독이 모두 지워집니다. 되돌릴 수 없어요.",
    deleteConfirm: "정말 탈퇴할까요? 저장한 곳 {n}곳과 구독이 모두 지워지고 되돌릴 수 없어요.",
    deleting: "지우는 중",
    deleteFailed: "탈퇴하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    /* 확인 판의 물러설 길 — 로그아웃·탈퇴 둘 다 이 하나를 쓴다 */
    cancel: "취소",

    /* 구글에서 돌아온 뒤의 실패. 반환값이 아니라 URL 로 오기 때문에
       이 문구가 없으면 유저는 아무 일도 안 일어난 것처럼 본다. */
    errAlreadyLinked: "이 구글 계정은 이미 다른 계정에 연결되어 있어요. 그 계정으로 다시 로그인해 주세요.",
    errDenied: "이 구글 계정으로는 아직 로그인할 수 없어요. 다른 계정을 쓰거나 잠시 뒤 다시 시도해 주세요.",
    errMissing: "구글에서 돌아오는 길을 놓쳤어요. 다시 로그인해 주세요.",
    errNotLinked: "구글 로그인은 됐는데 이 기기에 붙지는 않았어요. 다시 시도해 주세요.",
    errGeneric: "로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  },
  /* 채널 등록 신청(/apply). 이 화면만 사전을 우회해 페이지 안에 KO/EN 인라인
     사전과 삼항을 들고 있었다 — 카피 한 줄 고치려면 두 곳을 봐야 했다.
     문구는 그때 것 그대로 옮겼다(필드별 에러 세 줄만 새로 쪼갰다). */
  apply: {
    title: "채널 등록 신청",
    metaDescription:
      "여행 유튜브 채널의 영상 속 장소를 지도로 정리해 드립니다. 채널 주소만 남기면 검토 후 순차 등록됩니다.",
    intro:
      "여행 영상 속 장소들을 상호명·타임스탬프·지도 링크로 정리해, 도시·장소 검색으로 영상이 계속 발견되게 합니다. 채널 주소만 남겨주시면 영상 설명란을 바탕으로 저희가 직접 정리해 등록합니다.",
    channelLabel: "유튜브 채널 주소",
    channelPlaceholder: "https://www.youtube.com/@channel",
    emailLabel: "회신받을 이메일",
    emailPlaceholder: "you@example.com",
    videosLabel: "대표 영상 링크 (선택, 2~3개)",
    videosPlaceholder: "장소가 나오는 영상이면 검토가 빨라져요",
    noteLabel: "하고 싶은 말 (선택)",
    submit: "신청하기",
    submitting: "보내는 중…",
    doneTitle: "신청을 받았어요.",
    doneBody:
      "검토 후 순차적으로 등록하고 있어요. 등록되거나 어려운 경우 남겨주신 이메일로 알려드릴게요.",
    /* 필드별 에러 — 예전엔 폼 아래 한 줄뿐이라 채널이 틀렸는지 이메일이 틀렸는지 알 수 없었다.
       errorInvalid 는 서버가 400 만 주고 어느 필드인지 말하지 않을 때의 폼 단위 폴백. */
    errChannel: "유튜브 채널 주소를 확인해 주세요.",
    errEmail: "이메일 주소를 확인해 주세요.",
    errorInvalid: "유튜브 채널 주소와 이메일을 확인해 주세요.",
    /* 429 — "실패"가 아니라 "너무 자주"다. 같은 문구로 뭉뚱그리면 다시 눌러 또 막힌다. */
    errorRateLimited: "요청이 너무 잦아요. 잠시 뒤 다시 시도해 주세요.",
    errorFailed: "잠시 후 다시 시도해 주세요.",
    stepsHeading: "등록 절차",
    steps: [
      "접수 — 채널과 영상을 확인합니다. 장소가 나오는 여행 콘텐츠인지가 기준입니다.",
      "정리 — 영상 설명란을 바탕으로 장소를 추출하고, 상호·주소·지도 링크를 하나하나 확인합니다.",
      "등록 — 확인이 끝난 장소만 공개됩니다. 등록되면 이메일로 알려드립니다.",
    ],
    takedownBefore: "등록 후 언제든 ",
    takedownLink: "삭제 요청",
    takedownAfter: "으로 채널 전체를 내릴 수 있습니다.",
  },
  hub: {
    channelNav: "채널",
    stats: "{places}곳 · 도시 {cities} · 검수한 영상 {videos}",
    citiesHeading: "도시 {n} — 지도로 열기",
    cityMapAria: "{name} 지도 열기 — 확정 {places}곳",
    videosHeading: "영상 {n} — 나온 시각으로 열기",
    channelLink: "유튜브 채널 열기",
    noVideoMatch: "조건에 맞는 영상이 없어요.",
    allCities: "전체 지역",
    allTypes: "전체",
    placesAll: "{n}곳",
    placesFiltered: "{shown} / {total}곳",
    /* 이 화면에는 핀이 없다 — 지도를 /map 으로 넘겼다(CreatorExplorer 주석) */
    pinHint: " · 누르면 출처 영상으로",
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
    pendingHeading: "위치 확인 중 {n}",
    otherCitiesHeading: "{creator}의 다른 도시",
    otherCreatorsHeading: "{city}에 간 다른 채널",
    cityWide: "{city} 전체 지도",
    sourceVideoFallback: "출처 영상",
    machineTranslated: "자동 번역",
    showOriginal: "원문 보기",
  },
  video: {
    breadcrumbLabel: "영상",
    stats: "나온 곳 {stops} · 도시 {cities}",
    /** 도시가 하나뿐일 때 — 머리 줄이 그 도시 이름을 이미 말하고 있어서 "도시 1" 은 잡음이다 */
    statsStops: "나온 곳 {n}",
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
    /** 정거장 목록의 머리 — 이 화면의 본문이 어디서 시작하는지 알린다.
        예전의 "시각 미확인 {n}" 점선 상자는 없앴다. 타임코드가 있는 정거장이
        전체의 5.4% 뿐이라, 격리 상자가 사실상 모든 페이지의 본문을 통째로
        "미확인"으로 표시하고 있었다. */
    stopsHeading: "이 영상에 나온 곳 {n}",
    mapAria: "이 영상에 나온 장소 지도",
    mapHint: "목록 번호와 핀 번호가 같아요 · 핀을 누르면 그 정거장으로",
    mapEmpty: "좌표가 있는 장소가 없어 지도를 그리지 못했어요. 목록의 지도 링크로 확인할 수 있어요.",
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
    backToMap: "지도로 돌아가기",
    sheetHandle: "목록 높이 조절",
    openInMapApp: "지도 앱에서 열기",
    /** 출처 영상 묶음의 머리 — 상세 드로어에서 요약과 영상 사이를 가른다 */
    sourcesHeading: "이 곳이 나온 영상",
    /** 채널 줄 두 갈래: 이름을 누르면 채널로 가고, 이 버튼은 지도를 그 채널로 좁힌다 */
    openChannel: "{creator} 채널 보기",
    filterByChannel: "이 채널만",
    /** 지도 앱 이름 — 상세 드로어에서 어느 앱으로 열지 고르게 한다 */
    mapApps: {
      google: "구글 지도",
      naver: "네이버 지도",
      kakao: "카카오맵",
    },
  },
  notice: {
    title: "고지",
    linksAria: "정책 문서",
    /* 한 문단에 사실을 세 개씩 넣지 않는다 — 한 줄에 한 가지만. */
    p1Before: "Eatripin은 공개된 영상을 정리한 ",
    p1Strong: "비공식",
    p1After: " 디렉터리입니다. 어떤 채널과도 제휴하지 않으며, 장소마다 출처 영상을 답니다.",
    p2: "썸네일과 제목은 YouTube 원본 그대로이며, 저작권은 각 채널에 있습니다. 가격·영업 정보는 영상 촬영 시점 기준입니다.",
    p3: "삭제·수정 요청은 접수 즉시 비공개로 내린 뒤 검토합니다.",
    p3LinkLabel: "요청 보내기",
  },
  /* 없는 페이지·에러 화면. 라우트마다 제각각이던 not-found 제목("Not found" 와
     "찾을 수 없는 페이지"가 섞여 있었다)을 여기 하나로 모은다. */
  notFound: {
    title: "찾는 페이지가 없어요",
    body: "주소가 바뀌었거나, 내려간 곳이거나, 아직 없는 곳이에요.",
    toMap: "지도에서 찾아보기",
    toHome: "홈으로",
    metaTitle: "찾을 수 없는 페이지",
  },
  error: {
    title: "화면을 불러오지 못했어요",
    /* 내부 에러 원문(minify 문자열·digest)을 여기 그대로 흘리지 않는다 */
    body: "잠시 뒤 다시 시도해 주세요.",
    retry: "다시 시도",
    toHome: "홈으로",
  },
  meta: {
    homeTitle: "여행 유튜버가 간 곳 지도",
    homeDescription:
      "여행 유튜버가 다녀간 맛집·명소를 채널·도시별로 지도에 모았습니다. 모든 장소에 출처 영상 링크가 있습니다.",
    mapTitle: "지도",
    mapDescription:
      "여행 유튜버가 다녀간 맛집·카페·명소를 지도에서 고릅니다. 지역·종류·채널로 좁힐 수 있습니다.",
  },
};

/** 리프 문자열은 string — en 카탈로그가 literal 타입에 묶이지 않게. */
export type Messages = {
  brand: string;
  brandAria: string;
  nav: {
    region: string;
    channel: string;
    type: string;
    map: string;
    menu: string;
    tabsAria: string;
    notice: string;
  };
  home: {
    title: string;
    titleHot: string;
    titleLine2: string;
    blurb: string;
    fieldSearch: string;
    fieldSearchMob: string;
    stats: string;
    searchAria: string;
    searchPlaceholder: string;
    allCities: string;
    allChannels: string;
    allFilters: string;
    filterAria: string;
    citiesAria: string;
    allRegions: string;
    morePlaces: string;
    moreCities: string;
    goWhere: string;
    goWhereHint: string;
    whatToSee: string;
    whatToSeeHint: string;
    searchGo: string;
    popular: string;
    categoryMore: string;
    tabRecommend: string;
    tabRecent: string;
    celebHeading: string;
    piecesHeading: string;
    feedRecent: string;
    feedChannels: string;
    feedTabsAria: string;
    moreFeed: string;
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
    srHeading: string;
    regionFilter: string;
    regionAll: string;
    regionWhole: string;
    regionPick: string;
    filterFind: string;
    typeAll: string;
    channelPick: string;
    typePick: string;
    homeRegions: {
      europe: string;
      asia: string;
      korea: string;
      japan: string;
      china: string;
      americas: string;
      oceania: string;
      other: string;
    };
  };
  cityIndex: {
    title: string;
    srHeading: string;
    stats: string;
    blurb: string;
    empty: string;
    openMap: string;
    placesChannels: string;
    rowMeta: string;
    minorHeading: string;
    minorMeta: string;
    popularHeading: string;
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
  placeDetail: {
    breadcrumbAria: string;
    typeInCity: string;
    address: string;
    openMapHeading: string;
    sourcesHeading: string;
    celebMore: string;
    nearbyHeading: string;
    nearbyMore: string;
    notFound: string;
  };
  celebs: {
    title: string;
    heading: string;
    srHeading: string;
    intro: string;
    empty: string;
  };
  channels: {
    title: string;
    heading: string;
    srHeading: string;
    empty: string;
    openChannel: string;
    placesUnit: string;
    rollMeta: string;
    applyCta: string;
  };
  typeIndex: {
    title: string;
    srHeading: string;
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
    openMap: string;
    channelMap: string;
    viewOnMap: string;
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
    fishing: string;
    other: string;
    unknown: string;
  };
  search: {
    open: string;
    close: string;
    trigger: string;
    placeholder: string;
    hint: string;
    empty: string;
    emptyHint: string;
    emptyCta: string;
    top: string;
    more: string;
    kinds: {
      city: string;
      channel: string;
      type: string;
      place: string;
      video: string;
    };
  };
  common: {
    openMap: string;
    opensNewTab: string;
    watchVideo: string;
    watchAt: string;
    watchOnYoutube: string;
    watchOnYoutubeAt: string;
    videoDetail: string;
    home: string;
    about: string;
    policy: string;
    takedown: string;
    privacy: string;
    loading: string;
    shareAria: string;
    linkCopied: string;
    apply: string;
  };
  saved: {
    nav: string;
    title: string;
    addAria: string;
    subscribe: string;
    subscribed: string;
    subscribeAria: string;
    unsubscribeAria: string;
    empty: string;
    emptyHint: string;
    emptyCta: string;
    localOnly: string;
    localOnlyHint: string;
    connect: string;
    connecting: string;
    connectFailed: string;
    connected: string;
    lists: string;
    listAdd: string;
    listAddAria: string;
    listPickHint: string;
    listSheetTitle: string;
    listNew: string;
    listNamePlaceholder: string;
    listCreate: string;
    listCancel: string;
    listRename: string;
    listMenuAria: string;
    listDelete: string;
    listDeleteConfirm: string;
    listDuplicate: string;
    listFailed: string;
    listEmpty: string;
    listEmptyHint: string;
    listCount: string;
    listSummary: string;
    listDone: string;
    restore: string;
    restoreCta: string;
  };
  account: {
    nav: string;
    title: string;
    anon: string;
    anonHint: string;
    connect: string;
    connecting: string;
    connectedAs: string;
    signOut: string;
    signOutHint: string;
    signOutConfirm: string;
    loginPageTitle: string;
    loginTitle: string;
    loginHint: string;
    loggingIn: string;
    withGoogle: string;
    withApple: string;
    withKakao: string;
    withNaver: string;
    loginSoon: string;
    savedHeading: string;
    savedPlaces: string;
    savedLists: string;
    countPlaces: string;
    countLists: string;
    deviceList: string;
    savedLine: string;
    connectShort: string;
    subsHeading: string;
    subsCount: string;
    subsEmpty: string;
    subsEmptyHint: string;
    subsEmptyCta: string;
    unsubscribeAria: string;
    noticeHeading: string;
    dangerHeading: string;
    deleteAccount: string;
    deleteHint: string;
    deleteConfirm: string;
    deleting: string;
    deleteFailed: string;
    errAlreadyLinked: string;
    errDenied: string;
    errMissing: string;
    errNotLinked: string;
    errGeneric: string;
    cancel: string;
  };
  apply: {
    title: string;
    metaDescription: string;
    intro: string;
    channelLabel: string;
    channelPlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    videosLabel: string;
    videosPlaceholder: string;
    noteLabel: string;
    submit: string;
    submitting: string;
    doneTitle: string;
    doneBody: string;
    errChannel: string;
    errEmail: string;
    errorInvalid: string;
    errorRateLimited: string;
    errorFailed: string;
    stepsHeading: string;
    /** 세 단계. 번호는 화면이 붙인다 — 문구에 "1." 을 넣지 않는다. */
    steps: string[];
    takedownBefore: string;
    takedownLink: string;
    takedownAfter: string;
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
    pendingHeading: string;
    otherCitiesHeading: string;
    otherCreatorsHeading: string;
    cityWide: string;
    sourceVideoFallback: string;
    machineTranslated: string;
    showOriginal: string;
  };
  video: {
    breadcrumbLabel: string;
    stats: string;
    statsStops: string;
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
    stopsHeading: string;
    mapAria: string;
    mapHint: string;
    mapEmpty: string;
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
    backToMap: string;
    sheetHandle: string;
    openInMapApp: string;
    sourcesHeading: string;
    openChannel: string;
    filterByChannel: string;
    mapApps: {
      google: string;
      naver: string;
      kakao: string;
    };
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
  notFound: {
    title: string;
    body: string;
    toMap: string;
    toHome: string;
    metaTitle: string;
  };
  error: {
    title: string;
    body: string;
    retry: string;
    toHome: string;
  };
  meta: {
    homeTitle: string;
    homeDescription: string;
    mapTitle: string;
    mapDescription: string;
  };
};
