/**
 * 구글 지도 공유 링크 → 좌표 해석 (서버 전용).
 *
 * 공유 링크(maps.app.goo.gl)는 리다이렉트 최종 URL 에 좌표를 품고 있다:
 *   · !3d{lat}!4d{lng} — 장소 핀 좌표 (정확, 우선)
 *   · @{lat},{lng}     — 지도 중심 좌표 (폴백)
 *
 * 운영자가 구글에 등록된 가게의 공유 링크만 붙여넣으면 좌표를 따로
 * 입력할 필요가 없게 하는 용도 (scripts/ingest/backfill-coords.mjs 와 동일 로직).
 */

export function isGoogleShareLink(url: string): boolean {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/.test(url);
}

/** 이미 펼쳐진 구글 지도 URL 에서 좌표만 읽는다. 네트워크 없음. */
export function coordsFromMapsUrl(url: string | null | undefined): { lat: number; lng: number } | null {
  if (!url) return null;
  let u = url;
  try {
    u = decodeURIComponent(url);
  } catch {
    /* 이미 디코드된 주소 */
  }
  const pin = u.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (pin) return { lat: Number(pin[1]), lng: Number(pin[2]) };
  const at = u.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) };
  const query = u.match(/[?&](?:q|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (query) return { lat: Number(query[1]), lng: Number(query[2]) };
  const ll = u.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (ll) return { lat: Number(ll[1]), lng: Number(ll[2]) };
  return null;
}

export async function resolveGoogleCoords(
  url: string,
): Promise<{ lat: number; lng: number } | null> {
  const inline = coordsFromMapsUrl(url);
  if (inline) return inline;
  if (!isGoogleShareLink(url)) return null;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    return coordsFromMapsUrl(res.url);
  } catch {
    // 네트워크 실패 시 null — 호출부가 수동 입력으로 안내
  }
  return null;
}
