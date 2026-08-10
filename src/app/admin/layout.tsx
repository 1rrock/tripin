import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, getAdminSecret, verifyToken } from "@/shared/lib/admin-auth";

/** 어드민 전체는 색인 금지 (docs/ADMIN.md 1장). robots.ts 의 차단과 이중 방어. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 로그인 페이지에는 헤더를 띄우지 않는다 — 인증 여부로 판단.
  const secret = getAdminSecret();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const authed = secret ? await verifyToken(secret, token) : false;

  return (
    <div className="min-h-dvh bg-neutral-100 text-neutral-900">
      {authed ? (
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
            <div className="flex items-center gap-5">
              <Link href="/admin" className="text-sm font-bold tracking-tight">
                Greatripin 어드민
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
  );
}
