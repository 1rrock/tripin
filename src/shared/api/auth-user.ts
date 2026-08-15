import type { User } from "@supabase/supabase-js";

/**
 * 구글 신원이 붙어 있는가.
 *
 * `is_anonymous === false` 만 보면 안 된다. linkIdentity 직후 JWT 클레임이
 * 그대로 true 로 남는 경우가 있고(supabase/auth#1708 근처), 그때 마이페이지가
 * "연결하기" 를 다시 그린다. 신원 목록이 더 믿을 만하다.
 */
export function isLinkedUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.is_anonymous === false) return true;
  if (user.identities?.some((i) => i.provider === "google")) return true;
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes("google");
}

export function linkedEmail(user: User): string | null {
  if (!isLinkedUser(user)) return null;
  if (user.email) return user.email;
  const email = user.identities?.find((i) => i.provider === "google")?.identity_data?.["email"];
  return typeof email === "string" ? email : null;
}
