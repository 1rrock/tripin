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
import { MarkerClusterer, SuperClusterAlgorithm, type Cluster } from "@googlemaps/markerclusterer";
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
      "text-overflow:ellipsis",
      "cursor:pointer",
      "box-shadow:var(--lift-pin)",
    ].join(";");
    el.textContent = pin.name;
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
  singlePinZoom = 15,
  cluster = false,
  nameWhenClose = false,
  fitPadding = 48,
  focusAt = null,
}: MapViewProps) {
  const { messages: m } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  // 핀 배열은 호출부에서 매 렌더 새로 만들어진다 — 내용이 같으면 마커 재생성·뷰포트
  // 리셋을 건너뛰기 위한 시그니처 (리스트 선택이 지도를 되돌리는 버그 방지)
  const pinsSigRef = useRef<string>("");
  const namedRef = useRef(false);
  const pinsLiveRef = useRef(pins);
  pinsLiveRef.current = pins;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
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
  // 키 부재는 첫 렌더에 이미 아는 사실 — effect 에서 set 하지 않고 초기값으로 파생
  const [failed, setFailed] = useState(() => !publicEnv.googleMapsKey);
  const [loaded, setLoaded] = useState(false);
  // 재시도 카운터 — 실패 후 "다시 시도"가 지도 생성 effect 를 다시 돌린다
  const [attempt, setAttempt] = useState(0);
  // "전체 핀 보기" — 마지막 핀 세트의 뷰포트 맞춤을 다시 실행한다
  const refitRef = useRef<(() => void) | null>(null);

  // 지도 생성 (재시도 전까지 1회)
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
        map.addListener("click", () => {
          onMapClickRef.current?.();
        });
        // 지도 객체 생성 ≠ 지도가 보임 — 타일이 실제로 그려진 시점에만 로딩을 해제한다.
        tilesListener = map.addListener("tilesloaded", () => {
          tilesListener?.remove();
          if (timer) clearTimeout(timer);
          if (!cancelled) setLoaded(true);
        });
        timer = setTimeout(() => {
          if (!cancelled) setFailed(true);
        }, TILES_TIMEOUT_MS);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      tilesListener?.remove();
    };
  }, [attempt]);

  const retry = () => {
    mapRef.current = null;
    clustererRef.current?.setMap(null);
    clustererRef.current = null;
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
    Promise.all([maps, marker])
      .then(([, { AdvancedMarkerElement }]) => {
        const map = mapRef.current;
        if (cancelled || !map) return;

        // 내용이 같은 배열(호출부의 매 렌더 재생성)이면 아무것도 하지 않는다 —
        // 재생성·fitBounds 를 다시 돌리면 사용자가 옮긴 뷰포트가 튕긴다
        const sig =
          `${cluster}:${nameWhenClose}#` +
          pins.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.index}:${p.label}:${p.name}`).join("|");
        if (sig === pinsSigRef.current) return;
        pinsSigRef.current = sig;

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
            m.addEventListener("gmp-click", () => onPinClick(pin.id));
          }
          markersRef.current.set(pin.id, m);
          made.push(m);
        }

        if (cluster && made.length > 0) {
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
        /* 시작점(현재 위치)이 첫 핀보다 먼저 잡혔으면 그 화면을 지킨다 — 맞춰 버리면
           위치를 받자마자 다시 전 세계로 튕긴다. 두 번째부터(=필터를 바꾼 뒤)는
           결과에 맞추는 것이 맞으므로 그대로 맞춘다. */
        if (!(focusedRef.current && !fittedOnceRef.current)) fitAll();
        fittedOnceRef.current = true;
        // 팬·줌 후 원래 화면으로 돌아올 길 — "전체 보기" 버튼이 재사용한다
        refitRef.current = fitAll;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // activeId 는 아래 하이라이트 효과에서 따로 처리 — 핀 재생성 없이
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, failed, cluster, nameWhenClose]);

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
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const mode = nameWhenClose ? (namedRef.current ? "name" : "dot") : "index";
    for (const pin of pins) {
      const m = markersRef.current.get(pin.id);
      if (!m) continue;
      const active = pin.id === activeId;
      // .content 는 deprecated — 커스텀 엘리먼트의 children 교체로 동일 효과
      m.replaceChildren(pinNode(pin, active, mode));
      m.zIndex = active ? 1000 : (pin.index ?? 0);
      if (!active) continue;
      // 목록에서 골라도 "그 핀이 가깝게" 보여야 한다. pan 만 하면 전역 줌에
      // 점이 그대로라 선택이 안 먹은 것처럼 보인다. 묶여 있으면 반드시 풀린다.
      const z = map.getZoom() ?? 0;
      const needZoom =
        z < FOCUS_MIN_ZOOM || (cluster && !m.map && z <= CLUSTER_MAX_ZOOM);
      if (needZoom) {
        map.setZoom(Math.max(FOCUS_MIN_ZOOM, CLUSTER_MAX_ZOOM + 1));
      }
      map.panTo({ lat: pin.lat, lng: pin.lng });
    }
  }, [activeId, pins, cluster, nameWhenClose]);

  // 언마운트 시 클러스터러가 잡고 있는 지도 리스너를 놓아준다
  useEffect(
    () => () => {
      clustererRef.current?.setMap(null);
      clustererRef.current = null;
    },
    [],
  );

  /**
   * 라이트박스의 액자 — 밝은 면이 어두운 지면 위에 얹힌다.
   * 배경을 미리 라이트박스 색으로 깔아 두면 타일이 오기 전에도 검은 구멍이 아니다.
   */
  const frame: React.CSSProperties = {
    background: "var(--lightbox)",
    boxShadow: "inset 0 0 0 1px var(--hairline)",
    borderRadius: "var(--r-control)",
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
          <g stroke="#e6e6e6" strokeWidth="7" fill="none" strokeLinecap="round">
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
        <div aria-hidden className="pointer-events-none absolute inset-0 animate-pulse">
          {/* 문구 대신 형태로 기다린다 — 지도의 뼈대(도로선·핀 자리) 스켈레톤.
              라이트박스 위이므로 밝은 지면에 회색 선이다 */}
          <div className="absolute top-1/3 left-0 h-1.5 w-full bg-[#e6e6e6]" />
          <div className="absolute top-2/3 left-0 h-1 w-full bg-[#e6e6e6]" />
          <div className="absolute top-0 left-1/3 h-full w-1.5 bg-[#e6e6e6]" />
          <div className="absolute top-0 left-2/3 h-full w-1 bg-[#e6e6e6]" />
          <div
            className="absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 bg-[#ededed]"
            style={{ borderRadius: "var(--r-frame)" }}
          />
        </div>
      ) : null}
      {!loaded ? <p className="sr-only">{m.map.loading}</p> : null}
      {loaded && pins.length > 0 ? (
        <button
          type="button"
          aria-label={m.map.viewAll}
          onClick={() => refitRef.current?.()}
          className="absolute bottom-3 left-3 grid size-10 cursor-pointer place-items-center"
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
