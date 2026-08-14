import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE, getAdminSecret, verifyToken } from "@/shared/lib/admin-auth";
import { LOCALE_HEADER } from "@/shared/i18n/paths";
import { publicEnv } from "@/shared/config/env";

/**
 * 1) /en/* → 내부 경로 rewrite + x-tripin-locale
 * 2) `/` 첫 진입 시 Accept-Language 로 언어 판정 → 한국어가 아니면 /en 으로
 * 3) /admin/* · /api/admin/* 보호 (docs/ADMIN.md 1장)
 *
 * 기본 로케일(ko)은 URL 접두사 없음 — 기존 링크 유지.
 */

/**
 * Accept-Language 를 q 내림차순으로 훑어 ko/en 중 **먼저 걸리는 것**.
 *
 * · 헤더가 아예 없으면 null → ko 로 둔다. 크롤러가 대개 안 보내는데, 여기서 /en 으로
 *   튕기면 한국어 홈(`/`)이 색인에서 밀린다. 주 독자가 한국어라 그게 제일 아프다.
 * · ko·en 둘 다 없으면(일본어 등) "다른 언어면 영어" 규칙대로 en.
 */
function preferredLocale(raw: string | null): "ko" | "en" | null {
  if (!raw) return null;
  const ranked = raw
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      // q 가 깨져 있으면 NaN → 아래 필터에서 떨어진다
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) : 1 };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q); // ES2019+ 안정 정렬 — 같은 q 는 원래 순서를 지킨다
  for (const { tag } of ranked) {
    if (tag === "ko" || tag.startsWith("ko-")) return "ko";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return "en";
}

/**
 * 주소창·북마크·외부 링크로 들어온 **첫 진입**인가.
 *
 * 쿠키를 쓰지 않는 이유: 개인정보처리방침이 "언어 설정을 쿠키에 저장하지 않는다"고
 * 명시한다. 대신 Fetch Metadata 로 사이트 안 이동을 걸러낸다 — 이게 없으면 영어
 * 브라우저 사용자가 푸터에서 한국어로 바꾼 뒤 홈으로 돌아갈 때마다 /en 으로 튕긴다.
 * Sec-Fetch-* 를 안 보내는 옛 브라우저는 Referer 로 대신 본다.
 */
function isDirectEntry(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site !== "same-origin" && site !== "same-site";
  const referer = request.headers.get("referer");
  if (!referer) return true;
  try {
    return new URL(referer).origin !== request.nextUrl.origin;
  } catch {
    return true;
  }
}

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

/**
 * 로그인한(익명 포함) 유저의 세션 토큰을 갱신한다.
 *
 * ⚠️ 세션 쿠키가 **있을 때만** 돈다. 이 가드가 핵심이다 —
 *    getUser() 는 Supabase 로 네트워크 왕복을 한다. 가드 없이 걸면 검색 유입
 *    비로그인 방문자(주 트래픽)마다 왕복이 하나씩 붙는다. 저장 한 번 안 한
 *    사람에게 그 비용을 물릴 이유가 없다.
 *
 * 갱신된 토큰은 두 곳에 쓴다:
 *   · request.cookies — 이 요청의 서버 컴포넌트가 새 토큰을 보게
 *   · 반환 배열 → 응답 쿠키 — 브라우저가 새 토큰을 갖게
 *
 * 서버 컴포넌트는 쿠키를 못 쓰기 때문에(`supabase-server.ts` 참조) 토큰 갱신은
 * 결국 여기서만 일어난다. 이 함수를 지우면 세션이 1시간 뒤 조용히 죽는다.
 */
async function refreshSession(request: NextRequest) {
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasSession) return [];

  const pending: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const sb = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) {
          request.cookies.set(name, value);
          pending.push({ name, value, options });
        }
      },
    },
  });

  // 토큰이 만료됐으면 여기서 갱신된다. 결과값 자체는 쓰지 않는다.
  await sb.auth.getUser();

  return pending;
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

  /* 세션 갱신은 로케일 판정보다 **먼저** 한다 — withLocale 이 request.headers 를
     복사해 내려보내므로, 갱신된 쿠키가 그 복사 전에 request 에 실려 있어야
     이 요청의 서버 컴포넌트가 새 토큰을 본다. */
  const refreshed = await refreshSession(request);
  const attach = (res: NextResponse) => {
    for (const { name, value, options } of refreshed) res.cookies.set(name, value, options);
    return res;
  };

  // EN: /en → / , /en/city → /city
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const bare = pathname === "/en" ? "/" : pathname.slice(3) || "/";
    return attach(withLocale(request, "en", bare));
  }

  /* 언어 감지는 홈 첫 진입에서만 한다. 하위 경로까지 걸면 검색 결과로 들어온
     `/city/tokyo` 같은 URL 이 통째로 /en 으로 튕겨 공유 링크가 언어를 잃는다. */
  if (pathname === "/" && isDirectEntry(request)) {
    if (preferredLocale(request.headers.get("accept-language")) === "en") {
      const url = request.nextUrl.clone();
      url.pathname = "/en";
      const res = NextResponse.redirect(url, 307);
      res.headers.set("Vary", "Accept-Language, Sec-Fetch-Site");
      return attach(res);
    }
  }

  /* 통과 응답에는 Vary 를 안 건다 — NextResponse.next() 의 헤더는 뒤이어 오는 페이지
     응답이 덮어써서 실제로 안 나간다(확인함). 리다이렉트 쪽에만 붙어 있으면 되고,
     공개 페이지는 전부 동적(ƒ)이라 CDN 이 언어를 섞어 캐시할 여지도 없다. */
  return attach(withLocale(request, "ko"));
}

export const config = {
  matcher: [
    /*
     * 정적 파일·이미지 제외. admin + 공개 페이지 + en 접두사.
     */
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
