import { cookies } from "next/headers";
import { ADMIN_COOKIE, getAdminSecret, verifyToken } from "@/shared/lib/admin-auth";

/**
 * 서버 액션 자체 인증 가드 (defense in depth).
 *
 * proxy.ts(middleware) 가 /admin/* 요청에 이미 쿠키를 검사하지만, 그건 요청 경로에
 * 걸린 방어선일 뿐이다. 서버 액션은 "use server" 함수라 middleware 를 안 거치는
 * 다른 호출 경로가 생겨도(리팩터링 실수 등) 여기서 한 번 더 막아야 한다.
 *
 * admin-auth.ts 에 넣지 않는 이유 — 그 파일은 proxy.ts(Edge 런타임)가 그대로
 * import 한다. next/headers 는 Route Handler·서버 액션 전용이라 여기서 분리한다.
 */
export async function requireAdmin(): Promise<void> {
  const secret = getAdminSecret();
  if (!secret) throw new Error("관리자 기능이 비활성화되어 있습니다");
  const jar = await cookies();
  const authed = await verifyToken(secret, jar.get(ADMIN_COOKIE)?.value);
  if (!authed) throw new Error("관리자 인증이 필요합니다");
}
