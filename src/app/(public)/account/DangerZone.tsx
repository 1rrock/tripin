"use client";

/**
 * 탈퇴 — 시안 D 는 텍스트 한 줄.
 *
 * 만드는 이유는 편의가 아니라 **의무**다. 확인은 confirm 한 번, 문구에 실제 개수.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccount } from "@/shared/api/saved";
import { useLocale } from "@/shared/i18n/LocaleContext";

export function DangerZone({ savedCount }: { savedCount: number }) {
  const { messages: m, t, href } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <span className="inline">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(t(m.account.deleteConfirm, { n: savedCount }))) return;
          setBusy(true);
          setFailed(false);

          const ok = await deleteAccount();
          if (!ok) {
            setFailed(true);
            setBusy(false);
            return;
          }
          router.replace(href("/"));
          router.refresh();
        }}
        className="cursor-pointer font-bold underline-offset-4 hover:underline disabled:opacity-60"
        style={{ fontSize: "var(--t-meta)", color: "var(--wax)" }}
      >
        {busy ? m.account.deleting : m.account.deleteAccount}
      </button>
      {failed ? (
        <span role="alert" className="ml-2" style={{ fontSize: "var(--t-meta)", color: "var(--wax)" }}>
          {m.account.deleteFailed}
        </span>
      ) : null}
    </span>
  );
}
