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

/**
 * 실패 잠금의 키. **클라이언트가 못 바꾸는 값이어야 한다.**
 *
 * `x-forwarded-for` 의 맨 **왼쪽**은 클라이언트가 직접 보낸 값이라, 매 요청마다
 * 다른 값을 넣으면 카운터가 매번 새 키로 갈려서 잠금이 영영 안 걸린다
 * (= ADMIN_SECRET 무제한 추측. 이 값은 비밀번호이자 HMAC 서명 키다).
 * 그래서 가장 가까운 프록시가 직접 붙인 맨 **오른쪽**을 쓴다 — 위조가 불가능한 유일한 칸.
 * Vercel 이 넣어주는 x-real-ip · x-vercel-forwarded-for 가 있으면 그게 더 정확하다.
 */
function clientIp(request: NextRequest): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const vercel = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercel) return vercel;

  const chain = request.headers.get("x-forwarded-for")?.split(",") ?? [];
  return chain[chain.length - 1]?.trim() || "local";
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

  /* 폼이 아닌 본문(예: JSON content-type)으로 POST 하면 formData() 가 TypeError 를
     던진다. 안 잡으면 본문 없는 500 이 나간다 — 스캐너가 실제로 보내는 요청이다.
     프록시가 깨진 이스케이프에 한 것과 같은 방침: 500 을 의미 있는 상태로 바꾼다. */
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return backToLogin(request, "badrequest", null);
  }

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
    // 프로덕션은 항상 https 라 무조건 true 로 둬도 되지만, 로컬 개발은 `next dev` 를
    // LAN IP(예: 192.168.x.x)로 열어 다른 기기에서 접속하는 경우가 있다 — 그런 오리진은
    // "potentially trustworthy" 가 아니라서 Secure 쿠키가 저장되지 않는다(로그인 후
    // 바로 튕겨나가는 증상). http://localhost 자체는 최신 브라우저가 예외로 봐주지만,
    // 모든 개발 접속 경로를 보장할 수 없어 프로덕션에서만 켠다.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SEC,
  });
  return response;
}
