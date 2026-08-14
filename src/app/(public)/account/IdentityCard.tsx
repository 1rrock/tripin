"use client";

/**
 * 계정 카드 — 지금 누구로 쓰고 있는지, 그리고 그걸 바꾸는 두 버튼.
 *
 * 익명이면  "이 기기에서만 쓰는 중" + [구글로 연결하기]
 * 연결됐으면 이메일 + [로그아웃]
 *
 * `/saved` 의 `ConnectBanner` 와 문구가 겹치는데 일부러 그렇다 — 배너는
 * "저장한 게 있는 사람에게 권유" 이고 여기는 "계정을 관리" 다. 둘 중 하나를
 * 없애면 각각이 필요했던 순간 하나가 같이 사라진다.
 */

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { linkGoogle, signOut } from "@/shared/api/saved";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Icon } from "@/shared/ui/icons";

/**
 * 리다이렉트로 돌아온 실패 코드 → 사람이 읽는 문장.
 *
 * `identity_already_exists` 만 따로 문구를 주는 이유: 이건 유저가 **직접 풀 수 있는**
 * 유일한 실패다(로그아웃하고 그 계정으로 로그인). 나머지는 재시도밖에 답이 없어서
 * 구분해 봐야 도움이 안 된다.
 */
function errorText(code: string, m: ReturnType<typeof useLocale>["messages"]): string {
  return code === "identity_already_exists" ? m.account.errAlreadyLinked : m.account.errGeneric;
}

export function IdentityCard({
  linked,
  email,
  authError,
}: {
  linked: boolean;
  email: string | null;
  authError?: string;
}) {
  const { messages: m } = useLocale();
  const router = useRouter();
  const pathname = usePathname() ?? "/account";
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  /* 방금 누른 실패(`failed`)가 URL 에 남은 옛 실패(`authError`)를 **이긴다.**
     반대로 두면 한 번 `?auth_error=` 가 붙은 뒤로는 다시 눌러 실패해도 화면이
     안 바뀌어서, 유저는 버튼이 죽은 줄 안다. */
  const message = failed ? m.account.errGeneric : authError ? errorText(authError, m) : null;

  return (
    <section
      className="flex flex-col gap-3 p-3.5"
      style={{ borderRadius: "var(--r-control)", boxShadow: "inset 0 0 0 1px var(--hairline)" }}
    >
      <div className="flex items-center gap-3">
        <Icon.user className="size-8 shrink-0" style={{ color: "var(--dim)" }} />
        <div className="min-w-0">
          <p className="truncate" style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>
            {linked ? (email ?? m.account.connectedAs) : m.account.anon}
          </p>
          <p className="mt-0.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
            {linked ? m.account.connectedAs : m.account.anonHint}
          </p>
        </div>
      </div>

      {linked ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm(m.account.signOutConfirm)) return;
            setBusy(true);
            await signOut();
            /* refresh 만으로 충분하다 — 서버가 쿠키를 다시 읽고 익명 상태로 그린다.
               reload 를 쓰면 클라이언트 캐시가 통째로 날아가 체감이 느려진다. */
            startTransition(() => router.refresh());
            setBusy(false);
          }}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{
            fontSize: "var(--t-body)",
            borderRadius: "var(--r-frame)",
            boxShadow: "inset 0 0 0 1px var(--hairline)",
            color: "var(--paper)",
          }}
        >
          <Icon.signOut className="size-4" />
          {m.account.signOut}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setFailed(false);
            /* 성공하면 구글로 떠나므로 아래는 실행되지 않는다.
               돌아오는 곳은 `/auth/callback` 을 거쳐 지금 이 경로다. */
            const err = await linkGoogle(pathname);
            if (err) {
              setFailed(true);
              setBusy(false);
            }
          }}
          className="flex h-11 w-full cursor-pointer items-center justify-center font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{
            fontSize: "var(--t-body)",
            borderRadius: "var(--r-frame)",
            background: "var(--paper)",
            color: "var(--sheet)",
          }}
        >
          {busy ? m.account.connecting : m.account.connect}
        </button>
      )}

      {linked ? (
        <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>{m.account.signOutHint}</p>
      ) : null}

      {message ? (
        <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--wax)" }}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
