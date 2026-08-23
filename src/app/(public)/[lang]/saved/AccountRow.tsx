"use client";

/**
 * 목록 맨 아래 계정 행 — "이 기기에서만 볼 수 있어요 → 로그인".
 *
 * 브레드크럼과 배너를 걷어내니 로그인 문구가 갈 자리가 없어졌다. 헤더 옆에 붙이면
 * 제목과 경쟁하고, 상자로 띄우면 화면이 시끄럽다. 그래서 **목록의 마지막 행**으로
 * 내린다 — 저장한 것을 다 훑고 난 자리가 "다른 기기에서도 보고 싶다" 가 떠오르는
 * 자리이고, 다른 행과 같은 문법이라 화면은 조용한 채로 있는다.
 *
 * 공급자 선택은 /login 에서 한다. 여기서 구글을 바로 쏘지 않는다.
 */

import { UserCircleIcon as UserCircle } from "@phosphor-icons/react";
import { usePathname, useSearchParams } from "next/navigation";
import { authErrorText } from "@/shared/api/auth-error";
import { usePersistedAuthError } from "@/shared/api/use-auth-error";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { SavedRow } from "@/shared/ui/SavedRow";

export function AccountRow({
  linked,
  /**
   * 저장이 하나도 없는 화면에서는 문구가 달라진다 — 지킬 것이 없는 사람에게
   * "이 기기에서만 볼 수 있어요" 는 아무 말도 아니다. 새 기기로 옮겨온 사람이
   * 저장을 되찾을 수 있는 유일한 줄이 이것이다.
   */
  copy = "local",
  className,
}: {
  linked: boolean;
  copy?: "local" | "restore";
  /** 격자 안에서는 한 줄을 통째로 쓴다(SavedIndex) */
  className?: string;
}) {
  const { messages: m, href } = useLocale();
  const pathname = usePathname() ?? "/saved";
  const search = useSearchParams();
  const storedError = usePersistedAuthError(search.get("auth_error"), linked);

  if (linked) {
    return (
      <SavedRow
        href={href("/account")}
        className={className}
        icon={<UserCircle className="size-5" weight="fill" />}
        name={m.saved.connected}
        meta={m.account.title}
      />
    );
  }

  return (
    <SavedRow
      href={`${href("/login")}?next=${encodeURIComponent(pathname)}`}
      className={className}
      icon={<UserCircle className="size-5" weight="fill" />}
      name={copy === "restore" ? m.saved.restoreCta : m.saved.connect}
      meta={
        storedError ? (
          <span role="alert" style={{ color: "var(--alert)" }}>
            {authErrorText(storedError, m)}
          </span>
        ) : copy === "restore" ? (
          m.saved.restore
        ) : (
          m.saved.localOnlyHint
        )
      }
    />
  );
}
