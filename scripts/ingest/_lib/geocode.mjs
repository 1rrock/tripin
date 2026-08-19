/**
 * 인제스트 공용 지오코딩 — 공유링크 / GSI / Nominatim.
 * 앱 쪽 resolve-google-place 과 같은 우선순위(핀 !3d!4d → @중심).
 */

const DEFAULT_UA = "tripin-ingest-geocode/1.0";

/** 구글 공유 링크 → 최종 URL 좌표. !3d!4d(핀) 우선. */
export async function fromShareLink(url, ua = DEFAULT_UA) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": ua.includes("tripin") ? "Mozilla/5.0" : ua },
    });
    const final = res.url;
    const d34 = final.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (d34) return { lat: Number(d34[1]), lng: Number(d34[2]), via: "구글 공유링크(핀)" };
    const at = final.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) return { lat: Number(at[1]), lng: Number(at[2]), via: "구글 공유링크(중심)" };
  } catch {
    /* ignore */
  }
  return null;
}

/** 국토지리원 주소 검색 — 일본 전용, 키 불필요. */
export async function fromGsi(address, ua = DEFAULT_UA) {
  try {
    const res = await fetch(
      `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`,
      { headers: { "user-agent": ua } },
    );
    const data = await res.json();
    const [lng, lat] = data?.[0]?.geometry?.coordinates ?? [];
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng, via: "GSI 주소", title: data[0]?.properties?.title };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** OSM Nominatim — JP 외 폴백. 호출 간 1초 딜레이는 호출 쪽에서. */
export async function fromNominatim(query, ua = DEFAULT_UA) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { "user-agent": ua } },
    );
    const data = await res.json();
    const hit = data?.[0];
    if (hit) return { lat: Number(hit.lat), lng: Number(hit.lon), via: "Nominatim" };
  } catch {
    /* ignore */
  }
  return null;
}

export function isGoogleShareLink(url) {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/.test(url ?? "");
}

export const inJP = (lat, lng) => lat > 30 && lat < 46 && lng > 129 && lng < 146;
export const inKR = (lat, lng) => lat > 33 && lat < 39 && lng > 124 && lng < 132;
export const inAU = (lat, lng) => lat > -45 && lat < -10 && lng > 110 && lng < 155;
export const inES = (lat, lng) => lat > 27 && lat < 44 && lng > -19 && lng < 5;
