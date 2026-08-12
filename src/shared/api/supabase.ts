import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/shared/config/env";
import type { Database } from "./database.types";

/**
 * Supabase 클라이언트 — Eatripin은 두 종류를 쓴다.
 *
 *   supabase       anon 키. RLS 적용. 읽기 전용 공개 데이터.
 *   supabaseAdmin  service_role 키. RLS 우회. 어드민·스크립트 전용, 서버에서만.
 *
 * 공개 페이지는 RLS 가 걸린 읽기만 하므로 대부분 `supabase` 로 충분하다.
 * 요청마다 서버에서 렌더되지만 로더가 캐시를 거친다(`shared/api/cache.ts`).
 * 세션·로그인이 없으므로(Phase 2까지 계정 없음) auth 영속화도 끄고 간다.
 */
export const supabase = createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let adminClient: SupabaseClient<Database> | null = null;

/**
 * 🔴 RLS를 우회하는 관리자 클라이언트.
 *
 * 어드민 route handler / 로컬 스크립트에서만 호출할 것.
 * 클라이언트 컴포넌트에서 호출하면 serverEnv 가 throw 한다.
 *
 * 게으른 싱글턴 — 모듈 로드 시점에 키를 요구하지 않으므로,
 * service_role 키 없이도 공개 페이지 빌드는 정상 동작한다.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!adminClient) {
    adminClient = createClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
