import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE, getAdminSecret, verifyToken } from "@/shared/lib/admin-auth";
import { publicEnv } from "@/shared/config/env";

/**
 * 1) 로케일 → **URL 세그먼트** rewrite. 페이지가 `(public)/[lang]/` 아래 살므로
 *    ko 는 `/city` → `/ko/city` 로 rewrite 하고(주소창은 그대로), en 은 `/en/city` 가
 *    세그먼트와 이미 일치해 그대로 통과한다. 옛 구조(x-tripin-locale 헤더 +
 *    `getLocale()`→`headers()`)는 공개 트리 전체를 요청마다 렌더하게 만들어
 *    Vercel Active CPU 를 소진했다 — 헤더 방식으로 되돌리지 마라.
 * 2) `/` 첫 진입 시 Accept-Language 로 언어 판정 → 한국어가 아니면 /en 으로
 * 3) /admin/* · /api/admin/* 보호 (docs/ADMIN.md 1장)
 *
 * 기본 로케일(ko)은 URL 접두사 없음 — 기존 링크 유지. 내부 세그먼트 `/ko/*` 가
 * 밖에서 직접 들어오면 bare 경로로 308 — 같은 문서가 두 URL 로 색인되는 것을 막는다.
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

function rewriteTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(url);
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

/**
 * 퍼센트 이스케이프가 깨진 경로 → 500 대신 404.
 *
 * Next 는 **params 해석 단계**에서 세그먼트를 디코딩한다. 거기서 터지면 페이지
 * 코드가 한 줄도 돌기 전에 죽어서 크롬 없는 평문 `Internal Server Error` 가 나갔다
 * (`/place/%`, `/place/%zz`, `/city/%`, `/c/%` 전부 500). 페이지 안의 try/catch 는
 * 그래서 한 번도 실행되지 않는다 — 프록시가 params 해석보다 앞이라 이 자리만이
 * 유일한 방어선이다.
 *
 * 크롤러·스캐너가 실제로 만들어 보내고, 장소 slug 에 한글이 많아(`/place/일등집-ej1r`)
 * 퍼센트 인코딩된 링크가 중간에서 한 번만 잘려도 사람이 여기로 온다.
 *
 * 빈 404 를 돌려주지 않고 **디자인된 404 화면**으로 rewrite 한다(주소창은 그대로).
 * `/type/*` 를 고르는 이유: `parsePlaceType()` 이 닫힌 열거형이라 이 세그먼트는
 * DB 왕복 없이 곧장 `notFound()` 로 떨어지는, 트리에서 가장 싼 경로다.
 * (그 라우트의 존재 판정은 `type/[type]/layout.tsx` — 스트리밍 경계 **위** 라
 * 상태 코드가 제대로 404 로 나간다.)
 */
const NOT_FOUND_SEGMENT = "/type/__not-found__";

