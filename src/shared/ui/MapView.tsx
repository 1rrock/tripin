"use client";

/**
 * 공통 지도 컴포넌트 — 유저 화면과 어드민이 같이 쓴다 (CONCEPT.md 5장).
 *
 * 렌더러: Google Maps JavaScript API (LEGAL.md 4장 A안 — 2026-08-04 채택).
 * 번호 마커가 리스트의 "핀" 값과 일치하는 것이 핵심 UX 다 (CONCEPT.md 4.3).
 *
 * 월드: 공항 사인 시스템 — 마커는 원이 아니라 **검정 라운드 정사각 + 사인 옐로 숫자**다.
 * 활성 시 반전(노란 지면 + 검정 숫자)한다. 게이트 번호판과 같은 문법.
 *
 * 지연 로드: SDK 스크립트는 이 컴포넌트가 마운트될 때 1회만 로드된다.
 * 실패 시 지도 대신 안내 문구를 띄운다 — 리스트만으로도 서비스가 성립해야 한다.
 */

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { isProduction, publicEnv } from "@/shared/config/env";
import { SIGN_MAP_STYLE } from "@/shared/config/map-style";

/** 타일이 이 시간 안에 안 그려지면 실패로 판정 — 조용한 회색 박스를 만들지 않는다. */
const TILES_TIMEOUT_MS = 8000;

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 리스트와 일치하는 1-기반 번호. 없으면 점 마커. */
  index?: number;
  accentColor?: string;
}

interface MapViewProps {
  pins: MapPin[];
  /** 하이라이트할 핀 id — 리스트 선택과 동기화. */
  activeId?: string | null;
  onPinClick?: (id: string) => void;
  className?: string;
  /** 핀 1개일 때 줌 (기본 15 — CONCEPT.md 4.3). */
  singlePinZoom?: number;
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
 * 번호 핀 — 검정 라운드 정사각 + 사인 옐로 숫자, 활성 시 반전.
 *
 * 크리에이터 액센트는 여기서 쓰지 않는다. 지도는 노랑·검정 두 색으로 버티는 지면이고
 * 세 번째 색이 들어오면 핀이 구글 기본 POI 와 구분되지 않는다.
 */
function markerContent(pin: MapPin, active: boolean): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = [
    `background:${active ? "var(--sign)" : "var(--ink)"}`,
    `color:${active ? "var(--ink)" : "var(--sign)"}`,
    `border:${active ? "2.5px solid var(--ink)" : "none"}`,
    "border-radius:var(--r-pin)",
    "min-width:32px",
    "height:32px",
    "padding:0 6px",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font-family:inherit",
    "font-weight:700",
    "font-size:15px",
    "line-height:1",
    "font-variant-numeric:tabular-nums",
    "cursor:pointer",
    active ? "transform:scale(1.18)" : "",
    "transition:transform .12s ease-out",
  ].join(";");
  el.textContent = pin.index !== undefined ? String(pin.index) : "•";
  el.title = pin.name;
  return el;
}

