import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, getAdminSecret, verifyToken } from "@/shared/lib/admin-auth";

/**
 * /admin/* 과 /api/admin/* 보호 (docs/ADMIN.md 1장).
 *
 * 규칙:
 *   · ADMIN_SECRET 미설정 → 프로덕션에서는 전체 404 (빈 비밀번호로 열리는 사고 방지)
 *   · 로그인 경로만 예외 (아니면 리다이렉트 루프)
 *   · 페이지는 로그인으로 redirect, API 는 401 JSON
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const isLoginPath = pathname === "/admin/login" || pathname === "/api/admin/login";

  const secret = getAdminSecret();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // 존재 자체를 숨긴다 — 로그인 경로 포함 전부 404.
      return new NextResponse(null, { status: 404 });
    }
    // 개발 중에는 로그인 페이지가 안내 문구를 띄우도록 통과시킨다.
    if (pathname === "/admin/login") return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "?error=nosecret";
    return NextResponse.redirect(url);
  }

  if (isLoginPath) return NextResponse.next();

  const authed = await verifyToken(secret, request.cookies.get(ADMIN_COOKIE)?.value);
  if (authed) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  // 로그인 후 원래 가려던 곳으로 — 열린 리다이렉트 방지를 위해 pathname 만 넘긴다.
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
