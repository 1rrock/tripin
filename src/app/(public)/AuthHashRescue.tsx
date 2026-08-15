"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * OAuth 실패가 `#error=` 해시로만 오는 경우.
 *
 * 콜백 허용 목록에 안 맞으면 Site URL(`/`)로 떨어지는데, 해시는 서버가 못 본다.
 * 마이 탭을 눌러도 쿼리가 없어서 "연결했는데 그대로" 로만 보인다.
 */
export function AuthHashRescue() {
  const router = useRouter();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const err = hash.get("error_code") || hash.get("error");
    if (!err) return;
    const next = new URL("/account", window.location.origin);
    next.searchParams.set("auth_error", err);
    router.replace(`${next.pathname}${next.search}`);
  }, [router]);

  return null;
}
