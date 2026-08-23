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
          /* 지금 **강제**해도 안전한 세 가지만 건다. 나머지는 아래 Report-Only.
             - object-src: 이 사이트에 플러그인 콘텐츠가 없다
             - base-uri: <base> 주입으로 상대 URL 을 통째로 납치하는 수법 차단
             - frame-ancestors: X-Frame-Options 의 CSP 판(둘 다 두는 게 맞다) */
          {
            key: "Content-Security-Policy",
            value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
          },
          /* script-src 는 **아직 강제하지 않는다.**
             공개 페이지가 ISR/정적이라 nonce 를 못 쓴다(nonce 는 요청마다 달라야
             하므로 동적 렌더를 강제한다 — 그게 바로 2026-08 Active CPU 초과의
             원인이었다). 그래서 'unsafe-inline' 없이는 하이드레이션 스크립트가
             막히고, 'unsafe-inline' 을 넣으면 script-src 의 의미가 대부분 사라진다.
             먼저 Report-Only 로 올려 실제 위반을 모은 뒤 강제로 옮긴다.
             report-to 엔드포인트를 붙이면 그때부터 리포트가 쌓인다. */
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              // Maps 로더와 Next 하이드레이션 인라인 스크립트
              "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://va.vercel-scripts.com",
              // Tailwind/인라인 style 속성 + Maps 가 심는 스타일
              "style-src 'self' 'unsafe-inline'",
              // 유튜브 썸네일·채널 아바타·지도 타일
              "img-src 'self' data: blob: https://i.ytimg.com https://yt3.googleusercontent.com https://*.googleapis.com https://*.gstatic.com",
              "font-src 'self' data:",
              // Supabase(REST·Realtime)·Maps·Analytics
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://va.vercel-scripts.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
