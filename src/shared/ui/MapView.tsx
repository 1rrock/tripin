"use client";

/**
 * 공통 지도 컴포넌트 — 유저 화면과 어드민이 같이 쓴다 (CONCEPT.md 5장).
 *
 * 렌더러: Google Maps JavaScript API (LEGAL.md 4장 A안 — 2026-08-04 채택).
 * 번호 마커가 리스트의 "핀" 값과 일치하는 것이 핵심 UX 다 (CONCEPT.md 4.3).
 *
 * 월드: 콘택트 시트 · 웜 페이퍼 — 지도는 같은 크림 축의 **라이트박스**.
 * 마커는 각진 인덱스 칩이고, 활성은 왁스 연필로 표시한 컷이다(리스트의 FrameNo 와 같은 문법).
 *
 * 지연 로드: SDK 스크립트는 이 컴포넌트가 마운트될 때 1회만 로드된다.
 * 실패 시 지도 대신 안내 문구를 띄운다 — 리스트만으로도 서비스가 성립해야 한다.
 */

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
/* 값은 동적 import — 클러스터를 안 쓰는 화면(도시 상세 등)이 supercluster 까지
   번들에 지는 것을 막는다(~12KB gzip). 타입만 정적으로 남긴다. */
import type { Cluster, MarkerClusterer } from "@googlemaps/markerclusterer";
import { isProduction, publicEnv } from "@/shared/config/env";
import { useLocale } from "@/shared/i18n/LocaleContext";
import type { Messages } from "@/shared/i18n/messages/ko";
import { t } from "@/shared/i18n/get-dictionary";
// map-style.ts 의 LIGHTBOX_MAP_STYLE 은 여기서 import 하지 않는다 — 런타임에 쓸 수
// 없기 때문이다(아래 Map 생성부 주석 참조). 그 파일은 Cloud 콘솔에 올릴 **명세**다.

/** 타일이 이 시간 안에 안 그려지면 실패로 판정 — 조용한 회색 박스를 만들지 않는다. */
const TILES_TIMEOUT_MS = 8000;

/**
 * 이 줌을 넘으면 더 이상 묶지 않는다. 활성 핀이 묶여 있을 때 이 값보다 한 단계
 * 더 들어가면 반드시 낱개로 풀린다는 보장이 필요해서 상수로 둔다.
 */
const CLUSTER_MAX_ZOOM = 16;
/** 픽셀 반경 — 이 안에 든 핀이 한 덩어리가 된다. 마커 폭(30px)의 두 배 남짓. */
const CLUSTER_RADIUS_PX = 64;
/**
 * 목록·핀 선택 시 최소 줌. 전역 지도처럼 멀리 보고 있을 때 pan 만 하면
 * "어디가 고른 곳인지" 안 보이므로, 이 값까지 들어간다.
 * 클러스터 maxZoom 보다 한 단계 높여 묶임도 같이 푼다.
 */
const FOCUS_MIN_ZOOM = 17;

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 리스트와 일치하는 1-기반 번호. 없으면 점 마커. */
  index?: number;
  /** 번호 대신 글자를 다는 마커 — 전체 지도의 도시 칩("도쿄 8")에 쓴다. */
  label?: string;
  accentColor?: string;
}

interface MapViewProps {
  pins: MapPin[];
  /** 하이라이트할 핀 id — 리스트 선택과 동기화. */
  activeId?: string | null;
  onPinClick?: (id: string) => void;
  /** 핀이 아닌 지도 배경 클릭 — 상세 드로어를 내릴 때 쓴다. */
  onMapClick?: () => void;
  className?: string;
  /** 전면 지도 — 라운드·액자선을 빼 모서리에 빈 칸이 안 남게. */
  flush?: boolean;
  /** 핀 1개일 때 줌 (기본 15 — CONCEPT.md 4.3). */
  singlePinZoom?: number;
  /**
   * 가까운 핀을 묶는다. **개별 장소를 찍는 지도에서만 켠다.**
   * 전체 지도(`/map`)처럼 핀이 이미 도시 단위로 집계된 화면에서는 켜면 안 된다 —
   * 집계를 두 번 하게 되어 "도쿄 8"이 다시 "2"로 접힌다.
   */
  cluster?: boolean;
  /** 가까이 가면 번호 대신 상호. 멀면 점. */
  nameWhenClose?: boolean;
  /**
   * 뷰포트 맞춤 여백 — 지도 위에 뜬 것들(검색 줄·바텀시트)이 먹는 자리.
   *
   * 숫자 하나면 사방 같은 값. **함수로 주면 맞출 때마다 다시 잰다** — 시트 높이는
   * 사용자가 끌면 바뀌므로 렌더 시점에 박아 두면 곧 틀린 값이 된다.
   * 없으면 사방 48px. 이게 없을 때 핀이 시트 밑에 깔려 "위아래가 잘려" 보였다.
   */
  fitPadding?: number | (() => google.maps.Padding);
  /**
   * 첫 화면을 여기로 — 현재 위치처럼 **핀과 무관하게** 정해지는 시작점.
   *
   * 딱 한 번만 듣는다. 이후 필터를 바꾸면 그 결과에 맞추는 게 맞다.
   * null 이면 평소대로 전체 핀에 맞춘다(권한 거부·미지원도 여기로 떨어진다).
   */
  focusAt?: { lat: number; lng: number; zoom?: number } | null;
  /**
   * 마운트 시점에 이미 정해져 있는 `activeId` 로 **화면을 옮길지**.
   *
   * 선택에는 두 종류가 있고 뜻이 다르다. 링크로 들어온 선택(`/map?place=…`)은
   * "그리로 데려가 달라"는 요청이고, 화면이 기본으로 골라 둔 선택(영상 페이지가
   * 1번 정거장을 켜 두는 것)은 그냥 표시다. 뒤엣것까지 따라 들어가면, 정거장
   * 17곳짜리 영상이 열리자마자 1번 가게 골목에 처박힌다.
   *
   * 그래서 첫 한 번만 이 값으로 가른다. 그 뒤의 `activeId` 변화는 전부 사용자가
   * 누른 결과이므로 언제나 따라간다.
   */
  focusActiveOnMount?: boolean;
}

