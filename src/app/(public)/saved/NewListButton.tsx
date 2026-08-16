"use client";

/**
 * 그룹 만들기 — 사이드바 하단(데스크톱)과 목록 헤더(모바일)에서 같이 쓴다.
 *
 * 장소를 고르지 않고도 빈 그룹을 만들 수 있어야 한다. 여행 계획은 대개
 * "도쿄 3박4일" 이라는 이름이 먼저 서고 장소가 나중에 담긴다 —
 * `ListPicker` 안에서만 만들 수 있으면 그 순서를 못 따른다.
 */

import { useRouter } from "next/navigation";
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
  const { messages: m, href } = useLocale();
  const { addList } = useSaved();
  const router = useRouter();
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
    /* 만들자마자 그 그룹으로 들어간다 — 다음 할 일이 "여기에 담기" 라서.
       그룹의 본진은 지도다(SavedIndex 주석) — /saved/<id> 는 어차피 여기로 튄다. */
    router.push(href(`/map?list=${res.id}`));
  }

  if (!open) {
    const button = (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "row"
            ? `roll w-full cursor-pointer ${ROW_BODY} pr-(--gutter)`
            : `flex h-9 cursor-pointer items-center justify-center gap-1.5 px-3 font-bold transition-transform active:scale-[0.98] ${className}`
        }
        style={
          variant === "row"
            ? undefined
            : {
                fontSize: "var(--t-meta)",
                borderRadius: "var(--r-control)",
                boxShadow: "inset 0 0 0 1px var(--hairline)",
                color: "var(--paper)",
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
          <>+ {m.saved.listNew}</>
        )}
      </button>
    );
    return variant === "row" ? (
      <li className="border-b" style={{ borderColor: "var(--hairline)" }}>
        {button}
      </li>
    ) : (
      button
    );
  }

  const form = (
    <div
      className={
        variant === "row" ? "flex flex-col gap-2 px-(--gutter) py-3" : `flex flex-col gap-2 ${className}`
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
    <li className="border-b" style={{ borderColor: "var(--hairline)" }}>
      {form}
    </li>
  ) : (
    form
  );
}
