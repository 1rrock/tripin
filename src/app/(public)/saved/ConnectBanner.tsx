"use client";

/**
 * "이 기기에서만 볼 수 있어요 → 로그인".
 *
 * 시안 D — 상자가 아니라 한 줄. 저장 목록 화면에만 있다.
 * 공급자 선택은 /login 에서 한다. 여기서 구글을 바로 쏘지 않는다.
 */

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authErrorText } from "@/shared/api/auth-error";
import { usePersistedAuthError } from "@/shared/api/use-auth-error";
import { Icon } from "@/shared/ui/icons";
import { useLocale } from "@/shared/i18n/LocaleContext";

export function ConnectBanner({ linked }: { linked: boolean }) {
  const { messages: m, href } = useLocale();
  const pathname = usePathname() ?? "/saved";
  const search = useSearchParams();
  const authError = search.get("auth_error");
  const storedError = usePersistedAuthError(authError, linked);

  if (linked) {
    return (
      <p
        className="flex items-center gap-1.5"
        style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
      >
        <Icon.check className="size-3.5" />
        {m.saved.connected}
      </p>
    );
  }

  const loginHref = `${href("/login")}?next=${encodeURIComponent(pathname)}`;

  return (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
        {m.saved.localOnly}{" "}
        <Link href={loginHref} className="font-bold" style={{ color: "var(--paper)" }}>
          {m.saved.connect}
        </Link>
      </p>
      {storedError ? (
        <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--wax)" }}>
          {authErrorText(storedError, m)}
        </p>
      ) : null}
    </div>
  );
}
