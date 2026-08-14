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
 * 세션을 보장한다 — 없으면 **익명으로 만든다**.
 *
 * 하트·갔던 곳·구독의 모든 쓰기가 이걸 먼저 부른다.
 * 로그인 UI 는 뜨지 않는다. PRODUCT.md 원칙 5 "게이트는 없다" 가 여기서 지켜진다.
 *
 * 익명 유저도 auth.users 의 정식 row 이므로(is_anonymous = true) RLS 정책은
 * 익명/정식을 구분하지 않는다. 나중에 구글로 승격해도 **id 가 바뀌지 않아서**
 * 저장해둔 것이 그대로 따라온다 — 이게 익명 우선 설계의 핵심이다.
 *
 * @returns 유저 id. 익명 로그인이 막혀 있거나 네트워크가 죽으면 null.
 */
export async function ensureSession(): Promise<string | null> {
  const sb = supabaseBrowser();

  const { data: existing } = await sb.auth.getSession();
  if (existing.session) return existing.session.user.id;

  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    // 대시보드에서 Anonymous sign-ins 가 꺼져 있으면 여기로 온다.
    console.error("[auth] 익명 세션 생성 실패:", error.message);
    return null;
  }
  return data.user?.id ?? null;
}
