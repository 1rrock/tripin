"use client";

/**
 * 계정 바닥 — 시안 D.
 *
 * 익명이면 로그인 패널(공급자 목록). 로그인됐으면 이메일 + 로그아웃.
 * 게이트가 아니다. 구글 실패도 여기서 뜬다.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signOut } from "@/shared/api/saved";
import { LoginPanel } from "@/shared/ui/LoginPanel";
import { useLocale } from "@/shared/i18n/LocaleContext";

export function IdentityCard({
  linked,
  email,
  authError,
}: {
  linked: boolean;
  email: string | null;
  authError?: string;
}) {
  const { messages: m, href } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  if (!linked) {
    return <LoginPanel backTo={href("/account")} authError={authError} />;
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate" style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>
            {email ?? m.account.connectedAs}
          </p>
          <p className="mt-0.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
            {m.account.signOutHint}
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm(m.account.signOutConfirm)) return;
            setBusy(true);
            await signOut();
            startTransition(() => router.refresh());
            setBusy(false);
          }}
          className="inline-flex h-10 w-full shrink-0 cursor-pointer items-center justify-center px-3.5 font-bold transition-transform active:scale-[0.98] hover:opacity-90 disabled:opacity-60 lg:h-11"
          style={{
            fontSize: "var(--t-meta)",
            borderRadius: "var(--r-frame)",
            boxShadow: "inset 0 0 0 1px var(--hairline)",
            color: "var(--paper)",
          }}
        >
          {m.account.signOut}
        </button>
      </div>
    </section>
  );
}
