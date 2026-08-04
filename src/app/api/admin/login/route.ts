import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  TOKEN_TTL_SEC,
  createToken,
  getAdminSecret,
  passwordMatches,
} from "@/shared/lib/admin-auth";

/**
 * 로그인 — HTML form POST (JS 없이 동작).
 * 실패 제한: IP 당 5회 실패 → 60초 잠금 (docs/ADMIN.md 1장).
 * 메모리 카운터라 서버리스 다중 인스턴스에선 느슨해지지만, 1인 어드민에는 충분하다.
 */
const FAIL_LIMIT = 5;
const LOCK_MS = 60_000;
const fails = new Map<string, { count: number; lockedUntil: number }>();

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

function backToLogin(request: NextRequest, error: string, next: string | null) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?error=${error}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const secret = getAdminSecret();
  if (!secret) {
    // 프로덕션은 proxy 가 이미 404 로 막는다. 여기 도달하면 개발 환경.
    return backToLogin(request, "nosecret", null);
  }

  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const rawNext = String(form.get("next") ?? "");
  // 열린 리다이렉트 방지 — /admin 내부 경로만 허용
  const next = rawNext.startsWith("/admin") && !rawNext.startsWith("//") ? rawNext : "/admin";

  const ip = clientIp(request);
  const record = fails.get(ip);
  const now = Date.now();

  if (record && record.lockedUntil > now) {
    return backToLogin(request, "locked", next);
  }

  if (!(await passwordMatches(secret, password))) {
    const count = (record?.count ?? 0) + 1;
    fails.set(ip, {
      count,
      lockedUntil: count >= FAIL_LIMIT ? now + LOCK_MS : 0,
    });
    return backToLogin(request, count >= FAIL_LIMIT ? "locked" : "wrong", next);
  }

  fails.delete(ip);

  const url = request.nextUrl.clone();
  url.pathname = next;
  url.search = "";
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(ADMIN_COOKIE, await createToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SEC,
  });
  return response;
}
