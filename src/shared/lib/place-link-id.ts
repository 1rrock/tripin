/**
 * 네이버/카카오 장소 링크·ID 파싱.
 *
 * 어드민 폼은 운영자가 지도 앱에서 복사한 링크를 그대로 붙여넣는 걸 전제한다.
 * 예전엔 정규식이 안 맞으면 입력값 전체(URL 통째)를 ID 로 저장해버렸는데, 그러면
 * `map-links.ts` 가 `.../entry/place/https://...` 같은 깨진 딥링크를 만들어 유저에게
 * 노출됐다. 그래서 여기서는 매치 실패 시 절대 입력값을 되돌려주지 않고 null 을 준다 —
 * 호출부(actions.ts)가 저장을 막고 사람에게 다시 물어보게 한다.
 */

/** naver.me 단축 링크는 리다이렉트 없이는 숫자 ID 를 알 수 없다 — 전용 안내 메시지용 판별. */
export function isNaverShortLink(raw: string): boolean {
  try {
    return new URL(raw.trim()).hostname.toLowerCase() === "naver.me";
  } catch {
    return false;
  }
}

/**
 * 네이버 장소 ID 추출. 받아들이는 형태:
 *   · 숫자만                                          "1963188795"
 *   · map.naver.com/p/entry/place/{id}, /v5/entry/place/{id}
 *   · m.place.naver.com/{category}/{id}/…, pcmap.place.naver.com/…, place.naver.com/…
 *     (category 는 restaurant·hairshop·attraction 등 다양해서 이름을 고정하지 않고
 *      "/영문세그먼트/숫자/" 패턴으로 일반화해서 잡는다)
 *   · 쿼리에 id 가 실린 형태 ?place=… / ?id=…
 * naver.me 단축 링크는 호스트가 naver.com 이 아니라 자연히 null 이 된다.
 */
export function parseNaverPlaceId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  // 장소 페이지를 서비스하는 호스트만 인정한다. `*.naver.com` 전부를 받으면
  // blog.naver.com/foo/223 같은 글 주소에서 "223" 을 장소 ID 로 뽑아버린다.
  const host = url.hostname.toLowerCase();
  const NAVER_PLACE_HOSTS = ["map.naver.com", "m.place.naver.com", "pcmap.place.naver.com", "place.naver.com"];
  if (!NAVER_PLACE_HOSTS.includes(host)) return null;

  const queryId = url.searchParams.get("place") ?? url.searchParams.get("id");
  if (queryId && /^\d+$/.test(queryId)) return queryId;

  const pathMatch = url.pathname.match(/\/[a-zA-Z]+\/(\d+)(?:\/|$)/);
  return pathMatch ? pathMatch[1]! : null;
}

/**
 * 카카오 장소 ID 추출. 받아들이는 형태:
 *   · 숫자만                              "1234567"
 *   · place.map.kakao.com/{id}
 *   · map.kakao.com/link/map/{id}
 *   · map.kakao.com/?itemId={id}
 */
export function parseKakaoPlaceId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "kakao.com" && !host.endsWith(".kakao.com")) return null;

  const queryId = url.searchParams.get("itemId");
  if (queryId && /^\d+$/.test(queryId)) return queryId;

  const pathMatch = url.pathname.match(/\/(\d+)(?:\/|$)/);
  return pathMatch ? pathMatch[1]! : null;
}
