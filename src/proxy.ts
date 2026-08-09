import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, getAdminSecret, verifyToken } from "@/shared/lib/admin-auth";
import { LOCALE_HEADER } from "@/shared/i18n/paths";

/**
 * 1) /en/* → 내부 경로 rewrite + x-tripin-locale
 * 2) /admin/* · /api/admin/* 보호 (docs/ADMIN.md 1장)
 *
 * 기본 로케일(ko)은 URL 접두사 없음 — 기존 링크 유지.
 */

function withLocale(request: NextRequest, locale: "ko" | "en", rewritePath?: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  if (rewritePath !== undefined) {
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

async function protectAdmin(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const isLoginPath = pathname === "/admin/login" || pathname === "/api/admin/login";

  const secret = getAdminSecret();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(null, { status: 404 });
    }
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
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적·API(어드민 제외)는 로케일 헤더만 필요한 경우 없음
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return protectAdmin(request);
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // EN: /en → / , /en/city → /city
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const bare = pathname === "/en" ? "/" : pathname.slice(3) || "/";
    return withLocale(request, "en", bare);
  }

  return withLocale(request, "ko");
}

export const config = {
  matcher: [
    /*
     * 정적 파일·이미지 제외. admin + 공개 페이지 + en 접두사.
     */
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
