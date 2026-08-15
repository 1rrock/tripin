import type { MetadataRoute } from "next";
import { publicEnv } from "@/shared/config/env";

/**
 * /admin 과 /api 는 색인 금지 (docs/ADMIN.md 1장).
 * 어드민 페이지의 metadata.robots(noindex)와 이중 방어.
 *
 * 사이트맵은 공개 게이트(MIN_CONFIRMED_PINS)를 통과한 조각만 싣는다 —
 * 페이지가 noindex 하는 것을 사이트맵이 광고하면 신호가 엇갈린다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/admin", "/api", "/hero-concepts"],
      },
    ],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}
