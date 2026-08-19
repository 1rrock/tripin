import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* supabase 클라이언트는 서버 번들에 인라인하지 않는다 — 콜드스타트 번들 축소 */
  serverExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"],
  experimental: {
    /* phosphor 는 수백 아이콘 재수출 패키지 — 쓰는 것만 골라 담게 한다 */
    optimizePackageImports: ["@phosphor-icons/react"],
    /* 공개 라우트가 전부 dynamic(getLocale)이라 기본 staleTime=0 이면
       prefetch 가 즉시 폐기되고, 탭마다 서버 RSC 를 다시 기다려 1~2초 멈춘다. */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          /* MIME 스니핑 차단 — 업로드/프록시 응답을 브라우저가 멋대로 실행형으로
             재해석하지 못하게 한다 */
          { key: "X-Content-Type-Options", value: "nosniff" },
          /* 외부로 나가는 링크(유튜브·지도)가 본업이다 — 전체 URL 대신 origin 만
             남겨 쿼리의 필터 상태가 제3자 로그에 실리지 않게 한다 */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          /* 이 사이트를 iframe 에 품을 정당한 곳이 없다 — 클릭재킹 차단 */
          { key: "X-Frame-Options", value: "DENY" },
          /* 쓰지 않는 강력 권한은 명시적으로 끈다. geolocation 은 지도 "현재 위치"가
             쓰므로 self 로 남긴다 */
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
