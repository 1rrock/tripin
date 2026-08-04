import type { MetadataRoute } from "next";

/**
 * /admin 과 /api 는 색인 금지 (docs/ADMIN.md 1장).
 * 어드민 페이지의 metadata.robots(noindex)와 이중 방어.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/admin", "/api"],
      },
    ],
  };
}
