import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/shared/lib/admin-auth";

/**
 * 이 요청이 우리 사이트의 폼에서 왔는가.
 *
 * 로그아웃은 CSRF 토큰이 없는 맨 폼 POST 라, 외부 사이트가 숨은 폼으로 강제
 * 로그아웃을 유발할 수 있다. 피해는 "로그인이 풀린다" 뿐이지만 검사는 싸다.
 *
 * 프로토콜이 아니라 **host 를 비교하는** 이유: TLS 를 앞단에서 끊는 배포에서
 * `nextUrl.protocol` 이 http 로 보일 수 있다 — origin 통째로 비교하면 정상
 * 로그아웃이 막힌다. Origin 을 안 붙이는 옛 브라우저는 Referer 로 대신 본다.
 */
function sameSite(request: NextRequest): boolean {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameSite(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
