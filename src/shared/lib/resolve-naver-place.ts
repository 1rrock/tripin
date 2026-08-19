/**
 * 네이버 플레이스 ID → 좌표/이름/주소 해석 (서버 전용).
 *
 * m.place.naver.com/{category}/{id}/home 을 모바일 User-Agent 로 GET 하면 HTML 안에
 * Apollo(GraphQL 캐시) state JSON 이 그대로 박혀 있고, 그 안에 "x"(경도)/"y"(위도)/
 * "name"/"address"/"roadAddress" 가 들어 있다 (실측 검증). 문서에 안 나오는 내부
 * 페이로드라 정규식으로 뽑는다 — 같은 키가 여러 번 나올 수 있는데, 대상 업소가 가장
 * 먼저 나오는 매치라 첫 번째 것만 쓴다.
 *
 * 카테고리(restaurant·hairshop·attraction…)를 모르니 restaurant 로 먼저 시도하고,
 * 실패하면 place 로 한 번 더 시도한다. 실패해도 throw 하지 않는다 — 호출부는 좌표를
 * "자동으로 못 채웠을 뿐"으로 다루고 사람 입력으로 폴백한다.
 */

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export interface NaverPlaceInfo {
  name: string | null;
  address: string | null;
  lat: number;
  lng: number;
}

function firstMatch(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  return m ? m[1]! : null;
}

async function fetchPlaceHtml(placeId: string, category: string): Promise<string | null> {
  try {
    const res = await fetch(`https://m.place.naver.com/${category}/${placeId}/home`, {
      headers: { "user-agent": MOBILE_UA },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    // 네트워크/타임아웃 실패 — null 로 호출부에 위임
    return null;
  }
}

function parsePlaceHtml(html: string): NaverPlaceInfo | null {
  const lngRaw = firstMatch(html, /"x":"(-?\d+\.?\d*)"/);
  const latRaw = firstMatch(html, /"y":"(-?\d+\.?\d*)"/);
  if (!lngRaw || !latRaw) return null;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  // 상호는 og:title 이 가장 믿을 만하다. Apollo 의 첫 `"name"` 은 업종에 따라
  // 내부 enum("DVLP","RELA" — 시장 페이지에서 실제로 나왔다)을 물어오는 일이 있다.
  const name =
    firstMatch(html, /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.replace(
      /\s*:\s*네이버\s*$/,
      "",
    ) ?? firstMatch(html, /"name":"([^"]+)"/);
  // 도로명주소를 우선하고, 없으면 지번주소로 폴백
  const address =
    firstMatch(html, /"roadAddress":"([^"]+)"/) ?? firstMatch(html, /"address":"([^"]+)"/);

  return { name, address, lat, lng };
}

async function tryCategory(placeId: string, category: string): Promise<NaverPlaceInfo | null> {
  const html = await fetchPlaceHtml(placeId, category);
  if (!html) return null;
  return parsePlaceHtml(html);
}

export async function resolveNaverPlace(naverPlaceId: string): Promise<NaverPlaceInfo | null> {
  return (await tryCategory(naverPlaceId, "restaurant")) ?? (await tryCategory(naverPlaceId, "place"));
}
