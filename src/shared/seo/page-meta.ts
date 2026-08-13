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

export function siteOrigin(): string {
  return publicEnv.siteUrl.replace(/\/$/, "");
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
  robots,
}: {
  locale: Locale;
  title: string;
  description: string;
  bare: string;
  robots?: Metadata["robots"];
}): Metadata {
  const url = localePath(bare, locale);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      locale: locale === "en" ? "en_US" : "ko_KR",
      alternateLocale: locale === "en" ? ["ko_KR"] : ["en_US"],
    },
    twitter: { card: "summary_large_image" },
    alternates: {
      canonical: url,
      languages: hreflang(bare),
    },
    ...(robots ? { robots } : {}),
  };
}