let optionsSet = false;

/** SDK 옵션은 최초 1회만 설정 — importLibrary 는 내부적으로 라이브러리별 캐시된다. */
function loadSdk() {
  if (!optionsSet) {
    setOptions({ key: publicEnv.googleMapsKey, v: "weekly" });
    optionsSet = true;
  }
  return { maps: importLibrary("maps"), marker: importLibrary("marker") };
}

/**
 * 번호 핀 — 각진 인덱스 칩. 리스트의 FrameNo 와 같은 문법이라 눈이 1:1 로 잇는다.
 *
 * 대비: 라이트박스(밝은 지면) 위이므로 기본은 잉크 칩 + 인화지 숫자,
 * 웜 페이퍼 월드: 지도(라이트박스) 위에 핀이 놓이므로 비활성은 **잉크 칩**
 * (--paper 면 + --ground 숫자), 활성은 왁스 칩 + 지면색 숫자.
 * (예전 다크 월드의 ground 칩은 라이트 지면에서 지도에 묻힌다.)
 *
 * 크리에이터 액센트는 여기서 쓰지 않는다. 임의의 hex 가 들어오면 왁스와 같은
 * 층에서 싸우고, 핀이 구글 기본 POI 와 구분되지 않는다.
 */
const NAME_ZOOM = 15;

function markerContent(pin: MapPin, active: boolean, named = false): HTMLElement {
  const el = document.createElement("div");
  if (named) {
    el.style.cssText = [
      `background:${active ? "var(--wax)" : "var(--ground)"}`,
      `color:${active ? "#fff" : "var(--paper)"}`,
      "border-radius:var(--r-round)",
      "max-width:148px",
      "height:26px",
      "padding:0 9px",
      "display:flex",
      "align-items:center",
      "font-family:inherit",
      "font-weight:700",
      "font-size:12px",
      "letter-spacing:-0.02em",
      "line-height:1",
      "white-space:nowrap",
      "overflow:hidden",
      "cursor:pointer",
      "box-shadow:var(--lift-pin)",
    ].join(";");
    /* 이름은 **속의 span** 이 든다. 칩이 flex 라서 글을 바로 넣으면 익명 플렉스
       아이템이 되는데, text-overflow 는 거기까지 닿지 않는다 — 말줄임 없이 글자
       한가운데가 잘려 나갔다(영상 제목이 그대로 이름인 장소에서 특히). 아이템을
       실제 요소로 세우고 min-width:0 을 줘야 줄어들다가 …로 끊긴다. */
    const text = document.createElement("span");
    text.style.cssText = [
      "min-width:0",
      "overflow:hidden",
      "text-overflow:ellipsis",
      "white-space:nowrap",
    ].join(";");
    text.textContent = pin.name;
    el.append(text);
    el.title = pin.name;
    return el;
  }
  el.style.cssText = [
    `background:${active ? "var(--wax)" : "var(--paper)"}`,
    `color:var(--ground)`,
    "border-radius:var(--r-frame)",
    "min-width:30px",
    "height:30px",
    "padding:0 7px",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font-family:inherit",
    "font-weight:700",
    "font-size:14px",
    "line-height:1",
    "font-variant-numeric:tabular-nums",
    "letter-spacing:0.02em",
    "cursor:pointer",
    "box-shadow:var(--lift-pin)",
    active ? "transform:scale(1.2)" : "",
    "transition:transform .12s ease-out",
  ].join(";");
  el.textContent = pin.label ?? (pin.index !== undefined ? String(pin.index) : "•");
  el.title = pin.name;
  return el;
}

function dotContent(pin: MapPin, active: boolean): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = [
    `background:${active ? "var(--wax)" : "var(--paper)"}`,
    "width:12px",
    "height:12px",
    "border-radius:999px",
    "cursor:pointer",
    "box-shadow:var(--lift-pin)",
  ].join(";");
  el.title = pin.name;
  return el;
}

function pinNode(pin: MapPin, active: boolean, mode: "index" | "dot" | "name"): HTMLElement {
  if (mode === "name") return markerContent(pin, active, true);
  if (mode === "dot") return dotContent(pin, active);
  return markerContent(pin, active, false);
}

/**
 * 핀 세트의 지문 — "내용이 같으면 일하지 말자" 의 판정값.
 *
 * 예전엔 1,845개를 템플릿 문자열로 만들어 `join("|")` 했다. 판정 한 번에 74KB
 * 짜리 문자열과 그만큼의 임시 조각을 만들어 버렸는데, 아끼려던 일보다 재는
 * 값이 더 비쌌다. 지금은 아무것도 할당하지 않고 32비트 FNV-1a 로 섞는다.
 *
 * 참조 비교로 바꾸지 않는 이유: 호출부가 매 렌더 **내용이 같은 새 배열**을
 * 정상적으로 만든다(useMemo 키 하나만 흔들려도 그렇다). 참조로 재면 그때마다
 * 마커를 다시 만들고 뷰포트를 되돌린다 — 그게 원래 이 지문이 막던 버그다.
 */
