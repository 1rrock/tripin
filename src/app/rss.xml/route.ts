import { loadPlaceFeed } from "@/shared/api/places";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { placePath } from "@/shared/lib/place-path";
import { siteOrigin } from "@/shared/seo/page-meta";

/**
 * RSS 2.0 — 최근 확정된 장소.
 *
 * 왜 사이트맵으로 부족한가: 네이버는 사이트맵을 "있으면 참고하는 목록"으로 다루고,
 * **RSS 를 갱신 신호로 훨씬 적극적으로 쓴다.** 서치어드바이저가 사이트맵과 RSS 를
 * 따로 받는 것도 그래서다. 사이트맵은 1942개 전체 지도이고, 이 피드는 "지난주에
 * 뭐가 새로 생겼나" 한 장이다. 둘은 대체재가 아니다.
 *
 * ko 고정 — 이 피드의 수신자는 네이버이고 x-default 도 ko 다. 로케일별로 두 벌을
 * 만들 이유가 없고, `?l=` 같은 분기를 두면 콘솔에 등록할 주소가 애매해진다.
 *
 * 공개 판정은 `loadPlaceFeed` → `loadHomeMap` 에서 나온다. 사이트맵·`/place/[slug]`
 * 와 **같은 인덱스**라 "피드엔 있는데 열면 404" 가 구조적으로 안 생긴다.
 */

/** 이 라우트만의 캐시 — 로더가 이미 cachePublic 이지만 XML 직렬화까지 CDN 에 앉힌다. */
export const revalidate = 3600;

/**
 * XML 텍스트 이스케이프.
 *
 * ⚠️ 빼먹으면 피드가 통째로 깨진다. 실제 상호명에 `& LOCALS`, `/HEART BREAD
 *    ANTIQUE` 처럼 `&` 로 시작하는 것이 있고, 날 `&` 하나면 파서가 문서 전체를
 *    거부한다. CDATA 로 감싸는 방법도 있지만 본문에 `]]>` 가 섞이면 같은 문제라
 *    이스케이프가 안전하다.
 */
function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS `pubDate` 는 RFC 822 계열을 요구한다 — `toUTCString()` 이 그 형식이다. */
function rfc822(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0).toUTCString() : d.toUTCString();
}

export async function GET(): Promise<Response> {
  const site = siteOrigin();
  const m = getDictionary("ko");
  const items = await loadPlaceFeed();

  const body = items
    .map((it) => {
      const url = `${site}${placePath(it.slug)}`;
      const title = `${it.name} — ${it.cityName} ${m.placeTypes[it.placeType]}`;
      return [
        "    <item>",
        `      <title>${xml(title)}</title>`,
        `      <link>${xml(url)}</link>`,
        /* guid 는 URL 과 같게 두고 isPermaLink 를 명시한다 — 리더가 중복 판정을
           할 때 링크를 그대로 열쇠로 쓴다. */
        `      <guid isPermaLink="true">${xml(url)}</guid>`,
        `      <pubDate>${rfc822(it.publishedAt)}</pubDate>`,
        `      <category>${xml(m.placeTypes[it.placeType])}</category>`,
        ...(it.description ? [`      <description>${xml(it.description)}</description>`] : []),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  /* lastBuildDate 는 가장 최근 항목의 시각이다 — 지금 시각을 쓰면 내용이 그대로인데도
     매번 "갱신됨"으로 보이고, 사이트맵 lastmod 에서 고친 것과 같은 문제가 된다. */
  const latest = items[0]?.publishedAt;

  const xmlDoc = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${xml(m.brand)}</title>`,
    `    <link>${site}</link>`,
    `    <description>${xml(m.meta.homeDescription)}</description>`,
    "    <language>ko</language>",
    ...(latest ? [`    <lastBuildDate>${rfc822(latest)}</lastBuildDate>`] : []),
    `    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />`,
    body,
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new Response(xmlDoc, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
