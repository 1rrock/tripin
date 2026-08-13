/**
 * 성공 지표(PRODUCT) — 페이지뷰가 아니라 영상·지도 아웃링크 클릭.
 *
 * 분류만 한다. `track()` 호출은 클라이언트 경계(`OutboundA`)에 둔다.
 * 채널 허브의 "유튜브 채널" 링크는 여기 안 넣는다 — 성공 지표는 장소에서
 * 영상/지도로 넘어가는 클릭이다.
 */

export type OutboundKind = "video" | "map";

export function outboundKind(href: string): OutboundKind | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname;

  if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")) {
    if (host === "youtu.be" || path.startsWith("/watch") || path.startsWith("/shorts")) {
      return "video";
    }
    return null;
  }

  if (host === "maps.app.goo.gl" || host === "goo.gl") return "map";
  if ((host === "google.com" || host.endsWith(".google.com")) && path.includes("/maps")) {
    return "map";
  }
  if (host === "place.map.kakao.com" || host.endsWith("map.kakao.com")) return "map";
  if (host === "map.naver.com" || host.endsWith(".map.naver.com")) return "map";

  return null;
}
