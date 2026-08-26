import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/shared/config/env";
import type { Database } from "./database.types";

/**
 * 서버용 Supabase 클라이언트 — 요청의 세션 쿠키를 읽어 auth.uid() 를 살린다.
 *
 * 공개 데이터 읽기에는 쓰지 않는다. 그건 `shared/api/supabase.ts` 의 `supabase` 가
 * 캐시(`shared/api/cache.ts`)를 끼고 하는 일이고, 이건 **유저별** 데이터 전용이다.
 * 유저별 데이터는 캐시하면 안 된다 — 남의 저장 목록이 섞인다.
 *
 * ⚠️ 서버 컴포넌트에서는 쿠키를 쓸 수 없다(Next.js 제약). setAll 이 throw 하는 것을
 *    삼키는 이유가 그것이다. 토큰 갱신은 proxy.ts 가 맡는다 — 거기서는 응답에
 *    쿠키를 실을 수 있다. 이 try/catch 를 지우면 세션 만료 직후 렌더가 통째로 터진다.
 */
export async function supabaseServer() {
  const store = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서 호출된 경우. proxy 가 갱신하므로 무시해도 된다.
        }
      },
    },
  });
}

/**
 * 현재 유저 id — 없으면 null.
 *
 * `getSession()` 은 쓰지 않는다 — 쿠키의 JWT 를 **검증 없이** 파싱하므로
 * 서버에서 신뢰하면 안 된다(위조된 쿠키를 그대로 믿게 된다).
 * `getClaims()` 는 로컬에서 서명을 검증한다(이 프로젝트는 비대칭 키라 JWKS 로
 * 가능하다) — Supabase 에 왕복하는 getUser() 와 신뢰 수준은 같다.
 */
export async function currentUserId(): Promise<string | null> {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  return data?.claims.sub ?? null;
}
