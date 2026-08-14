"use client";

/**
 * "이 기기에서만 볼 수 있어요 → 연결하기".
 *
 * 이 배너가 **저장 목록 화면에만** 있는 것이 설계의 핵심이다.
 * 홈·지도·장소 상세에는 로그인 권유가 없다 — 아직 아무 가치도 못 받은 사람에게
 * 계정을 물으면 그냥 이탈한다. 여기까지 온 사람은 이미 모아둔 것이 있다.
 *
 * 이미 구글에 연결된 유저에게는 조용한 확인 줄만 남는다.
 */

import { usePathname } from "next/navigation";
import { useState } from "react";
import { linkGoogle } from "@/shared/api/saved";
import { Icon } from "@/shared/ui/icons";
import { useLocale } from "@/shared/i18n/LocaleContext";

export function ConnectBanner({ linked }: { linked: boolean }) {
  const { messages: m } = useLocale();
  const pathname = usePathname() ?? "/saved";
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

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

  return (
    <div
      className="flex flex-col gap-2.5 p-3.5"
      style={{
        borderRadius: "var(--r-control)",
        boxShadow: "inset 0 0 0 1px var(--hairline)",
      }}
    >
      <div>
        <p style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>{m.saved.localOnly}</p>
        <p className="mt-0.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
          {m.saved.localOnlyHint}
        </p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          /* 성공하면 구글로 리디렉션되므로 이 아래는 실행되지 않는다.
             돌아오는 곳은 `/auth/callback` 을 거쳐 지금 이 화면이다 — 연결하고
             나서 목록이 그대로 보여야 한다. 화면 URL 을 직접 주지 않는 이유는
             `app/auth/callback/route.ts` 주석 참조(코드 교환이 렌더보다 늦어진다). */
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
        {busy ? m.saved.connecting : m.saved.connect}
      </button>

      {failed ? (
        <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--wax)" }}>
          {m.saved.connectFailed}
        </p>
      ) : null}
    </div>
  );
}
