"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics 마운트 — 내부 화면을 집계에서 뺀다.
 *
 * `<Analytics />` 를 루트 레이아웃에 그냥 걸면 `/admin` 까지 세어진다. 어드민은
 * 운영자 한 명이 하루에도 몇 번씩 도는 화면이라, 방문자 100명 남짓인 지금 구간에서는
 * **본인 트래픽이 지표를 통째로 흔든다** (실측: 7일간 /admin 계열 7방문 19뷰).
 * robots.ts 가 색인에서 빼는 경로와 같은 목록을 집계에서도 뺀다.
 *
 * ⚠️ 클라이언트 컴포넌트인 이유: `beforeSend` 는 함수 prop 이라 서버 컴포넌트인
 *    `layout.tsx` 에서 직접 넘기면 RSC 직렬화 경계에서 터진다. 이 래퍼가 그 경계다.
 *
 * `null` 을 돌려주면 그 이벤트는 전송되지 않는다. 판단은 **경로만** 보고 한다 —
 * 쿠키·UA 로 사람을 특정하지 않는다(개인정보처리방침).
 */

/** 집계에서 뺄 경로 접두사 — `robots.ts` 의 disallow 와 짝을 맞춰 둘 것.
 *  지워진 라우트는 같이 뺀다: `/hero-concepts` 는 `57bc954` 로 사라졌다. */
const EXCLUDED = ["/admin"];

export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        /* event.url 은 절대 URL. 상대 경로로 파싱이 깨지면 그냥 보낸다 —
           집계를 지우는 쪽이 기본값이면 안 된다. */
        let pathname: string;
        try {
          pathname = new URL(event.url).pathname;
        } catch {
          return event;
        }
        return EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
          ? null
          : event;
      }}
    />
  );
}
