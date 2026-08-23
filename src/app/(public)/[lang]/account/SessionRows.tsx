"use client";

/**
 * 계정 섹션 — 시안 C 의 행.
 *
 * 로그인됐으면 이메일 · 로그아웃 · 탈퇴가 각각 행 하나.
 * 익명이면 섹션 라벨 없이 LoginPanel — "계정" 밑에 "로그인" 제목이
 * 또 서면 같은 말이 두 번이다. 구글 실패도 LoginPanel 이 띄운다.
 *
 * 확인은 `window.confirm()` 이 아니라 시스템 안에서 받는다(`ListRowMenu` 와 같은
 * 문법: --sheet 판 + --lift + 헤어라인, Escape 로 닫힘). 브라우저 기본 다이얼로그는
 * 우리 활자·간격·언어 밖에 있고, 어느 화면의 물음인지 맥락도 끊는다.
 */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { deleteAccount, signOut } from "@/shared/api/saved";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Button } from "@/shared/ui/Button";
import { Icon } from "@/shared/ui/icons";
import { LoginPanel } from "@/shared/ui/LoginPanel";
import { RowItem, RowLabel, RowList, RowSection, rowShellClass } from "./rows";

/**
 * 위험 문구 — 굵기·아이콘·확인 단계에 **색까지** 더한다(`--alert`).
 *
 * 예전에는 먹색이었다. 이 앱의 다른 `role="alert"` 다섯 곳이 전부 `--alert` 인데
 * 되돌릴 수 없는 행동(탈퇴)의 확인 질문만 본문과 같은 색이라, 화면에서 가장
 * 위험한 문장이 가장 조용했다. 산호(--wax)가 아닌 이유는 rows.tsx 에 적혀 있다.
 */
function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-1.5"
      style={{ fontSize: "var(--t-meta)", fontWeight: 700, color: "var(--alert)" }}
    >
      <Warn />
      <span>{children}</span>
    </p>
  );
}

/** 경고 삼각형. icons.tsx 에 위험 글리프가 없어 여기 둔다 — 쓰는 곳이 이 화면뿐이다. */
function Warn() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-px size-3.5 shrink-0"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.6 1.9 20.4h20.2z" />
      <path d="M12 9.5v4.4M12 17.2h.01" />
    </svg>
  );
}

/**
 * 확인 판 — 행 **바로 아래**에 펼친다. 떠 있는 팝오버로 만들면 260px 폭에 긴
 * 물음(저장 n곳·되돌릴 수 없음)이 다섯 줄로 접히고, 무엇에 대한 확인인지도
 * 행에서 멀어진다. 여기서는 물음이 답할 행에 붙어 있는 편이 낫다.
 */
function Confirm({
  question,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  question: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  /* onCancel 은 매 렌더 새로 만들어지는 화살표다. 그대로 deps 에 넣으면 아래 두
     효과가 렌더마다 다시 돌아 **사용자가 옮겨둔 초점을 도로 빼앗는다.** */
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  /* 파괴적 확인이라 초점은 "취소"에서 시작한다 — 열자마자 Enter 를 눌러도 지워지지 않게 */
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  /* Escape 는 어디서 눌러도 닫는다(ListRowMenu 와 같은 규칙) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="flex flex-col gap-2.5 p-3"
      style={{
        background: "var(--sheet)",
        borderRadius: "var(--r-control)",
        boxShadow: "var(--lift), inset 0 0 0 1px var(--hairline)",
      }}
    >
      <Alert>{question}</Alert>
      {/* 규격은 `Button` 의 것이다 — h-9·px-3.5 를 손으로 적던 자리다.
          확정은 먹색 채움, 취소는 헤어라인 링. 확정에 산호를 쓰지 않는 이유는
          `Button.tsx` 에 적혀 있다(산호는 브랜드지 위험이 아니다). */}
      <div className="flex gap-1.5">
        <Button variant="secondary" size="sm" onClick={onConfirm} className="flex-1">
          {confirmLabel}
        </Button>
        <Button ref={cancelRef} variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}

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
  const [asking, setAsking] = useState<"signout" | "delete" | null>(null);
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

  const doSignOut = async () => {
    setAsking(null);
    setBusy("signout");
    await signOut();
    startTransition(() => router.refresh());
    setBusy(null);
  };

  const doDelete = async () => {
    setAsking(null);
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
  };

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
            aria-expanded={asking === "signout"}
            onClick={() => setAsking((cur) => (cur === "signout" ? null : "signout"))}
            className={`${rowShellClass} cursor-pointer disabled:opacity-60`}
          >
            <RowLabel>{m.account.signOut}</RowLabel>
          </button>
          {asking === "signout" ? (
            <div className="pb-2">
              <Confirm
                question={m.account.signOutConfirm}
                confirmLabel={m.account.signOut}
                cancelLabel={m.account.cancel}
                onConfirm={() => void doSignOut()}
                onCancel={() => setAsking(null)}
              />
            </div>
          ) : null}
        </RowItem>

        <RowItem>
          <button
            type="button"
            disabled={busy !== null}
            aria-expanded={asking === "delete"}
            onClick={() => setAsking((cur) => (cur === "delete" ? null : "delete"))}
            className={`${rowShellClass} cursor-pointer disabled:opacity-60`}
          >
            {/* 라벨이 --alert 를 입었으니 바로 옆 글리프도 같은 색이어야 한다 —
                한 덩이인데 색이 갈리면 아이콘이 딸린 다른 행처럼 읽힌다 */}
            <Icon.trash className="size-4 shrink-0" style={{ color: "var(--alert)" }} />
            <RowLabel tone="danger">
              {busy === "delete" ? m.account.deleting : m.account.deleteAccount}
            </RowLabel>
          </button>
          {asking === "delete" ? (
            <div className="pb-2">
              <Confirm
                question={t(m.account.deleteConfirm, { n: savedCount })}
                confirmLabel={m.account.deleteAccount}
                cancelLabel={m.account.cancel}
                onConfirm={() => void doDelete()}
                onCancel={() => setAsking(null)}
              />
            </div>
          ) : null}
        </RowItem>
      </RowList>

      {deleteFailed ? <Alert>{m.account.deleteFailed}</Alert> : null}
    </RowSection>
  );
}