function pinsFingerprint(pins: MapPin[], cluster: boolean, nameWhenClose: boolean): string {
  let h = 0x811c9dc5;
  const mix = (n: number) => {
    h = Math.imul(h ^ n, 0x01000193);
  };
  const mixText = (s: string | undefined) => {
    if (s === undefined) {
      mix(0x7fffffff); // undefined 와 "" 를 가른다
      return;
    }
    for (let i = 0; i < s.length; i += 1) mix(s.charCodeAt(i));
    mix(s.length);
  };
  mix(cluster ? 1 : 2);
  mix(nameWhenClose ? 1 : 2);
  for (const p of pins) {
    mixText(p.id);
    /* 좌표는 소수 6자리(≈11cm)까지만 본다 — 부동소수 끝자리가 흔들려도 같은 핀이다 */
    mix(Math.round(p.lat * 1e6));
    mix(Math.round(p.lng * 1e6));
    mix(p.index ?? -1);
    mixText(p.label);
    mixText(p.name);
  }
  return `${pins.length}:${(h >>> 0).toString(36)}`;
}

/**
 * 묶인 핀 — **겹쳐 쌓인 프레임**. 낱개 마커와 같은 각진 칩인데 뒤에 한 장이
 * 어긋나게 깔려 "여러 컷"임을 형태로 말한다. 색을 바꾸거나 크기를 키워서
 * 구분하지 않는 이유는, 이 월드에서 왁스는 *표시*이고 발광은 금지이기 때문이다.
 *
 * 숫자는 묶인 장소 수다. 리스트의 번호와 다른 값이라 tabular-nums 로만 맞추고
 * 왁스를 쓰지 않는다 — 왁스를 쓰면 "내가 고른 컷"과 같은 층으로 읽힌다.
 */
function clusterContent(count: number, m: Messages): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:relative;cursor:pointer";

  // 뒤에 깔리는 한 장 — 스택의 두께
  const back = document.createElement("div");
  back.style.cssText = [
    "position:absolute",
    "inset:0",
    "transform:translate(3px,3px)",
    "background:var(--paper)",
    "opacity:0.45",
    "border-radius:var(--r-frame)",
  ].join(";");

  const face = document.createElement("div");
  face.style.cssText = [
    "position:relative",
    "background:var(--paper)",
    "color:var(--ground)",
    "border-radius:var(--r-frame)",
    "min-width:34px",
    "height:34px",
    "padding:0 8px",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font-family:inherit",
    "font-weight:700",
    "font-size:14px",
    "line-height:1",
    "font-variant-numeric:tabular-nums",
    "letter-spacing:0.02em",
    "box-shadow:var(--lift-pin)",
  ].join(";");
  face.textContent = String(count);

  wrap.append(back, face);
  wrap.title = t(m.map.clusterHint, { n: count });
  return wrap;
}

