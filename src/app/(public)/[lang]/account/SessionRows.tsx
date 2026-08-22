"use client";

/**
 * 계정 섹션 — 시안 C 의 행.
 *
 * 로그인됐으면 이메일 · 로그아웃 · 탈퇴가 각각 행 하나.
 * 익명이면 섹션 라벨 없이 LoginPanel — "계정" 밑에 "로그인" 제목이
 * 또 서면 같은 말이 두 번이다. 구글 실패도 LoginPanel 이 띄운다.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccount, signOut } from "@/shared/api/saved";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { LoginPanel } from "@/shared/ui/LoginPanel";
import { RowItem, RowLabel, RowList, RowSection, rowShellClass } from "./rows";

export function SessionRows({
  linked,
  email,
  savedCount,
  authError,
}: {
  linked: boolean;
  email: string | null;
  savedCount: number;
  authError?: string;
}) {
  const { messages: m, t, href } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState<"signout" | "delete" | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [, startTransition] = useTransition();

  /* 익명이면 섹션 라벨 없이 로그인 패널만. 라벨을 비운 RowSection 으로 감싸는 이유는
     데스크톱 정렬 하나다 — 감싸지 않으면 이 블록만 왼쪽 라벨 단까지 삐져나와서
     위 섹션들과 왼쪽 선이 어긋난다. */
  if (!linked) {
    return (
      <RowSection>
        <LoginPanel backTo={href("/account")} authError={authError} />
      </RowSection>
    );
  }

  return (
    <RowSection label={m.account.dangerHeading}>
      <RowList>
        <RowItem>
          <div className="-mx-2 flex h-13 items-center gap-3 px-2">
            <RowLabel>{email ?? m.account.connectedAs}</RowLabel>
          </div>
        </RowItem>

        <RowItem>
          <button
            type="button"
            disabled={busy !== null}
            onClick={async () => {
              if (!window.confirm(m.account.signOutConfirm)) return;
              setBusy("signout");
              await signOut();
              startTransition(() => router.refresh());
              setBusy(null);
            }}
            className={`${rowShellClass} cursor-pointer disabled:opacity-60`}
          >
            <RowLabel>{m.account.signOut}</RowLabel>
          </button>
        </RowItem>

        <RowItem>
          <button
            type="button"
            disabled={busy !== null}
            onClick={async () => {
              if (!window.confirm(t(m.account.deleteConfirm, { n: savedCount }))) return;
              setBusy("delete");
              setDeleteFailed(false);

              const ok = await deleteAccount();
              if (!ok) {
                setDeleteFailed(true);
                setBusy(null);
                return;
              }
              router.replace(href("/"));
              router.refresh();
            }}
            className={`${rowShellClass} cursor-pointer disabled:opacity-60`}
          >
            <RowLabel tone="wax">{busy === "delete" ? m.account.deleting : m.account.deleteAccount}</RowLabel>
          </button>
        </RowItem>
      </RowList>

      {deleteFailed ? (
        <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--wax)" }}>
          {m.account.deleteFailed}
        </p>
      ) : null}
    </RowSection>
  );
}
