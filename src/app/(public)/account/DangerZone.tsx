"use client";

/**
 * 탈퇴.
 *
 * 만드는 이유는 편의가 아니라 **의무**다 — 개인정보보호법상 파기,
 * 그리고 앱을 낼 때 App Store 5.1.1(v)(계정 생성이 되는 앱은 삭제도 앱 안에서
 * 되어야 한다). `ROADMAP.md` 2단계 "처리방침 개정" 과 한 몸이다.
 *
 * 확인을 두 번 받지 않고 `confirm` 한 번으로 끝낸다. 대신 문구에 **실제 개수**를
 * 넣는다("저장한 곳 23곳과 구독이 모두 지워지고") — 추상적인 경고문 두 번보다
 * 구체적인 숫자 한 번이 실제로 손을 멈추게 한다.
 *
 * 지우는 일 자체는 `/api/account/delete` 가 한다. service_role 키가 필요해서
 * 클라이언트에서는 불가능하다.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccount } from "@/shared/api/saved";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Icon } from "@/shared/ui/icons";

export function DangerZone({ savedCount }: { savedCount: number }) {
  const { messages: m, t, href } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <section className="flex flex-col gap-2.5 pb-2">
      <h2 style={{ fontSize: "var(--t-title)", fontWeight: 800 }}>{m.account.dangerHeading}</h2>

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
          /* 계정이 사라졌으니 이 화면에 남을 이유가 없다. 홈으로 보낸다.
             refresh 가 아니라 replace 인 이유: 뒤로가기로 방금 지운 계정 화면에
             돌아오면 빈 껍데기가 뜬다. */
          router.replace(href("/"));
          router.refresh();
        }}
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
        style={{
          fontSize: "var(--t-body)",
          borderRadius: "var(--r-frame)",
          boxShadow: "inset 0 0 0 1px var(--wax)",
          color: "var(--wax)",
        }}
      >
        <Icon.trash className="size-4" />
        {busy ? m.account.deleting : m.account.deleteAccount}
      </button>

      <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>{m.account.deleteHint}</p>

      {failed ? (
        <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--wax)" }}>
          {m.account.deleteFailed}
        </p>
      ) : null}
    </section>
  );
}
