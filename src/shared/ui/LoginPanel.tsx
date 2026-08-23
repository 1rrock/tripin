"use client";

/**
 * 로그인 자리 — 게이트가 아니다.
 *
 * 하트·검색·지도는 여기 안 거쳐도 된다. 기기를 넘기거나 마이에서
 * 신원을 붙일 때만 온다. 구글만 살아 있고 나머지는 자리를 먼저 깐다.
 */

import { useState } from "react";
import { authErrorText } from "@/shared/api/auth-error";
import { clearAuthError, usePersistedAuthError } from "@/shared/api/use-auth-error";
import { linkGoogle } from "@/shared/api/saved";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Button } from "@/shared/ui/Button";

const PROVIDERS = [
  { id: "google", live: true },
  { id: "apple", live: false },
  { id: "kakao", live: false },
  { id: "naver", live: false },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

export function LoginPanel({
  backTo,
  authError,
  heading = "h2",
  hideHeading = false,
  className,
}: {
  backTo: string;
  authError?: string;
  heading?: "h1" | "h2";
  hideHeading?: boolean;
  className?: string;
}) {
  const { messages: m } = useLocale();
  const [busy, setBusy] = useState<ProviderId | null>(null);
  const [failed, setFailed] = useState(false);
  const storedError = usePersistedAuthError(authError, false);
  const code = failed ? "failed" : storedError;
  const message = code ? authErrorText(code, m) : null;

  const Title = heading;

  return (
    <section id="login" className={`flex w-full scroll-mt-20 flex-col gap-3 ${className ?? ""}`}>
      {hideHeading ? (
        <h2 className="sr-only">{m.account.loginTitle}</h2>
      ) : (
        <div>
          <Title className="font-extrabold" style={{ fontSize: "var(--t-title)" }}>
            {m.account.loginTitle}
          </Title>
          <p className="mt-0.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
            {m.account.loginHint}
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {PROVIDERS.map((p) => {
          const label = providerLabel(p.id, m);
          const live = p.live;
          const waiting = busy === p.id;
          return (
            <li key={p.id}>
              {/* 면을 차지하는 단추는 `Button` 하나를 지난다 — 예전엔 h-11·px-3.5 를
                  여기서 손으로 적어서 같은 무게의 단추가 앱 안에서 네 가지 규격으로
                  갈렸다. 살아 있는 제공자는 먹색 채움(secondary), 자리만 깔아 둔
                  쪽은 헤어라인 링(ghost)이고 `disabled` 가 잉크를 뺀다. */}
              <Button
                variant={live ? "secondary" : "ghost"}
                size="md"
                disabled={!live || busy !== null}
                ariaLabel={live ? label : `${label} — ${m.account.loginSoon}`}
                onClick={
                  live
                    ? async () => {
                        setBusy(p.id);
                        setFailed(false);
                        clearAuthError();
                        const err = await linkGoogle(backTo);
                        if (err) {
                          setFailed(true);
                          setBusy(null);
                        }
                      }
                    : undefined
                }
                className="w-full"
              >
                {/* 마크와 이름은 한 덩이로 왼쪽에 붙고, "곧" 배지만 오른쪽 끝으로 밀린다 */}
                <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <ProviderMark id={p.id} onInk={live} />
                  <span className="min-w-0 flex-1 truncate">
                    {waiting ? m.account.loggingIn : label}
                  </span>
                </span>
                {!live ? (
                  <span className="index shrink-0" style={{ fontWeight: 600 }}>
                    {m.account.loginSoon}
                  </span>
                ) : null}
              </Button>
            </li>
          );
        })}
      </ul>

      {message ? (
        <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--alert)" }}>
          {message}
        </p>
      ) : null}
    </section>
  );
}

function providerLabel(id: ProviderId, m: ReturnType<typeof useLocale>["messages"]): string {
  if (id === "google") return m.account.withGoogle;
  if (id === "apple") return m.account.withApple;
  if (id === "kakao") return m.account.withKakao;
  return m.account.withNaver;
}

function ProviderMark({ id, onInk }: { id: ProviderId; onInk: boolean }) {
  const ink = onInk ? "var(--sheet)" : "var(--paper)";
  if (id === "google") {
    return (
      <svg viewBox="0 0 18 18" className="size-[18px] shrink-0" aria-hidden>
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
      </svg>
    );
  }
  if (id === "apple") {
    return (
      <svg viewBox="0 0 18 18" className="size-[18px] shrink-0" aria-hidden>
        <path
          fill={ink}
          d="M13.23 9.43c-.02-2.16 1.76-3.2 1.84-3.25-1-1.47-2.57-1.67-3.12-1.69-1.33-.14-2.6.78-3.27.78-.68 0-1.72-.76-2.83-.74-1.46.02-2.8.85-3.55 2.16-1.51 2.63-.39 6.52 1.09 8.65.72 1.04 1.58 2.21 2.71 2.17 1.09-.04 1.5-.7 2.81-.7 1.32 0 1.68.7 2.83.68 1.17-.02 1.91-1.06 2.63-2.11.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.28-.88-2.3-3.47ZM11.3 3.3c.6-.73 1-1.74.89-2.75-.86.03-1.9.57-2.52 1.3-.55.64-1.04 1.67-.91 2.65.96.07 1.94-.49 2.54-1.2Z"
        />
      </svg>
    );
  }
  if (id === "kakao") {
    return (
      <svg viewBox="0 0 18 18" className="size-[18px] shrink-0" aria-hidden>
        <path
          fill={ink}
          d="M9 2.2C4.86 2.2 1.5 4.86 1.5 8.14c0 2.12 1.4 3.98 3.5 5.04l-.89 3.28c-.08.3.26.54.5.37l3.82-2.54c.18.01.37.02.57.02 4.14 0 7.5-2.66 7.5-5.94S13.14 2.2 9 2.2Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 18 18" className="size-[18px] shrink-0" aria-hidden>
      <text
        x="9"
        y="13.2"
        textAnchor="middle"
        fill={ink}
        fontSize="12"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        N
      </text>
    </svg>
  );
}
