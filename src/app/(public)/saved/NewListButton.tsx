"use client";

/**
 * 그룹 만들기 — 머리의 버튼(데스크톱)과 목록의 행(모바일)이 같은 조각을 쓴다.
 *
 * 장소를 고르지 않고도 빈 그룹을 만들 수 있어야 한다. 여행 계획은 대개
 * "도쿄 3박4일" 이라는 이름이 먼저 서고 장소가 나중에 담긴다 —
 * `ListPicker` 안에서만 만들 수 있으면 그 순서를 못 따른다.
 *
 * 만들고 나서 화면을 옮기지 않는다 — 이유는 `submit()` 안에 적었다.
 */

import { useEffect, useRef, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useSaved } from "@/shared/ui/SavedContext";
import { ROW_BODY, RowIcon, RowText } from "@/shared/ui/SavedRow";

export function NewListButton({
  className = "",
  /**
   * `row` 는 저장 인덱스 목록 안에 서는 꼴 — `<li>` 를 직접 낸다. 목록 바깥의
   * 버튼으로 두면 "만들기" 가 목록과 다른 문법이 되어 한 번 더 찾아야 한다.
   */
  variant = "button",
  hint,
}: {
  className?: string;
  variant?: "button" | "row";
  hint?: string;
}) {
  const { messages: m } = useLocale();
  const { addList } = useSaved();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await addList(name);
    setBusy(false);
    if (!res.ok) {
      setError(res.reason === "duplicate" ? m.saved.listDuplicate : m.saved.listFailed);
      return;
    }
    setName("");
    setOpen(false);
    /* 만든 자리에 그대로 남는다. 예전에는 곧장 `/map?list=<id>` 로 밀어 넣었는데,
       빈 그룹으로 들어가 봐야 볼 것이 없고 방금 만든 그룹이 목록에서 어디 앉았는지도
       못 본 채 화면이 갈린다. 여럿을 잇달아 만드는 사람에게는 매번 되돌아와야 하는
       왕복이 된다. 목록은 컨텍스트가 갱신하니 새 그룹은 이 자리에서 바로 보인다 —
       담으러 갈지는 누르는 사람이 정한다. */
  }

  if (!open) {
    const button = (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "row"
            ? `roll w-full cursor-pointer ${ROW_BODY} pr-(--gutter)`
            : `flex h-11 w-fit cursor-pointer items-center justify-center gap-1.5 px-4 font-bold transition-transform active:scale-[0.98] ${className}`
        }
        style={
          variant === "row"
            ? undefined
            : {
                /* 화면의 주 행동이다 — 잉크 채움. 산호는 핀에만 쓴다(globals.css) */
                fontSize: "var(--t-body)",
                borderRadius: "var(--r-control)",
                background: "var(--paper)",
                color: "var(--sheet)",
              }
        }
      >
        {variant === "row" ? (
          <>
            <RowIcon>
              <Plus className="size-5" weight="bold" />
            </RowIcon>
            <RowText name={m.saved.listNew} meta={hint} />
          </>
        ) : (
          <>
            <Plus className="size-4" weight="bold" />
            {m.saved.listNew}
          </>
        )}
      </button>
    );
    return variant === "row" ? (
      <li className={`border-b ${className}`} style={{ borderColor: "var(--hairline)" }}>
        {button}
      </li>
    ) : (
      button
    );
  }

  const form = (
    <div
      className={
        variant === "row"
          ? "flex flex-col gap-2 px-(--gutter) py-3"
          : /* 버튼 자리에서 그대로 펼쳐진다 — 폭을 박지 않으면 입력칸이 글자 폭으로 쪼그라든다 */
            `flex w-72 flex-col gap-2 ${className}`
      }
    >
      <input
        ref={inputRef}
        value={name}
        maxLength={40}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
            setError(null);
          }
        }}
        placeholder={m.saved.listNamePlaceholder}
        aria-label={m.saved.listNew}
        className="h-10 w-full px-3 outline-none"
        style={{
          /* 16px 미만이면 iOS 가 입력할 때 화면을 확대한다 — PRODUCT.md 접근성 */
          fontSize: "16px",
          borderRadius: "var(--r-control)",
          background: "transparent",
          color: "var(--paper)",
          boxShadow: "inset 0 0 0 1px var(--hairline)",
        }}
      />
      {error ? (
        <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--wax)" }}>
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!name.trim() || busy}
          onClick={() => void submit()}
          className="h-9 flex-1 cursor-pointer font-bold disabled:opacity-50"
          style={{
            fontSize: "var(--t-meta)",
            borderRadius: "var(--r-control)",
            background: "var(--paper)",
            color: "var(--sheet)",
          }}
        >
          {m.saved.listCreate}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setName("");
            setError(null);
          }}
          className="h-9 cursor-pointer px-3 font-semibold"
          style={{
            fontSize: "var(--t-meta)",
            borderRadius: "var(--r-control)",
            boxShadow: "inset 0 0 0 1px var(--hairline)",
            color: "var(--dim)",
          }}
        >
          {m.saved.listCancel}
        </button>
      </div>
    </div>
  );

  return variant === "row" ? (
    <li className={`border-b ${className}`} style={{ borderColor: "var(--hairline)" }}>
      {form}
    </li>
  ) : (
    form
  );
}
