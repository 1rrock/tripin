import type { MetadataRoute } from "next";
import { publicEnv } from "@/shared/config/env";

/**
 * /admin 과 /api 는 색인 금지. 어드민 페이지의 metadata.robots(noindex)와 이중 방어.
 *
 * 사이트맵은 공개 게이트(MIN_CONFIRMED_PINS)를 통과한 조각만 싣는다 —
 * 페이지가 noindex 하는 것을 사이트맵이 광고하면 신호가 엇갈린다.
 *
 * ⚠️ ko 는 접두사가 없고 en 은 `/en/*` 이다(proxy.ts). 즉 같은 화면이 두 경로로
 *    존재하므로 **막을 때는 양쪽을 다 적어야 한다.** `/login` 만 적으면
 *    `/en/login` 이 그대로 열린 채 남는다.
 */
/** 로케일 트리 **밖**이라 `/en` 짝이 없다 — proxy 가 로케일 판정보다 먼저 가로챈다 */
const OUTSIDE_LOCALE = ["/admin", "/api"];
/** `(public)/[lang]/` 안의 화면 — ko(무접두사)와 en 두 경로로 존재한다 */
const IN_LOCALE = ["/hero-concepts", "/login"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [...OUTSIDE_LOCALE, ...IN_LOCALE, ...IN_LOCALE.map((p) => `/en${p}`)],
      },
    ],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}
