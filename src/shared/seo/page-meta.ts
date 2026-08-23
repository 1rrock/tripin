import type { Metadata } from "next";
import { publicEnv } from "@/shared/config/env";
import type { Locale } from "@/shared/i18n/config";
import { localePath } from "@/shared/i18n/paths";

/**
 * 공개 페이지 공통 메타 — canonical · hreflang(+x-default) · OG.
 *
 * 페이지마다 이걸 손수 짜면 `x-default` 가 빠지거나 EN 페이지 OG 가
 * 루트 폴백(한국어)으로 남는 일이 생긴다. 경로(`bare`)만 넘기면 짝이 맞는다.
 */

/** `<head>` 의 RSS 자동발견 항목. 루트 레이아웃과 `publicMeta` 가 같은 값을 쓴다. */
export const RSS_ALTERNATE = {
  "application/rss+xml": [{ url: "/rss.xml", title: "Eatripin" }],
};

export function siteOrigin(): string {
  return publicEnv.siteUrl.replace(/\/$/, "");
}

/**
 * OG 이미지 라우트 표 — `bare` 패턴 → Next 가 실제로 등록하는 라우트 접미사.
 *
 * `opengraph-image.tsx` 는 `(public)`·`(home)`·`(hub)` 같은 라우트 그룹 아래 있으면
 * Next 가 충돌 방지용 해시를 파일명에 붙인다(`opengraph-image-xxxxxx`, 그룹 자신은
 * URL 에 안 남지만 파일명 해시 계산에는 원문 그대로 들어간다). 그리고 Next 의
 * 자동 파일-규약 해석은 **실제로 렌더된 세그먼트**(`lang=ko`)를 그대로 물어
 * `/ko/place/…` 를 내보낸다 — `/ko/*` 는 프록시가 bare 경로로 308 리다이렉트하는
 * 그 대상이라 여분의 홉이 생긴다(§AUDIT-2026-08-23).
 *
 * 그래서 여기서 URL 을 직접 조립해 `openGraph.images` 를 명시적으로 채운다 —
 * Next 는 페이지 메타데이터가 `images` 를 이미 갖고 있으면 파일-규약 값을
 * 덮어쓰지 않는다(`mergeStaticMetadata`). 접미사는 다음 6글자 값이 next@16.2.12
 * 기준 djb2(부모 경로) 를 격리된 스크래치 빌드로 실측한 **고정값**이다. Next 를
 * 올리면 알고리즘이 바뀔 수 있으니 그때 다시 실측해야 한다 — `opengraph-image.tsx`
 * 를 새로 추가·이동할 때도 마찬가지다.
 *
 * 캐시버스팅 해시 쿼리(`?<contenthash>`)는 일부러 뺐다 — 라우트 매칭에는 필요
 * 없고(쿼리는 경로 매칭에 안 쓰인다), 재배포마다 값이 바뀌는 컨텐츠 해시라
 * 여기서 예측할 수 없다. 대가로 크롤러 캐시가 재배포 직후 몇 시간 묵을 수
 * 있는데, `revalidate = 3600` 과 같은 자릿수라 감수한다.
 */
const OG_IMAGE_ROUTES: readonly { test: RegExp; suffix: string }[] = [
  { test: /^\/$/, suffix: "opengraph-image-7yps7q" }, // (home)
  { test: /^\/map$/, suffix: "opengraph-image-422abe" },
  { test: /^\/celebs$/, suffix: "opengraph-image-1a38ns" },
  { test: /^\/channels$/, suffix: "opengraph-image-ubdiqw" },
  { test: /^\/place\/[^/]+$/, suffix: "opengraph-image-1saca2" },
  { test: /^\/city\/[^/]+$/, suffix: "opengraph-image-1cpq2c" },
  { test: /^\/type\/[^/]+$/, suffix: "opengraph-image-111uiw" },
  // 채널×도시(조각)보다 먼저 걸어야 한다 — /v/[videoId] 뒤 세그먼트가 남아 있어
  // 조각 패턴과는 애초에 안 겹치지만, 순서를 명시해 둔다.
  { test: /^\/c\/[^/]+\/v\/[^/]+$/, suffix: "opengraph-image-kn0pgm" },
  { test: /^\/c\/[^/]+\/[^/]+$/, suffix: "opengraph-image-19zkwt" }, // (hub) 아래 [city] 조각
  { test: /^\/c\/[^/]+$/, suffix: "opengraph-image-1dwi5a" }, // (hub)
];

/** 이 페이지 전용 og-image 라우트가 있으면 로케일 접두사 없는(ko) 절대 URL, 없으면 null. */
function ogImageUrl(bare: string, locale: Locale): string | null {
  const route = OG_IMAGE_ROUTES.find((r) => r.test.test(bare));
  if (!route) return null;
  const prefix = locale === "en" ? "/en" : "";
  const path = bare === "/" ? "" : bare;
  return `${siteOrigin()}${prefix}${path}/${route.suffix}`;
}

export function absoluteUrl(bare: string, locale: Locale): string {
  return `${siteOrigin()}${localePath(bare, locale)}`;
}

/** 페이지 `alternates.languages` — 상대 경로. Next 가 metadataBase 로 절대화한다. */
export function hreflang(bare: string): Record<string, string> {
  return {
    ko: localePath(bare, "ko"),
    en: localePath(bare, "en"),
    "x-default": localePath(bare, "ko"),
  };
}

/** 사이트맵용 절대 URL 짝. */
export function sitemapLanguages(base: string, bare: string): Record<string, string> {
  return {
    ko: `${base}${localePath(bare, "ko")}`,
    en: `${base}${localePath(bare, "en")}`,
    "x-default": `${base}${localePath(bare, "ko")}`,
  };
}

export function publicMeta({
  locale,
  title,
  description,
  bare,
  canonicalBare,
  robots,
}: {
  locale: Locale;
  title: string;
  description: string;
  bare: string;
  /** 이 문서의 링크 신호를 몰아줄 다른 경로 — 영상 페이지가 조각 페이지를 가리킬 때 쓴다.
      canonical 만 바꾸고 hreflang 을 자기 자신으로 두면 신호가 서로 싸우므로 짝으로 바꾼다. */
  canonicalBare?: string;
  robots?: Metadata["robots"];
}): Metadata {
  const canonical = localePath(canonicalBare ?? bare, locale);
  // 이미지는 canonicalBare 가 아니라 이 문서 자신의 bare 를 쓴다 — 영상 페이지가
  // 조각으로 canonical 을 몰아줘도, 카드 자체는 그 영상의 썸네일이어야 맞다.
  const image = ogImageUrl(bare, locale);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      locale: locale === "en" ? "en_US" : "ko_KR",
      alternateLocale: locale === "en" ? ["ko_KR"] : ["en_US"],
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: { card: "summary_large_image" },
    alternates: {
      canonical,
      languages: hreflang(canonicalBare ?? bare),
      /* RSS 자동발견 — 루트 레이아웃에도 같은 선언이 있지만, Next 는 하위에서
         `alternates` 를 주면 **객체를 통째로 교체**한다. 공개 페이지는 전부 이
         함수를 거치므로 여기에 없으면 사이트 어디에도 <link rel="alternate"
         type="application/rss+xml"> 이 안 나간다(실제로 그 상태였다). */
      types: RSS_ALTERNATE,
    },
    ...(robots ? { robots } : {}),
  };
}
