import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ADMIN_COOKIE, getAdminSecret, verifyToken } from "@/shared/lib/admin-auth";

/**
 * 어드민 **화면**의 인증 가드 — proxy.ts 와의 이중 방어.
 *
 * 서버 액션은 `requireAdmin()` 이 각자 막지만, 페이지 렌더 경로에는 그동안
 * proxy(middleware)뿐이었다. matcher 회귀·`config` 오타·미들웨어 우회 취약점 중
 * 하나만 터지면 장소 DB·신청자 이메일·삭제요청자 연락처가 무인증으로 열린다.
 * 여기가 그 뒷단이다.
 *
 * `(protected)` 라우트 그룹인 이유: `/admin/login` 은 이 그룹 **밖**(`admin/login/`)에
 * 있어서 이 레이아웃을 거치지 않는다. 로그인만 열어 두고 나머지를 전부 잠근다.
 * 그룹 괄호는 URL 에 나타나지 않으므로 경로는 예전 그대로다.
 *
 * 404 로 끊는 이유: 401/403 은 "여기 어드민이 있다"를 알려준다. 어드민의 존재
 * 자체를 숨긴다(시크릿 미설정 시 proxy 가 프로덕션에서 404 를 주는 것과 같은 결).
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const secret = getAdminSecret();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const authed = secret ? await verifyToken(secret, token) : false;
  if (!authed) notFound();

  return (
    <>
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
      {children}
    </>
  );
}
