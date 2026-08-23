import type { Metadata } from "next";
import { publicEnv } from "@/shared/config/env";
import { fontClasses } from "@/app/fonts";
import "@/app/globals.css";

/** 어드민 전체는 색인 금지 (docs/ADMIN.md 1장). robots.ts 의 차단과 이중 방어. */
export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  robots: { index: false, follow: false },
};

/**
 * 어드민의 **루트 레이아웃** — 공개 트리와 html 셸을 공유하지 않는다.
 * 공개 쪽은 `(public)/[lang]/layout.tsx` 가 로케일 세그먼트로 정적 렌더되는 반면,
 * 여기는 ko 고정의 어드민 셸이다. 루트 `app/layout.tsx` 를 되살려 합치면
 * 공개 페이지 정적화가 통째로 풀리니 주의.
 *
 * 인증은 여기서 하지 않는다 — `/admin/login` 이 이 레이아웃의 자식이라, 여기서
 * 미인증을 끊으면 로그인 화면까지 같이 잠긴다. 가드는 로그인을 뺀 나머지를 감싸는
 * `(protected)/layout.tsx` 에 있다.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={fontClasses}>
      <body>
        <div className="min-h-dvh bg-neutral-100 text-neutral-900">{children}</div>
      </body>
    </html>
  );
}
