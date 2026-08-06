"use client";

/**
 * 공통 지도 컴포넌트 — 유저 화면과 어드민이 같이 쓴다 (CONCEPT.md 5장).
 *
 * 렌더러: Google Maps JavaScript API (LEGAL.md 4장 A안 — 2026-08-04 채택).
 * 번호 마커(①②③)가 리스트 번호와 일치하는 것이 핵심 UX 다 (CONCEPT.md 4.3).
 *
 * 지연 로드: SDK 스크립트는 이 컴포넌트가 마운트될 때 1회만 로드된다.
 * 실패 시 지도 대신 안내 문구를 띄운다 — 리스트만으로도 서비스가 성립해야 한다.
 */

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { isProduction, publicEnv } from "@/shared/config/env";
import { isDarkHex } from "@/shared/lib/color";

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
  /** 하이라이트할 핀 id — 리스트 호버/선택과 동기화. */
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

/** 번호 핀 — 액센트 원 + 2px 잉크 링 + 하드 섀도, 활성 시 잉크 반전 (Color Pop 월드). */
function markerContent(pin: MapPin, active: boolean): HTMLElement {
  const el = document.createElement("div");
  const color = pin.accentColor ?? "#3f8cff";
  el.style.cssText = [
    `background:${active ? "var(--ink)" : color}`,
    `color:${active || isDarkHex(color) ? "#ffffff" : "var(--ink)"}`,
    "border-radius:9999px",
    "min-width:28px",
    "height:28px",
    "padding:0 4px",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font:700 13px/1 'Pretendard Variable',Pretendard,-apple-system,sans-serif",
    "font-variant-numeric:tabular-nums",
    "box-shadow:2px 2px 0 rgba(20,20,20,.85)",
    "border:2px solid var(--ink)",
    "cursor:pointer",
    active ? "transform:scale(1.2)" : "",
    "transition:transform .12s ease-out",
  ].join(";");
  el.textContent = pin.index !== undefined ? String(pin.index) : "•";
  el.title = pin.name;
  return el;
}

export function MapView({ pins, activeId, onPinClick, className, singlePinZoom = 15 }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  // 핀 배열은 호출부에서 매 렌더 새로 만들어진다 — 내용이 같으면 마커 재생성·뷰포트
  // 리셋을 건너뛰기 위한 시그니처 (리스트 호버가 지도를 되돌리는 버그 방지)
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
    if (publicEnv.googleMapsId === "DEMO_MAP_ID" && !isProduction) {
      console.warn(
        "[MapView] NEXT_PUBLIC_GOOGLE_MAPS_ID 미설정 — DEMO_MAP_ID 폴백은 구글 기본 POI 아이콘이 " +
          "그대로 노출되어 우리 핀이 묻힙니다. Cloud Console 에서 POI 를 끈 Map ID 를 만들어 주입하세요.",
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
        });
        mapRef.current = map;
        // 지도 객체 생성 ≠ 지도가 보임 — 타일이 실제로 그려진 시점에만 로딩을 해제한다.
        // mapId 오설정·쿼터 초과 등 SDK 로드는 성공하지만 타일이 안 오는 실패를
        // 타임아웃으로 잡아 폴백 문구가 제 역할을 하게 한다.
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

  if (failed) {
    return (
      <div className={`relative overflow-hidden bg-fill ${className ?? ""}`}>
        {/* 지도 자리 스케치 — 실패해도 빈 박스가 아니라 지면의 일부로 남는다 */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 600 600"
          preserveAspectRatio="xMidYMid slice"
        >
          <g stroke="#e5e0d4" strokeWidth="7" fill="none" strokeLinecap="round">
            <path d="M-20 170 C 140 140, 320 210, 620 150" />
            <path d="M-20 400 C 180 370, 380 450, 620 380" />
            <path d="M170 -20 C 190 180, 140 400, 190 620" />
            <path d="M430 -20 C 410 200, 470 420, 440 620" />
          </g>
          <g fill="#e5e0d4">
            <circle cx="300" cy="255" r="13" />
            <circle cx="150" cy="330" r="10" />
            <circle cx="470" cy="300" r="10" />
            <circle cx="360" cy="470" r="10" />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center">
          <p className="text-[15px] font-bold">지도를 잠시 불러오지 못했어요</p>
          <p className="text-[13px] text-ink-soft">목록만으로도 모든 장소를 확인할 수 있어요</p>
          {publicEnv.googleMapsKey ? (
            <button
              type="button"
              onClick={retry}
              className="mt-3 min-h-10 cursor-pointer rounded-full bg-ink px-5 text-[13px] font-bold text-paper transition hover:opacity-85 active:scale-[0.97]"
            >
              다시 시도
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div ref={containerRef} aria-busy={!loaded} className="h-full w-full bg-fill" />
      {!loaded ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 animate-pulse bg-fill">
          {/* 문구 대신 형태로 기다린다 — 지도의 뼈대(도로선·핀 자리) 스켈레톤 */}
          <div className="absolute top-6 left-5 h-2 w-24 rounded-full bg-line" />
          <div className="absolute top-11 left-5 h-2 w-14 rounded-full bg-line" />
          <div className="absolute top-1/3 left-1/4 h-2 w-1/2 rotate-6 rounded-full bg-line" />
          <div className="absolute top-1/2 left-[16%] h-2 w-2/3 -rotate-3 rounded-full bg-line" />
          <div className="absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-line bg-paper" />
          <div className="absolute right-6 bottom-8 h-9 w-9 rounded-full bg-line" />
        </div>
      ) : null}
      {!loaded ? <p className="sr-only">지도 불러오는 중</p> : null}
      {loaded && pins.length > 0 ? (
        <button
          type="button"
          aria-label="전체 핀 보기"
          onClick={() => refitRef.current?.()}
          className="absolute bottom-3 left-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-paper text-ink transition hover:bg-fill active:scale-[0.95]"
        >
          <svg
            aria-hidden
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6V3.5A1.5 1.5 0 0 1 3.5 2H6M10 2h2.5A1.5 1.5 0 0 1 14 3.5V6M14 10v2.5a1.5 1.5 0 0 1-1.5 1.5H10M6 14H3.5A1.5 1.5 0 0 1 2 12.5V10" />
            <circle cx="8" cy="8" r="2" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
