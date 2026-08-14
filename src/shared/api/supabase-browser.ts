"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/shared/config/env";
import type { Database } from "./database.types";

/**
 * 브라우저용 Supabase 클라이언트 — **로그인한(익명 포함) 유저의 쓰기 전용**이다.
 *
 * 기존 `shared/api/supabase.ts` 의 `supabase` 와 역할이 다르다:
 *
 *   supabase          persistSession: false. 세션을 아예 안 든다.
 *                     서버에서 공개 데이터를 읽을 때만 쓴다.
 *   supabaseBrowser() 세션을 쿠키에 싣는다. 하트·구독처럼 auth.uid() 가
 *                     필요한 요청에만 쓴다.
 *
 * ⚠️ 둘을 섞지 말 것. 공개 읽기에 이걸 쓰면 불필요한 세션 쿠키가 붙고,
 *    쓰기에 저걸 쓰면 RLS 가 auth.uid() = null 로 판단해 전부 거부한다.
 *
 * 모듈 스코프 싱글턴이다 — createBrowserClient 를 호출할 때마다 새 클라이언트가
 * 생기면 onAuthStateChange 구독이 중복되고 토큰 갱신이 경합한다.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function supabaseBrowser() {
  client ??= createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return client;
}

/**
 * 이 페이지 수명 동안 **서버에 실재를 확인한** 유저 id.
 *
 * 쓰기마다 getUser() 왕복을 하면 하트 한 번에 요청이 둘이 된다.
 * 한 번 확인했으면 그 값을 재사용하고, 무효해지면 `resetSession()` 이 비운다.
 */
let verifiedUid: string | null = null;

/**
 * 세션을 보장한다 — 없거나 **죽었으면** 익명으로 새로 만든다.
 *
 * 하트·갔던 곳·구독의 모든 쓰기가 이걸 먼저 부른다.
 * 로그인 UI 는 뜨지 않는다. PRODUCT.md 원칙 5 "게이트는 없다" 가 여기서 지켜진다.
 *
 * ⚠️ getSession() 이 아니라 getUser() 로 확인한다. getSession 은 쿠키의 JWT 를
 *    **서버에 묻지 않고** 로컬에서 파싱만 하므로, 유저가 삭제됐거나 세션이
 *    무효화된 뒤에도 "살아있다" 고 답한다. 그 상태로 쓰면 DB 가
 *    `saved_places_user_id_fkey` (23503, "Key is not present in table users")
 *    로 걷어찬다 — 실제로 겪었다.
 *
 * 익명 유저도 auth.users 의 정식 row 이므로(is_anonymous = true) RLS 정책은
 * 익명/정식을 구분하지 않는다. 나중에 구글로 승격해도 **id 가 바뀌지 않아서**
 * 저장해둔 것이 그대로 따라온다 — 이게 익명 우선 설계의 핵심이다.
 *
 * @returns 유저 id. 익명 로그인이 막혀 있거나 네트워크가 죽으면 null.
 */
export async function ensureSession(): Promise<string | null> {
  if (verifiedUid) return verifiedUid;

  const sb = supabaseBrowser();

  const { data: existing } = await sb.auth.getSession();
  if (existing.session) {
    const { data: check, error } = await sb.auth.getUser();
    if (!error && check.user) {
      verifiedUid = check.user.id;
      return verifiedUid;
    }
    /* 쿠키는 있는데 서버에 그 유저가 없다 — 잔재를 지우고 새로 만든다.
       signOut({scope:'local'}) 인 이유: 서버 세션은 이미 없으므로 전역 로그아웃을
       부르면 그 요청이 실패하고 로컬 토큰이 남는다. */
    await sb.auth.signOut({ scope: "local" });
  }

  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    // 대시보드에서 Anonymous sign-ins 가 꺼져 있으면 여기로 온다.
    console.error("[auth] 익명 세션 생성 실패:", error.message);
    return null;
  }
  verifiedUid = data.user?.id ?? null;
  return verifiedUid;
}

/**
 * 확인 캐시를 버린다.
 *
 * 확인한 뒤에 유저가 사라질 수도 있다(계정 삭제·세션 무효화). 그때는 쓰기가
 * 23503 으로 실패하는데, 호출부가 이걸 부르고 한 번 재시도하면 스스로 회복한다.
 */
export function resetSession(): void {
  verifiedUid = null;
}
