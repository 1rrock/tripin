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
        {/* 좁은 폭에서 **내비만** 가로로 흐르게 한다.
            예전에는 브랜드 + 링크 8개 + 로그아웃이 `flex-wrap` 도 `overflow-x-auto`
            도 없이 한 줄에 강제됐다. 필요 폭을 재면 ~760px 인데, 이 트리에는
            `html`/`body` 전역 `overflow-x:hidden` 이 없어서 390px 화면에서는
            **문서 전체**가 가로로 늘어나고 오른쪽 끝 로그아웃이 밖으로 밀렸다.
            운영자가 폰으로 삭제요청 큐를 볼 때 인증 직후 바로 부딪히는 자리다.

            브랜드와 로그아웃은 `shrink-0` 으로 양 끝에 못박고, 가운데 내비가
            줄어들며(`min-w-0`) 넘치는 만큼만 스크롤을 받는다. 데스크톱(≥1024)
            에서는 폭이 남아 스크롤이 아예 생기지 않으므로 지금 화면 그대로다. */}
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/admin" className="shrink-0 text-sm font-bold tracking-tight">
              Eatripin 어드민
            </Link>
            <nav className="no-scrollbar flex min-w-0 items-center gap-3 overflow-x-auto text-sm whitespace-nowrap text-neutral-600">
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
          <form method="post" action="/api/admin/logout" className="shrink-0">
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