function isDecodable(pathname: string): boolean {
  try {
    decodeURIComponent(pathname);
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* 깨진 이스케이프는 무엇보다 **먼저** 걸러낸다 — 아래 어느 분기로 흘러가도
     결국 params 해석에서 같은 500 이 난다. */
  if (!isDecodable(pathname)) {
    const lang = pathname === "/en" || pathname.startsWith("/en/") ? "/en" : "/ko";
    return rewriteTo(request, `${lang}${NOT_FOUND_SEGMENT}`);
  }

  /* 어드민 인증은 **무엇보다 먼저** 판정한다(깨진 이스케이프 다음).
     아래 정적 자산 분기의 `pathname.includes(".")` 가 이 위에 있던 시절,
     경로 어디에든 점 하나만 있으면 `/admin/**` 이 인증을 통째로 건너뛰었다.
     그 규칙의 의도는 "정적 자산 통과"이지 "인증 면제"가 아니다 — 지금은 admin
     하위에 확정 라우트로 이어지는 dynamic 세그먼트가 `place/[id]`(UUID) 하나뿐이라
     전부 404 로 떨어지지만, 라우트가 하나만 더 생기면 그날로 무인증 노출이다.
     matcher 쪽에도 같은 구멍이 있었다 — `config.matcher` 주석 참조.

     ⚠️ 세그먼트 경계(`===` 또는 `/` 로 끝나는 접두사)를 반드시 붙인다. 맨 `startsWith`
     는 `/administrator`·`/admin-panel` 까지 잡아 `/admin/login` 으로 307 을 쏘는데,
     그건 `(protected)/layout.tsx` 가 401 대신 404 로 "어드민의 존재 자체를 숨긴" 설계를
     앞단에서 광고해 버리는 짓이다. 경계가 붙어 있으면 그런 경로는 평범한 404 로 간다. */
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  ) {
    return protectAdmin(request);
  }

  // 정적 자산과 루트 메타데이터 파일 규약(점 없는 URL — og 이미지·앱 아이콘)은
  // [lang] 트리 밖에 산다 — ko rewrite 에 휩쓸리면 404 가 된다.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/opengraph-image" ||
    pathname === "/twitter-image" ||
    pathname === "/apple-icon" ||
    pathname === "/icon" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  /* 구글에서 돌아오는 자리는 통째로 비켜준다.
     여기서 refreshSession() 을 돌리면 리프레시 토큰이 한 번 회전하는데,
     라우트 핸들러는 그 회전 이전의 쿠키를 들고 exchangeCodeForSession 을 부른다.
     둘이 어긋나면 교환이 실패하고, 증상은 "로그인이 가끔 안 됨" 으로만 보인다.
     로케일도 필요 없다 — 이 라우트는 화면을 그리지 않고 redirect 만 한다. */
  if (pathname.startsWith("/auth/")) {
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

  /* 내부 세그먼트가 밖으로 새면 정규 URL 로 돌려보낸다 — `/ko/city` 와 `/city` 가
     같은 문서로 둘 다 색인되는 것을 막는다. rewrite 만 있으면 생기지 않지만,
     내부 경로가 어딘가(로그·복사된 링크)로 새는 날을 대비한 안전판. */
  if (pathname === "/ko" || pathname.startsWith("/ko/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/ko" ? "/" : pathname.slice(3);
    return attach(NextResponse.redirect(url, 308));
  }

  // EN: `/en/*` 은 [lang] 세그먼트와 이미 일치 — rewrite 없이 통과.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return attach(NextResponse.next());
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

  // KO: 접두사 없는 경로 → `/ko/*` 세그먼트로 rewrite (주소창은 그대로).
  return attach(rewriteTo(request, pathname === "/" ? "/ko" : `/ko${pathname}`));
}

export const config = {
  matcher: [
    /*
     * ⚠️ 어드민은 **점 제외 규칙 밖**에 따로 세운다. 예전에는 아래 공개 패턴
     *    하나뿐이었는데, 그 안의 `.*\..*` 부정 전방탐색은 경로 **어디에든** 점이
     *    있으면 proxy 를 통째로 건너뛴다 — `/admin/x.y` 가 인증 없이 통과했다는 뜻이다.
     *    "정적 자산은 비켜준다" 는 의도였지 "인증을 면제한다" 가 아니었다.
     *
     *    지금 당장 뚫리지는 않는다(admin 하위 dynamic 세그먼트가 UUID 를 받는
     *    `place/[id]` 하나뿐이라 점 있는 경로는 전부 404 로 떨어진다). 하지만 어드민
     *    **읽기** 경로의 방어선이 여기 하나뿐이고, 라우트가 하나만 더 늘면 그날로
     *    무인증 노출이다. 조건이 안 붙은 패턴으로 못박아 둔다.
     *
     *    `:path*` 는 빈 세그먼트도 먹어서 `/admin/:path*` 하나로 `/admin` 까지
     *    잡힌다(path-to-regexp 로 확인: `/^\/admin(?:\/(...))?[\/#\?]?$/i`).
     *    그래도 루트를 따로 적는다 — 이 줄이 지켜야 할 건 어드민 대시보드 루트이고,
     *    그게 수량자 기본값에 딸려 오는 부수 효과로 남아 있어선 안 된다.
     */
    "/admin",
    "/admin/:path*",
    "/api/admin",
    "/api/admin/:path*",
    /*
     * 공개 트리 — 정적 파일·이미지 제외. 공개 페이지 + en 접두사.
     * 점 제외는 **여기에만** 남는다. 루트 메타데이터 파일 규약(`/opengraph-image`,
     * `/apple-icon`, `/icon` 등 점 없는 URL)과 `_next` 자산은 지금처럼 통과해야
     * 한다 — 되돌리면 아이콘·OG 이미지가 404 가 된다.
     */
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
