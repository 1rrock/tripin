import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, getAdminSecret, verifyToken } from "@/shared/lib/admin-auth";
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
 * 여기는 cookies() 를 읽는 동적 트리다(ko 고정). 루트 `app/layout.tsx` 를 되살려
 * 합치면 공개 페이지 정적화가 통째로 풀리니 주의.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 로그인 페이지에는 헤더를 띄우지 않는다 — 인증 여부로 판단.
  const secret = getAdminSecret();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const authed = secret ? await verifyToken(secret, token) : false;

  return (
    <html lang="ko" className={fontClasses}>
      <body>
        <div className="min-h-dvh bg-neutral-100 text-neutral-900">
      {authed ? (
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
            <div className="flex items-center gap-5">
              <Link href="/admin" className="text-sm font-bold tracking-tight">
                Eatripin 어드민
              </Link>
              <nav className="flex items-center gap-3 text-sm text-neutral-600">
                <Link href="/admin/places" className="transition hover:text-neutral-900">
                  장소
                </Link>
                <Link href="/admin/pieces" className="transition hover:text-neutral-900">
                  조각
                </Link>
                <Link href="/admin/confirm" className="transition hover:text-neutral-900">
                  손입력
                </Link>
                <Link href="/admin/translations" className="transition hover:text-neutral-900">
                  번역 검수
                </Link>
                <Link href="/admin/queue" className="transition hover:text-neutral-900">
                  삭제 요청
                </Link>
                <Link href="/admin/applications" className="transition hover:text-neutral-900">
                  채널 신청
                </Link>
                <Link href="/admin/search-misses" className="transition hover:text-neutral-900">
                  검색 실패어
                </Link>
                <Link
                  href="/"
                  target="_blank"
                  className="text-neutral-400 transition hover:text-neutral-900"
                >
                  공개 사이트 ↗
                </Link>
              </nav>
            </div>
            <form method="post" action="/api/admin/logout">
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                로그아웃
              </button>
            </form>
          </div>
        </header>
          ) : null}
          {children}
        </div>
      </body>
    </html>
  );
}
