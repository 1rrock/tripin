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
import { publicEnv } from "@/shared/config/env";
import { isDarkHex } from "@/shared/lib/color";

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

/** 자막 외곽선 스타일 핀 — 액센트 원 + 잉크 테두리, 활성 시 잉크 반전 (편집자막 월드). */
function markerContent(pin: MapPin, active: boolean): HTMLElement {
  const el = document.createElement("div");
  const color = pin.accentColor ?? "#ffd400";
  el.style.cssText = [
    `background:${active ? "#111111" : color}`,
    `color:${active || isDarkHex(color) ? "#ffffff" : "#111111"}`,
    "border-radius:9999px",
    "min-width:27px",
    "height:27px",
    "padding:0 4px",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font:700 13px/1 var(--font-timecode,monospace)",
    "font-variant-numeric:tabular-nums",
    "box-shadow:0 2px 5px rgba(0,0,0,.3)",
    "border:2px solid #111111",
    "cursor:pointer",
    active ? "transform:scale(1.25)" : "",
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

  // 지도 생성 (1회)
  useEffect(() => {
    if (!publicEnv.googleMapsKey) return;
    let cancelled = false;
    const { maps } = loadSdk();
    maps
      .then(({ Map }) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = new Map(containerRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          mapId: publicEnv.googleMapsId,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false, // 구글 기본 POI 클릭 방지 — 우리 핀에 집중
        });
        setLoaded(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

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
          });
          if (onPinClick) {
            m.addListener("click", () => onPinClick(pin.id));
          }
          markersRef.current.set(pin.id, m);
        }

        // 뷰포트: 전체 bounds + 패딩 / 핀 1개면 고정 줌 (CONCEPT.md 4.3)
        if (pins.length === 1) {
          map.setCenter({ lat: pins[0]!.lat, lng: pins[0]!.lng });
          map.setZoom(singlePinZoom);
        } else if (pins.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          for (const pin of pins) bounds.extend({ lat: pin.lat, lng: pin.lng });
          map.fitBounds(bounds, 48);
        }
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
      m.content = markerContent(pin, active);
      m.zIndex = active ? 1000 : (pin.index ?? 0);
      if (active) map.panTo({ lat: pin.lat, lng: pin.lng });
    }
  }, [activeId, pins]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-100 text-sm text-ink-soft ${className ?? ""}`}
      >
        지도를 불러오지 못했습니다 — 아래 목록으로 확인하세요
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div ref={containerRef} aria-busy={!loaded} className="h-full w-full bg-neutral-100" />
      {!loaded ? (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-soft">
          지도 불러오는 중…
        </p>
      ) : null}
    </div>
  );
}
