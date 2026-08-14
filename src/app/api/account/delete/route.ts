import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { currentUserId } from "@/shared/api/supabase-server";
import { publicEnv, serverEnv } from "@/shared/config/env";

/**
 * 탈퇴 — 개인정보보호법상 파기 의무를 실제로 이행하는 자리.
 *
 * 왜 라우트 핸들러인가: `auth.admin.deleteUser` 는 service_role 키를 요구하고,
 * 그 키는 RLS 를 **전부 우회**한다(`shared/config/env.ts:80`). 브라우저에 나가면
 * 그 순간 전 유저 데이터가 열린다. 그래서 서버에서만 만지고 결과만 돌려준다.
 *
 * 지울 대상은 **요청자 본인뿐이다.** id 를 본문으로 받지 않는 이유가 그것이다 —
 * 받는 순간 남의 id 를 넣어 부르는 경로가 생긴다. 세션 쿠키에서만 읽는다.
 *
 * saved_places · saved_lists · subscriptions · profiles 는 전부
 * `references auth.users(id) on delete cascade` 라 따로 지우지 않는다
 * (`supabase/migrations/0009_accounts.sql`).
 */
export async function POST() {
  /* getUser() 로 서버에 실재를 확인한 id 다. 쿠키의 JWT 를 파싱만 하는
     getSession() 을 쓰면 위조된 쿠키로 남의 계정을 지울 수 있다. */
  const uid = await currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    // 키가 설정되지 않은 환경. 유저에게 "지웠다" 고 거짓말하지 않는다.
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
