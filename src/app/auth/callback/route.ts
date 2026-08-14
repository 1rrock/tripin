import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
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
 */

/** 오픈 리다이렉트 방지 — 우리 사이트 안의 경로만 돌아갈 곳으로 받는다. */
function safeNext(raw: string | null): string {
  if (!raw) return "/saved";
  // `//evil.com` 은 브라우저가 프로토콜 상대 URL 로 읽는다. 슬래시 하나로 시작할 것.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/saved";
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));

  /* 구글·Supabase 가 실패를 알려주는 경로. error_code 가 더 구체적이라 그걸 우선한다. */
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  if (errorCode) {
    return NextResponse.redirect(`${origin}${withParam(next, "auth_error", errorCode)}`);
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${origin}${withParam(next, "auth_error", "missing_code")}`);
  }

  /* 쿠키를 실제로 응답에 실어야 하므로 redirect 응답을 먼저 만들고 거기에 쓴다.
     NextResponse.next() 에 쓰면 이 라우트의 응답에는 붙지 않는다. */
  const response = NextResponse.redirect(`${origin}${next}`);

  const sb = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    /* 여기서 실패해도 기존 익명 세션은 살아 있다 — 모아둔 것이 사라지지 않는다. */
    return NextResponse.redirect(
      `${origin}${withParam(next, "auth_error", error.code ?? "exchange_failed")}`,
    );
  }

  return response;
}

/** 이미 쿼리가 붙어 있을 수 있다(`/saved?tab=x`). 통째로 덮어쓰지 않는다. */
function withParam(path: string, key: string, value: string): string {
  const [bare, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.set(key, value);
  return `${bare}?${params.toString()}`;
}