export function MapView({
  pins,
  activeId,
  onPinClick,
  className,
  singlePinZoom = 15,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  // 핀 배열은 호출부에서 매 렌더 새로 만들어진다 — 내용이 같으면 마커 재생성·뷰포트
  // 리셋을 건너뛰기 위한 시그니처 (리스트 선택이 지도를 되돌리는 버그 방지)
  const pinsSigRef = useRef<string>("");
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
        "[MapView] NEXT_PUBLIC_GOOGLE_MAPS_ID 미설정 — DEMO_MAP_ID 폴백은 구글 기본 POI 아이콘이 " +
          "그대로 노출되어 우리 핀이 묻힙니다. Cloud Console 에서 POI 를 끄고 " +
          "map-style.ts 와 같은 값으로 스타일을 올린 Map ID 를 만들어 주입하세요.",
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
          // ⚠️ mapId 가 설정되면 인라인 styles 는 무시되고 Cloud 스타일이 이긴다.
          // 그래서 실제 Map ID 가 없을 때만(로컬) 인라인으로 월드를 입힌다.
          // 배포 전 같은 값을 Cloud 맵 스타일로 올려야 한다 — map-style.ts 주석 참조.
          ...(usingDemoMapId ? { styles: SIGN_MAP_STYLE } : {}),
        });
        mapRef.current = map;
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
        const sig = pins.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.index}`).join("|");
        if (sig === pinsSigRef.current) return;
        pinsSigRef.current = sig;

        // 기존 마커 제거 후 다시 그림 — 핀 수십 개 수준이라 diff 불필요
        for (const m of markersRef.current.values()) m.map = null;
        markersRef.current.clear();

        for (const pin of pins) {
          const m = new AdvancedMarkerElement({
            map,
            position: { lat: pin.lat, lng: pin.lng },
            content: markerContent(pin, pin.id === activeId),
            zIndex: pin.id === activeId ? 1000 : (pin.index ?? 0),
            gmpClickable: Boolean(onPinClick),
          });
          if (onPinClick) {
            // addListener("click") 은 deprecated — 표준 이벤트(gmp-click)로 받는다
            m.addEventListener("gmp-click", () => onPinClick(pin.id));
          }
          markersRef.current.set(pin.id, m);
        }

        // 뷰포트: 전체 bounds + 패딩 / 핀 1개면 고정 줌 (CONCEPT.md 4.3)
        const fitAll = () => {
          if (pins.length === 1) {
            map.setCenter({ lat: pins[0]!.lat, lng: pins[0]!.lng });
            map.setZoom(singlePinZoom);
          } else if (pins.length > 1) {
            const bounds = new google.maps.LatLngBounds();
            for (const pin of pins) bounds.extend({ lat: pin.lat, lng: pin.lng });
            map.fitBounds(bounds, 48);
          }
        };
        fitAll();
        // 팬·줌 후 원래 화면으로 돌아올 길 — "전체 보기" 버튼이 재사용한다
        refitRef.current = fitAll;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // activeId 는 아래 하이라이트 효과에서 따로 처리 — 핀 재생성 없이
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, failed]);

  // activeId 하이라이트 — 마커 콘텐츠만 교체 (재생성/뷰포트 리셋 없음)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const pin of pins) {
      const m = markersRef.current.get(pin.id);
      if (!m) continue;
      const active = pin.id === activeId;
      // .content 는 deprecated — 커스텀 엘리먼트의 children 교체로 동일 효과
      m.replaceChildren(markerContent(pin, active));
      m.zIndex = active ? 1000 : (pin.index ?? 0);
      if (active) map.panTo({ lat: pin.lat, lng: pin.lng });
    }
  }, [activeId, pins]);

  /** 지도 패널의 액자 — 카드와 같은 헤어라인·라운드로 지면에 앉는다. */
  const frame: React.CSSProperties = {
    border: "var(--stroke-card) solid var(--hairline)",
    borderRadius: "var(--r-card)",
  };

  if (failed) {
    return (
      <div className={`relative overflow-hidden ${className ?? ""}`} style={frame}>
        {/* 지도 자리 스케치 — 실패해도 빈 박스가 아니라 지면의 일부로 남는다 */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 600 600"
          preserveAspectRatio="xMidYMid slice"
        >
          <g stroke="var(--hairline)" strokeWidth="7" fill="none" strokeLinecap="round">
            <path d="M-20 170 C 140 140, 320 210, 620 150" />
            <path d="M-20 400 C 180 370, 380 450, 620 380" />
            <path d="M170 -20 C 190 180, 140 400, 190 620" />
            <path d="M430 -20 C 410 200, 470 420, 440 620" />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-bold" style={{ fontSize: "var(--t-body)" }}>
            지도를 잠시 불러오지 못했어요
          </p>
          <p style={{ fontSize: "var(--t-meta)" }}>목록만으로도 모든 장소를 확인할 수 있어요</p>
          {publicEnv.googleMapsKey ? (
            <button
              type="button"
              onClick={retry}
              className="mt-2 cursor-pointer px-5 py-2.5 font-medium"
              style={{
                background: "var(--ink)",
                color: "var(--on-ink)",
                borderRadius: "var(--r-field)",
                fontSize: "var(--t-chip)",
              }}
            >
              다시 시도
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={frame}>
      <div ref={containerRef} aria-busy={!loaded} className="h-full w-full" />
      {!loaded ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 animate-pulse">
          {/* 문구 대신 형태로 기다린다 — 지도의 뼈대(도로선·핀 자리) 스켈레톤 */}
          <div className="absolute top-1/3 left-0 h-1.5 w-full bg-ink opacity-25" />
          <div className="absolute top-2/3 left-0 h-1 w-full bg-ink opacity-25" />
          <div className="absolute top-0 left-1/3 h-full w-1.5 bg-ink opacity-25" />
          <div className="absolute top-0 left-2/3 h-full w-1 bg-ink opacity-25" />
          <div
            className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 bg-ink opacity-30"
            style={{ borderRadius: "var(--r-pin)" }}
          />
        </div>
      ) : null}
      {!loaded ? <p className="sr-only">지도 불러오는 중</p> : null}
      {loaded && pins.length > 0 ? (
        <button
          type="button"
          aria-label="전체 핀 보기"
          onClick={() => refitRef.current?.()}
          className="absolute bottom-3 left-3 grid h-11 w-11 cursor-pointer place-items-center"
          style={{ background: "var(--ink)", borderRadius: "var(--r-box)" }}
        >
          <svg aria-hidden viewBox="0 0 64 64" className="h-5 w-5" style={{ fill: "var(--on-ink)" }}>
            <path d="M4 4h22v6.5H10.5V26H4zm56 0v22h-6.5V10.5H38V4zM4 38h6.5v15.5H26V60H4zm56 0v22H38v-6.5h15.5V38z" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