export function MapView({
  pins,
  activeId,
  onPinClick,
  onMapClick,
  className,
  flush = false,
  singlePinZoom = 15,
  cluster = false,
  nameWhenClose = false,
  fitPadding = 48,
  focusAt = null,
  focusActiveOnMount = false,
}: MapViewProps) {
  const { messages: m } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  // 핀 배열은 호출부에서 매 렌더 새로 만들어진다 — 내용이 같으면 마커 재생성·뷰포트
  // 리셋을 건너뛰기 위한 시그니처 (리스트 선택이 지도를 되돌리는 버그 방지)
  const pinsSigRef = useRef<string>("");
  /**
   * 뷰포트 페인트 리스너 — **이펙트보다 오래 산다.**
   *
   * 이펙트 지역 변수로 두고 정리에서 떼던 것이 `/map` 의 핀이 사라지던 원인이다.
   * 정리는 "다시 걸린다" 를 보장하지 못한다(아래 sig 일치 갈래는 다시 걸기 전에
   * 빠져나간다). 그래서 소유권을 ref 로 올리고, **다시 그리기로 결정한 그 자리**
   * 와 언마운트·재시도에서만 뗀다.
   */
  const idleRef = useRef<{ listener: google.maps.MapsEventListener; sig: string } | null>(null);
  const namedRef = useRef(false);
  const pinsLiveRef = useRef(pins);
  const onMapClickRef = useRef(onMapClick);
  /**
   * 핀 클릭도 ref 로 받는다 — 마커는 **생성 시점 클로저**로 콜백을 붙드는데,
   * 마커를 다시 만드는 조건은 핀 지문 변화뿐이고 지문에는 선택 상태가 없다.
   * 값을 그대로 닫아 두면 호출부의 최신 콜백(선택 id 를 아는 쪽)이 영영 안 불려,
   * 같은 핀을 두 번 눌러도 닫히지 않고 히스토리만 한 칸씩 쌓였다.
   */
  const onPinClickRef = useRef(onPinClick);
  /* 렌더 중이 아니라 이펙트에서 넣는다(react-hooks/refs). 읽는 곳은 전부 지도
     이벤트 콜백이라 이 이펙트가 먼저 돈 뒤다. 아래 fitPaddingRef 와 같은 계약. */
  useEffect(() => {
    pinsLiveRef.current = pins;
    onMapClickRef.current = onMapClick;
    onPinClickRef.current = onPinClick;
  });
  /* 여백은 맞추는 순간에 읽는다 — 이펙트 의존성에 넣으면 시트를 끌 때마다 뷰포트가 튄다.
     렌더 중이 아니라 이펙트에서 넣는다(react-hooks/refs). 실제로 읽는 곳은 SDK 로드
     뒤의 콜백이라 이 이펙트가 먼저 돈 뒤다. */
  const fitPaddingRef = useRef(fitPadding);
  useEffect(() => {
    fitPaddingRef.current = fitPadding;
  });
  /* 시작점은 한 번만 듣는다 — 위치가 늦게 와도 그때 한 번, 그 뒤로는 사용자 것이다 */
  const focusedRef = useRef(false);
  const fittedOnceRef = useRef(false);
  /* 선택 핀은 마커 생성 콜백에서도 읽는다 — 그 콜백들(뷰포트 페인트)은 activeId 를
     의존성에 안 넣는 이펙트 안에 산다. 값을 그대로 닫아 두면 나중에 그려지는
     마커가 항상 "선택 안 됨" 으로 태어난다. */
  const activeIdRef = useRef<string | null>(activeId ?? null);
  useEffect(() => {
    activeIdRef.current = activeId ?? null;
  });
  // 키 부재는 첫 렌더에 이미 아는 사실 — effect 에서 set 하지 않고 초기값으로 파생
  const [failed, setFailed] = useState(() => !publicEnv.googleMapsKey);
  const [loaded, setLoaded] = useState(false);
  // 재시도 카운터 — 실패 후 "다시 시도"가 지도 생성 effect 를 다시 돌린다
  const [attempt, setAttempt] = useState(0);
  // "전체 핀 보기" — 마지막 핀 세트의 뷰포트 맞춤을 다시 실행한다
  const refitRef = useRef<(() => void) | null>(null);

  /* 지도 생성 (재시도 전까지 1회). 두 프레임 뒤에 시작해 목록·검색이 먼저 페인트된다.
     숨은 탭에서는 rAF 가 아예 안 돌아 "지도 불러오는 중" 에서 멈춘다. 그렇다고
     타이머로 밀어붙이면 더 나쁘다 — 숨은 탭은 타일도 안 그려서 tilesloaded 가
     안 오고, 8초 뒤 "불러오지 못했어요" 가 뜬다. 보일 때까지 기다렸다 시작한다. */
  useEffect(() => {
    if (!publicEnv.googleMapsKey) return;
    const usingDemoMapId = publicEnv.googleMapsId === "DEMO_MAP_ID";
    if (usingDemoMapId && !isProduction) {
      console.warn(
        "[MapView] NEXT_PUBLIC_GOOGLE_MAPS_ID 미설정 — DEMO_MAP_ID 폴백에서는 구글 기본 스타일과 " +
          "POI 아이콘이 그대로 나와 우리 핀이 묻힙니다. map-style.ts 의 LIGHTBOX_MAP_STYLE 을 " +
          "Cloud Console 맵 스타일로 올리고 그 Map ID 를 주입해야 라이트박스가 보입니다.",
      );
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tilesListener: google.maps.MapsEventListener | undefined;
    let clickListener: google.maps.MapsEventListener | undefined;
    let raf = 0;
    let started = false;
    const start = () => {
    if (started) return;
    started = true;
    const { maps } = loadSdk();
    maps
      .then(({ Map }) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = new Map(containerRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          mapId: publicEnv.googleMapsId,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false, // 구글 기본 POI 클릭 방지 — 우리 핀에 집중
          /* ⚠️ 여기에 styles 를 넣지 말 것 — 죽은 코드가 된다.
             AdvancedMarkerElement 는 mapId 를 **요구**하고, mapId 가 있으면 구글은
             인라인 styles 를 무시한다("A Map's styles property cannot be set when a
             mapId is present"). DEMO_MAP_ID 폴백도 mapId 라서 로컬에서조차 적용되지
             않는다 — 예전 코드가 로컬 한정으로 인라인 스타일을 넣고 있었는데 실제로는
             한 번도 먹은 적이 없었다.
             따라서 라이트박스 지면은 map-style.ts 의 LIGHTBOX_MAP_STYLE 을 Cloud 콘솔
             맵 스타일로 업로드하고 그 Map ID 를 주입해야만 나온다. 코드로는 못 푼다. */
        });
        mapRef.current = map;
        // 배경 클릭(핀 아님) — 상세 드로어 접기. 핀 gmp-click 은 버블되지 않는다.
        // 정리에서 반드시 뗀다 — 안 떼면 "다시 시도" 를 누를 때마다 겹쳐 쌓인다.
        clickListener = map.addListener("click", () => {
          onMapClickRef.current?.();
        });
        // 지도 객체 생성 ≠ 지도가 보임 — 타일이 실제로 그려진 시점에만 로딩을 해제한다.
        tilesListener = map.addListener("tilesloaded", () => {
          tilesListener?.remove();
          if (timer) clearTimeout(timer);
          if (!cancelled) setLoaded(true);
        });
        /* 타일이 안 그려지는 이유가 "탭이 숨어서" 일 수 있다 — 앱을 잠깐 나갔다
           오면 실패 화면이 떠 있는 일이 없도록, 숨은 동안은 시계를 다시 감는다. */
        const armTimeout = () => {
          timer = setTimeout(() => {
            if (cancelled) return;
            if (document.visibilityState === "hidden") {
              armTimeout();
              return;
            }
            setFailed(true);
          }, TILES_TIMEOUT_MS);
        };
        armTimeout();
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "hidden") return;
      document.removeEventListener("visibilitychange", onVisible);
      schedule();
    };
    function schedule() {
      if (document.visibilityState === "hidden") {
        document.addEventListener("visibilitychange", onVisible);
        return;
      }
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(start);
      });
    }
    schedule();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) clearTimeout(timer);
      tilesListener?.remove();
      clickListener?.remove();
    };
  }, [attempt]);

  const retry = () => {
    mapRef.current = null;
    clustererRef.current?.setMap(null);
    clustererRef.current = null;
    idleRef.current?.listener.remove();
    idleRef.current = null;
    markersRef.current.clear();
    pinsSigRef.current = "";
    setFailed(false);
    setLoaded(false);
    setAttempt((a) => a + 1);
  };

  // 핀 동기화
  useEffect(() => {
    if (failed) return;
    let cancelled = false;
    const { maps, marker } = loadSdk();
    Promise.all([
      maps,
      marker,
      cluster ? import("@googlemaps/markerclusterer") : Promise.resolve(null),
    ])
      .then(([, { AdvancedMarkerElement }, clusterMod]) => {
        const map = mapRef.current;
        if (cancelled || !map) return;

        // 내용이 같은 배열(호출부의 매 렌더 재생성)이면 아무것도 하지 않는다 —
        // 재생성·fitBounds 를 다시 돌리면 사용자가 옮긴 뷰포트가 튕긴다
        const sig = pinsFingerprint(pins, cluster, nameWhenClose);
        /* 여기서 빠져나갈 때 **뷰포트 리스너는 그대로 살려 둔다.** 정리 함수가
           떼 버리면 이 갈래가 다시 걸어 주지 않아 지도가 그 순간 죽는다
           (하트 토글 → 내용 같은 새 pins → 여기 → 마커가 더는 안 그려짐). */
        if (sig === pinsSigRef.current) return;
        pinsSigRef.current = sig;
        /* 다시 그리기로 결정한 자리 — 낡은 리스너는 여기서만 뗀다. 이 아래로는
           클러스터 갈래면 반드시 새로 걸고, 아니면 리스너 자체가 필요 없다. */
        idleRef.current?.listener.remove();
        idleRef.current = null;

        // 뷰포트: 전체 bounds + 패딩 / 핀 1개면 고정 줌 (CONCEPT.md 4.3)
        const fitAll = () => {
          if (pins.length === 1) {
            map.setCenter({ lat: pins[0]!.lat, lng: pins[0]!.lng });
            map.setZoom(singlePinZoom);
          } else if (pins.length > 1) {
            const bounds = new google.maps.LatLngBounds();
            for (const pin of pins) bounds.extend({ lat: pin.lat, lng: pin.lng });
            const pad = fitPaddingRef.current;
            map.fitBounds(bounds, typeof pad === "function" ? pad() : pad);
          }
        };
        /**
         * 첫 화면을 누가 정하는가. 셋 중 하나다.
         *
         *   · 시작점(현재 위치)이 첫 핀보다 먼저 잡혔으면 그 화면을 지킨다 —
         *     맞춰 버리면 위치를 받자마자 다시 전 세계로 튕긴다
         *   · 링크로 특정 장소를 열고 들어왔으면(activeId) 그 핀이 주인이다.
         *     아래 포커스 이펙트가 잡아 줄 화면을 여기서 덮어쓰면 안 된다
         *   · 그 외에는 전체에 맞춘다. 두 번째부터(=필터를 바꾼 뒤)는 언제나 맞춘다
         */
        const deepLinked =
          focusActiveOnMount &&
          activeIdRef.current !== null &&
          pins.some((p) => p.id === activeIdRef.current);
        const keepView = !fittedOnceRef.current && (focusedRef.current || deepLinked);
        const applyFit = () => {
          if (!keepView) fitAll();
          /* 빈 핀 배열은 "한 번 맞췄다"로 치지 않는다. `/map` 은 인덱스를 받기 전
             한 번 빈 배열로 이 자리를 지나가는데, 그걸 첫 맞춤으로 세면 진짜 핀이
             도착했을 때 위 keepView 가 풀려서 딥링크 화면을 전체 보기로 덮어썼다. */
          if (pins.length > 0) fittedOnceRef.current = true;
          // 팬·줌 후 원래 화면으로 돌아올 길 — "전체 보기" 버튼이 재사용한다
          refitRef.current = fitAll;
        };

        // 전역 지도(1000+핀)는 AdvancedMarker 를 전부 만들지 않는다.
        // Lighthouse FullPageScreenshot 이 1665개 DOM 마커에서 타임아웃 났다.
        if (cluster && pins.length > 150) {
          clustererRef.current?.setMap(null);
          clustererRef.current = null;
          for (const mk of markersRef.current.values()) mk.map = null;
          markersRef.current.clear();
          /* 뷰포트를 **먼저** 맞춘다. 이 갈래는 보이는 만큼만 그리므로 화면이
             전 세계(초기 zoom 2)에 서 있으면 첫 페인트가 통짜 묶음 하나가 된다.
             예전엔 이 갈래가 fitAll 을 아예 안 거치고 return 해서, 296곳짜리
             조각도 640곳짜리 전역 지도도 세계 지도 위 숫자 하나로 열렸다. */
          applyFit();
          import("supercluster").then(({ default: Supercluster }) => {
            if (cancelled || mapRef.current !== map) return;
            const index = new Supercluster({
              radius: CLUSTER_RADIUS_PX,
              maxZoom: CLUSTER_MAX_ZOOM,
            });
            index.load(
              pins.map((p) => ({
                type: "Feature" as const,
                geometry: {
                  type: "Point" as const,
                  coordinates: [p.lng, p.lat] as [number, number],
                },
                properties: { id: p.id },
              })),
            );
            const byId = new Map(pins.map((p) => [p.id, p]));
            const paintVisible = () => {
              /* 이 리스너보다 새 핀 세트가 먼저 도착했으면 아무것도 하지 않는다 —
                 낡은 index·byId 로 마커를 되살리지 않게. 곧 뒤따라 떼인다. */
              if (pinsSigRef.current !== sig) return;
              const bounds = map.getBounds();
              if (!bounds) return;
              const ne = bounds.getNorthEast();
              const sw = bounds.getSouthWest();
              const z = Math.max(0, Math.round(map.getZoom() ?? 2));
              const features = index.getClusters([sw.lng(), sw.lat(), ne.lng(), ne.lat()], z);
              const mode = nameWhenClose
                ? (map.getZoom() ?? 0) >= NAME_ZOOM
                  ? "name"
                  : "dot"
                : "index";
              const want = new Set<string>();
              for (const feat of features) {
                const props = feat.properties as {
                  cluster?: boolean;
                  cluster_id?: number;
                  point_count?: number;
                  id?: string;
                };
                const [lng, lat] = feat.geometry.coordinates;
                if (props.cluster) {
                  const key = `c:${props.cluster_id}`;
                  want.add(key);
                  if (markersRef.current.has(key)) continue;
                  const mk = new AdvancedMarkerElement({
                    map,
                    position: { lat, lng },
                    content: clusterContent(props.point_count ?? 0, m),
                    zIndex: 900,
                    gmpClickable: true,
                  });
                  const cid = props.cluster_id!;
                  mk.addEventListener("gmp-click", () => {
                    map.setZoom(index.getClusterExpansionZoom(cid));
                    map.panTo({ lat, lng });
                  });
                  markersRef.current.set(key, mk);
                } else {
                  const pin = byId.get(props.id ?? "");
                  if (!pin) continue;
                  want.add(pin.id);
                  if (markersRef.current.has(pin.id)) continue;
                  /* 선택 상태는 ref 로 읽는다 — 이 콜백은 activeId 를 의존성에
                     안 넣는 이펙트 안이라, 값을 닫아 두면 선택 뒤에 화면으로
                     들어온 핀이 "선택 안 됨" 으로 태어난다. */
                  const on = pin.id === activeIdRef.current;
                  const mk = new AdvancedMarkerElement({
                    map,
                    position: { lat: pin.lat, lng: pin.lng },
                    content: pinNode(pin, on, mode),
                    zIndex: on ? 1000 : 0,
                    gmpClickable: Boolean(onPinClick),
                  });
                  if (onPinClick) {
                    /* 최신 콜백을 ref 로 읽는다 — 위 onPinClickRef 주석 */
                    mk.addEventListener("gmp-click", () => onPinClickRef.current?.(pin.id));
                  }
                  markersRef.current.set(pin.id, mk);
                }
              }
              for (const [key, mk] of markersRef.current) {
                if (want.has(key)) continue;
                mk.map = null;
                markersRef.current.delete(key);
              }
            };
            idleRef.current = { listener: map.addListener("idle", paintVisible), sig };
            paintVisible();
          }).catch(() => {
            /* 청크가 안 오면 지도는 **핀 없는 지도**로 조용히 남는다 —
               실패 화면으로 넘겨야 "다시 시도" 라도 손에 쥔다. */
            if (!cancelled) setFailed(true);
          });
          return;
        }

        // 기존 마커 제거 후 다시 그림 — 핀 수십 개 수준이라 diff 불필요
        clustererRef.current?.setMap(null);
        clustererRef.current = null;
        for (const m of markersRef.current.values()) m.map = null;
        markersRef.current.clear();

        const mode = nameWhenClose
          ? (map.getZoom() ?? 0) >= NAME_ZOOM
            ? "name"
            : "dot"
          : "index";
        namedRef.current = mode === "name";

        const made: google.maps.marker.AdvancedMarkerElement[] = [];
        for (const pin of pins) {
          const m = new AdvancedMarkerElement({
            // 묶을 때는 map 을 클러스터러가 붙였다 뗐다 한다 — 여기서 붙이면
            // 묶인 핀이 낱개로도 같이 남아 이중으로 보인다
            ...(cluster ? {} : { map }),
            position: { lat: pin.lat, lng: pin.lng },
            content: pinNode(pin, pin.id === activeId, mode),
            zIndex: pin.id === activeId ? 1000 : (pin.index ?? 0),
            gmpClickable: Boolean(onPinClick),
          });
          if (onPinClick) {
            // addListener("click") 은 deprecated — 표준 이벤트(gmp-click)로 받는다
            // 콜백 자체는 ref 로 읽는다 — 위 onPinClickRef 주석
            m.addEventListener("gmp-click", () => onPinClickRef.current?.(pin.id));
          }
          markersRef.current.set(pin.id, m);
          made.push(m);
        }

        if (cluster && made.length > 0 && clusterMod) {
          const { MarkerClusterer, SuperClusterAlgorithm } = clusterMod;
          clustererRef.current = new MarkerClusterer({
            map,
            markers: made,
            algorithm: new SuperClusterAlgorithm({
              radius: CLUSTER_RADIUS_PX,
              maxZoom: CLUSTER_MAX_ZOOM,
            }),
            renderer: {
              render: (c: Cluster) =>
                new AdvancedMarkerElement({
                  position: c.position,
                  content: clusterContent(c.count, m),
                  // 묶음은 항상 낱개 위에 — 낱개 zIndex 는 pin.index(수십 단위)다
                  zIndex: 900,
                }),
            },
          });
        }

        applyFit();
      })
      .catch(() => setFailed(true));
    /* 여기서 뷰포트 리스너를 떼지 않는다 — 이 정리는 "곧 다시 걸린다" 를 보장하지
       못한다. 소유권은 idleRef 에 있고, 다시 그리는 자리(위 sig 갱신)와
       언마운트·retry 에서만 뗀다. */
    return () => {
      cancelled = true;
    };
    // activeId 는 아래 하이라이트 효과에서 따로 처리 — 핀 재생성 없이
    /* `loaded` 가 있어야 하는 이유: 지도 객체는 rAF 두 번 뒤에 선다. 이 이펙트가
       그 전에 돌면 `!map` 으로 빠져나가는데, 그 뒤 지도가 서도 다시 돌 계기가
       없었다("다시 시도" 뒤에 핀이 영영 안 그려지던 자리 — retry 는 failed 만
       되돌린다). 지문 가드가 중복 실행을 막으므로 한 번 더 도는 건 공짜다. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, failed, cluster, nameWhenClose, loaded]);

  /* 시작점 — 현재 위치처럼 늦게 오는 좌표. 지도가 서 있으면 그때 한 번 옮긴다.
     핀 맞춤과 달리 사용자가 이후 어떻게 움직이든 다시 끼어들지 않는다. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusAt || focusedRef.current) return;
    focusedRef.current = true;
    map.setCenter({ lat: focusAt.lat, lng: focusAt.lng });
    map.setZoom(focusAt.zoom ?? 11);
  }, [focusAt, loaded]);

  // 가까이 가면 상호, 멀면 점 — 마커만 갈아끼우고 뷰포트는 그대로
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !nameWhenClose || !loaded) return;
    const paint = () => {
      const named = (map.getZoom() ?? 0) >= NAME_ZOOM;
      if (named === namedRef.current) return;
      namedRef.current = named;
      const mode = named ? "name" : "dot";
      for (const pin of pinsLiveRef.current) {
        const mk = markersRef.current.get(pin.id);
        if (!mk) continue;
        mk.replaceChildren(pinNode(pin, pin.id === activeId, mode));
      }
    };
    paint();
    const listener = map.addListener("zoom_changed", paint);
    return () => listener.remove();
  }, [nameWhenClose, loaded, activeId]);

  // activeId 하이라이트 — 마커 콘텐츠만 교체 (재생성/뷰포트 리셋 없음)
  const prevActiveRef = useRef<string | null>(null);
  /* 지도가 선 뒤 이 이펙트가 처음 도는 순간 — 그때의 activeId 만 "기본 선택"일 수
     있다. 그 뒤로는 전부 손이 만든 값이다(위 focusActiveOnMount 주석). */
  const focusArmedRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const mode = nameWhenClose ? (namedRef.current ? "name" : "dot") : "index";
    /* 전 핀을 다시 그리지 않는다 — 활성이 바뀌어 보이는 게 달라지는 마커는
       이전 활성과 새 활성 둘뿐이다. 나머지는 생성 시(active=false)와 zoom_changed
       paint 가 이미 맞는 콘텐츠를 들고 있다. 수백 핀 × DOM 재구성이 탭마다
       돌던 것을 2개로 줄인다. */
    const prev = prevActiveRef.current;
    prevActiveRef.current = activeId ?? null;
    for (const id of [prev, activeId ?? null]) {
      if (!id) continue;
      const pin = pins.find((p) => p.id === id);
      const m = markersRef.current.get(id);
      if (!pin || !m) continue;
      const active = id === activeId;
      // .content 는 deprecated — 커스텀 엘리먼트의 children 교체로 동일 효과
      m.replaceChildren(pinNode(pin, active, mode));
      m.zIndex = active ? 1000 : (pin.index ?? 0);
    }

    /**
     * 화면을 옮기는 일은 **마커가 있든 없든** 한다.
     *
     * 여기가 예전에 `markersRef.get(id)` 가 없으면 `continue` 였다. 핀이 150개를
     * 넘는 지도는 보이는 만큼만 마커를 만드는 갈래로 가는데, 고른 장소가 아직
     * 화면 밖이면 마커가 없다 — 즉 **고르면 고를수록 안 움직이는** 상태였다.
     * 296곳짜리 조각(김사원세끼×서울)과 640곳짜리 전역 지도가 정확히 그 경우다.
     * 좌표는 pins 가 이미 들고 있으니 마커를 기다릴 이유가 없고, 옮겨 놓으면
     * idle 페인트가 그 자리에 마커를 만들면서 선택 상태로 태어난다(activeIdRef).
     */
    const firstRun = !focusArmedRef.current;
    focusArmedRef.current = true;
    if (firstRun && !focusActiveOnMount) return;
    if (!activeId) return;
    const pin = pins.find((p) => p.id === activeId);
    if (!pin) return;
    // 목록에서 골라도 "그 핀이 가깝게" 보여야 한다. pan 만 하면 전역 줌에
    // 점이 그대로라 선택이 안 먹은 것처럼 보인다. 묶여 있으면 반드시 풀린다.
    if ((map.getZoom() ?? 0) < FOCUS_MIN_ZOOM) {
      map.setZoom(Math.max(FOCUS_MIN_ZOOM, CLUSTER_MAX_ZOOM + 1));
    }
    map.panTo({ lat: pin.lat, lng: pin.lng });
    /* 바텀시트가 먹는 만큼 핀을 위로 올린다 — 안 그러면 카드 뒤에 숨는다 */
    const pad = fitPaddingRef.current;
    const bottom =
      typeof pad === "function" ? (pad().bottom ?? 0) : typeof pad === "number" ? pad : 0;
    if (bottom > 64) map.panBy(0, Math.round(bottom / 2) - 24);
    /* `loaded` 가 의존성에 있는 이유: 링크로 들어온 선택(?place=)은 지도가 서기
       전에 이미 정해져 있다. 지도 객체가 없으면 위에서 그냥 빠져나갔고, activeId
       는 그 뒤로 안 바뀌니 이 이펙트가 다시 돌 일이 없었다 — 딥링크가 세계
       지도에서 열리던 두 번째 이유다. */
  }, [activeId, pins, nameWhenClose, loaded, focusActiveOnMount]);

  // 언마운트 시 클러스터러와 뷰포트 리스너가 잡고 있는 지도 리스너를 놓아준다
  useEffect(
    () => () => {
      clustererRef.current?.setMap(null);
      clustererRef.current = null;
      idleRef.current?.listener.remove();
      idleRef.current = null;
    },
    [],
  );

  /**
   * 라이트박스의 액자 — 밝은 면이 어두운 지면 위에 얹힌다.
   * 배경을 미리 라이트박스 색으로 깔아 두면 타일이 오기 전에도 검은 구멍이 아니다.
   */
  const frame: React.CSSProperties = {
    background: "var(--lightbox)",
    boxShadow: flush ? "none" : "inset 0 0 0 1px var(--hairline)",
    borderRadius: flush ? 0 : "var(--r-control)",
  };

  if (failed) {
    return (
      <div className={`on-lightbox relative overflow-hidden ${className ?? ""}`} style={frame}>
        {/* 지도 자리 스케치 — 실패해도 빈 박스가 아니라 라이트박스의 일부로 남는다 */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 600 600"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* 색은 토큰으로 — 프레젠테이션 속성에는 var() 가 안 먹어 style 로 준다
              (같은 파일 아래 "전체 핀 보기" 아이콘과 같은 문법) */}
          <g
            style={{ stroke: "var(--lightbox-edge)" }}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          >
            <path d="M-20 170 C 140 140, 320 210, 620 150" />
            <path d="M-20 400 C 180 370, 380 450, 620 380" />
            <path d="M170 -20 C 190 180, 140 400, 190 620" />
            <path d="M430 -20 C 410 200, 470 420, 440 620" />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-bold" style={{ fontSize: "var(--t-body)", color: "var(--lightbox-ink)" }}>
            {m.map.failedTitle}
          </p>
          <p style={{ fontSize: "var(--t-meta)", color: "var(--lightbox-dim)" }}>
            {m.map.failedBody}
          </p>
          {publicEnv.googleMapsKey ? (
            <button
              type="button"
              onClick={retry}
              className="mt-2 cursor-pointer px-4 py-2 font-bold"
              style={{
                background: "var(--paper)",
                color: "var(--ground)",
                borderRadius: "var(--r-frame)",
                fontSize: "var(--t-meta)",
              }}
            >
              {m.map.retry}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`on-lightbox relative overflow-hidden ${className ?? ""}`} style={frame}>
      <div ref={containerRef} aria-busy={!loaded} className="h-full w-full" />
      {!loaded ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* 문구 대신 형태로 기다린다 — 지도의 뼈대(도로선·핀 자리) 스켈레톤.
              라이트박스 위이므로 밝은 지면에 회색 선이다.

              `.bone-line` 을 쓴다 — pulse 는 globals.css 의 스켈레톤 규칙이 금지하고
              (§"스켈레톤 — 시머. pulse 금지"), 무엇보다 reduced-motion 블록이
              `.bone*` 만 다뤄서 animate-pulse 는 그 사용자에게도 계속 깜빡였다.

              크기·위치를 클래스가 아니라 인라인으로 준다 — globals.css 는 layer
              밖이라 `.bone-line` 의 position/height/border-radius 가 Tailwind
              유틸리티를 이긴다(bones.tsx 주석과 같은 이유). */}
          {[
            { top: "33.333%", left: 0, width: "100%", height: 6 },
            { top: "66.666%", left: 0, width: "100%", height: 4 },
            { top: 0, left: "33.333%", width: 6, height: "100%" },
            { top: 0, left: "66.666%", width: 4, height: "100%" },
          ].map((box, i) => (
            <span
              key={i}
              className="bone-line"
              style={{ position: "absolute", borderRadius: 0, ...box }}
            />
          ))}
          <span
            className="bone-line"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 28,
              height: 28,
              transform: "translate(-50%, -50%)",
              borderRadius: "var(--r-frame)",
            }}
          />
        </div>
      ) : null}
      {!loaded ? <p className="sr-only">{m.map.loading}</p> : null}
      {loaded && pins.length > 0 ? (
        <button
          type="button"
          aria-label={m.map.viewAll}
          title={m.map.viewAll}
          onClick={() => refitRef.current?.()}
          /* `map-refit` 은 자리를 옮기기 위한 이름표다 — 데스크톱 캔버스
             (`/map`·`/city/[city]`)에서 이 기본 자리(left:12px)가 좌측 레일
             (fixed, x 16–80, 불투명) 아래로 들어간다. globals.css 의
             `@media (min-width:1024px)` 캔버스 블록이 패널 오른쪽으로 민다.
             조각·영상 화면의 지도는 칸 안에 있어 겹치지 않으므로 그대로 둔다. */
          className="map-refit absolute bottom-3 left-3 grid size-10 cursor-pointer place-items-center"
          style={{
            background: "var(--paper)",
            borderRadius: "var(--r-frame)",
            boxShadow: "var(--lift-pin)",
          }}
        >
          <svg aria-hidden viewBox="0 0 64 64" className="size-4" style={{ fill: "var(--ground)" }}>
            <path d="M4 4h22v6.5H10.5V26H4zm56 0v22h-6.5V10.5H38V4zM4 38h6.5v15.5H26V60H4zm56 0v22H38v-6.5h15.5V38z" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
