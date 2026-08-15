import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { mergeAnonymousInto, isUserId } from "@/shared/api/account-merge";
import { isLinkedUser } from "@/shared/api/auth-user";
import { publicEnv } from "@/shared/config/env";

/**
 * 구글에서 돌아오는 자리.
 *
 * 이 라우트가 없으면 로그인은 **되는데 안 된 것처럼 보인다.** 이유가 미묘하다:
 *
 *   `createBrowserClient` 는 flowType 이 pkce 이고 detectSessionInUrl 이 켜져 있어서
 *   (@supabase/ssr `createBrowserClient.js:40-42`) `?code=` 를 스스로 교환하기는 한다.
 *   그런데 그 교환은 `_initialize()` 안에서, 즉 **하이드레이션 뒤에** 일어난다.
 *   서버 컴포넌트는 그보다 먼저 옛 익명 쿠키로 렌더를 끝내버린다.
 *   → 돌아온 화면에 "이 기기에서만 볼 수 있어요" 가 그대로 남는다. 새로고침해야 바뀐다.
 *
 * 그래서 교환을 **서버로 당긴다.** 여기서 쿠키를 갈아끼우고 redirect 하면
 * 다음 렌더는 처음부터 승격된 세션을 본다.
 *
 * 덤으로 두 가지가 같이 해결된다:
 *   · 주소창에 `?code=` 가 남지 않는다
 *   · 리다이렉트 이후 실패(아래)를 **화면에 띄울 수 있다**
 *
 * ⚠️ 리다이렉트 뒤의 실패는 반환값이 아니라 **URL 파라미터로** 온다.
 *    `linkGoogle()` 의 반환 에러는 "구글로 출발조차 못 한 경우" 만 잡는다.
 *    이미 다른 계정에 붙어 있는 구글 신원을 익명 계정에 붙이려 하면
 *    `identity_already_exists` 가 여기로 오고(@supabase/auth-js `GoTrueClient.js:397`),
 *    이 라우트가 없으면 **아무 표시 없이 조용히 무시된다.**
 *
 * ⚠️ Supabase 는 실패를 가끔 **해시**(`#error=`)로 돌려보낸다. 해시는 서버에
 *    도착하지 않는다. `?code` 도 `?error` 도 없으면 HTML 을 내려 해시에서
 *    에러를 읽어 쿼리로 다시 붙인다. 안 그러면 missing_code 로 덮어씌워
 *    "연결했는데 그대로" 처럼 보인다.
 */

const MERGE_COOKIE = "tripin_merge_from";
const SWITCH_COOKIE = "tripin_auth_switch";

/** 오픈 리다이렉트 방지 — 우리 사이트 안의 경로만 돌아갈 곳으로 받는다. */
function safeNext(raw: string | null): string {
  if (!raw) return "/saved";
  // `//evil.com` 은 브라우저가 프로토콜 상대 URL 로 읽는다. 슬래시 하나로 시작할 것.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/saved";
  return raw;
}

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

function redirectWith(
  location: string,
  pending: CookieToSet[],
  extra: Array<{ name: string; value: string; options: Record<string, unknown> }> = [],
) {
  const response = NextResponse.redirect(location);
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, options);
  }
  for (const { name, value, options } of extra) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));

  const pending: CookieToSet[] = [];
  const sb = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const cookie of list) pending.push(cookie);
      },
    },
  });

  /* 구글·Supabase 가 실패를 알려주는 경로. error_code 가 더 구체적이라 그걸 우선한다. */
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  if (errorCode) {
    return handleAuthError({ request, sb, origin, next, errorCode, pending });
  }

  const code = searchParams.get("code");
  if (!code) {
    /* 해시 에러는 서버가 못 본다. 브라우저가 읽어서 이 라우트로 다시 오게 한다. */
    return hashProbePage(origin, next);
  }

  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    /* 여기서 실패해도 기존 익명 세션은 살아 있다 — 모아둔 것이 사라지지 않는다. */
    return handleAuthError({
      request,
      sb,
      origin,
      next,
      errorCode: error.code ?? "exchange_failed",
      pending,
    });
  }

  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user || !isLinkedUser(user)) {
    return redirectWith(
      `${origin}${withParam(next, "auth_error", "not_linked")}`,
      pending,
    );
  }

  const from = request.cookies.get(MERGE_COOKIE)?.value;
  if (from && from !== user.id && isUserId(from)) {
    try {
      await mergeAnonymousInto(from, user.id);
    } catch (err) {
      console.error("[auth] 익명 저장 이전 실패:", err);
    }
  }

  const done = redirectWith(`${origin}${next}`, pending);
  done.cookies.set(MERGE_COOKIE, "", { path: "/", maxAge: 0 });
  done.cookies.set(SWITCH_COOKIE, "", { path: "/", maxAge: 0 });
  return done;
}

async function handleAuthError({
  request,
  sb,
  origin,
  next,
  errorCode,
  pending,
}: {
  request: NextRequest;
  sb: ReturnType<typeof createServerClient>;
  origin: string;
  next: string;
  errorCode: string;
  pending: CookieToSet[];
}) {
  /* 이 구글은 이미 다른 유저에 붙어 있다. 유저는 "연결"을 골랐으니
     그 계정으로 들어가게 한다. 한 번만 — 루프 방지 쿠키. */
  if (errorCode === "identity_already_exists" && !request.cookies.get(SWITCH_COOKIE)) {
    const { data: current } = await sb.auth.getUser();
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (!error && data.url) {
      const extras: Array<{ name: string; value: string; options: Record<string, unknown> }> = [
        {
          name: SWITCH_COOKIE,
          value: "1",
          options: { path: "/", maxAge: 600, sameSite: "lax", httpOnly: true },
        },
      ];
      if (current.user?.id) {
        extras.push({
          name: MERGE_COOKIE,
          value: current.user.id,
          options: { path: "/", maxAge: 600, sameSite: "lax", httpOnly: true },
        });
      }
      return redirectWith(data.url, pending, extras);
    }
  }

  return redirectWith(`${origin}${withParam(next, "auth_error", errorCode)}`, pending);
}

/** 이미 쿼리가 붙어 있을 수 있다(`/saved?tab=x`). 통째로 덮어쓰지 않는다. */
function withParam(path: string, key: string, value: string): string {
  const [bare, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.set(key, value);
  return `${bare}?${params.toString()}`;
}

function hashProbePage(origin: string, next: string): NextResponse {
  const safe = JSON.stringify(`${origin}${next}`);
  const html = `<!doctype html><meta charset="utf-8"><title>…</title>
<script>
(function () {
  var next = ${safe};
  var hash = new URLSearchParams(location.hash.slice(1));
  var err = hash.get("error_code") || hash.get("error");
  var url = new URL(next, location.origin);
  url.searchParams.set("auth_error", err || "missing_code");
  location.replace(url.pathname + url.search);
})();
</script>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
