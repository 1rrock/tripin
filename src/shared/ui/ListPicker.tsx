"use client";

/**
 * "어느 그룹에 담을까요" — 체크박스 목록 + 새 그룹 만들기.
 *
 * 구글 지도의 목록 담기와 같은 문법이다. 한 장소가 여러 그룹에 들어가므로
 * 라디오가 아니라 **체크박스**다. 고르는 즉시 반영된다(확인 버튼이 없다) —
 * 담고 빼는 걸 여러 번 하다가 마지막에 "취소" 를 누르면 뭐가 남는지 헷갈린다.
 *
 * 하트와 분리된 이유: 하트는 한 손가락으로 끝나야 한다. 그룹 고르기를 하트에
 * 묶으면 "그냥 저장" 이 두 단계가 된다.
 */

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/shared/ui/icons";
import { useSaved } from "@/shared/ui/SavedContext";
import { useLocale } from "@/shared/i18n/LocaleContext";

export function ListPicker({
  placeId,
  placeName,
  onClose,
}: {
  placeId: string;
  placeName: string;
  onClose: () => void;
}) {
  const { messages: m, t } = useLocale();
  const { lists, listsOf, toggleInList, addList } = useSaved();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const inList = listsOf(placeId);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  /* Escape 로 닫는다. onClose 는 매 렌더 새 정체성이라 ref 로 들고 이펙트는 안 묶는다
     — PlaceSheet 과 같은 이유(부모 리렌더마다 리스너가 다시 붙는 것을 막는다). */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await addList(name);
    if (res.ok) {
      /* 새로 만든 그룹에는 바로 담는다 — 만들자마자 또 체크하게 두지 않는다 */
      await toggleInList(res.id, placeId);
      setName("");
      setCreating(false);
    } else {
      setError(res.reason === "duplicate" ? m.saved.listDuplicate : m.saved.listFailed);
    }
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={m.saved.listSheetTitle}
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "color-mix(in srgb, var(--sheet) 55%, transparent)" }}
      />

      <div
        ref={panelRef}
        className="rise-in relative w-full max-w-md max-h-[76dvh] overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4"
        style={{
          background: "var(--sheet)",
          color: "var(--paper)",
          borderRadius: "var(--r-control)",
          boxShadow: "var(--lift)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 style={{ fontSize: "var(--t-body)", fontWeight: 800 }}>
              {m.saved.listSheetTitle}
            </h2>
            <p className="mt-0.5 truncate" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              {placeName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={m.saved.listDone}
            className="grid size-8 shrink-0 cursor-pointer place-items-center"
            style={{ borderRadius: "var(--r-frame)", boxShadow: "inset 0 0 0 1px var(--hairline)" }}
          >
            <Icon.close className="size-4" />
          </button>
        </div>

        {lists.length === 0 && !creating ? (
          <div className="mt-4">
            <p style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>{m.saved.listEmpty}</p>
            <p className="mt-0.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              {m.saved.listEmptyHint}
            </p>
          </div>
        ) : null}

        <ul className="mt-3 flex flex-col">
          {lists.map((l) => {
            const on = inList.has(l.id);
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => void toggleInList(l.id, placeId)}
                  aria-pressed={on}
                  className="flex w-full cursor-pointer items-center gap-3 border-b py-3 text-left"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <span
                    aria-hidden
                    className="grid size-5 shrink-0 place-items-center"
                    style={{
                      borderRadius: "6px",
                      background: on ? "var(--brand)" : "transparent",
                      boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)",
                      color: "#fff",
                    }}
                  >
                    {on ? <Icon.check className="size-3.5" weight="bold" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate" style={{ fontSize: "var(--t-body)" }}>
                    {l.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {creating ? (
          <div className="mt-3 flex flex-col gap-2">
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
              }}
              placeholder={m.saved.listNamePlaceholder}
              aria-label={m.saved.listNew}
              className="h-11 w-full px-3 outline-none"
              style={{
                /* 16px 미만이면 iOS 가 입력할 때 화면을 확대한다 — PRODUCT.md 접근성 */
                fontSize: "16px",
                borderRadius: "var(--r-frame)",
                background: "transparent",
                color: "var(--paper)",
                boxShadow: "inset 0 0 0 1px var(--hairline)",
              }}
            />
            {error ? (
              <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--brand)" }}>
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!name.trim() || busy}
                onClick={() => void submit()}
                className="h-10 flex-1 cursor-pointer font-bold disabled:opacity-50"
                style={{
                  fontSize: "var(--t-body)",
                  borderRadius: "var(--r-frame)",
                  background: "var(--paper)",
                  color: "var(--sheet)",
                }}
              >
                {m.saved.listCreate}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setName("");
                  setError(null);
                }}
                className="h-10 cursor-pointer px-4 font-semibold"
                style={{
                  fontSize: "var(--t-body)",
                  borderRadius: "var(--r-frame)",
                  boxShadow: "inset 0 0 0 1px var(--hairline)",
                  color: "var(--dim)",
                }}
              >
                {m.saved.listCancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 font-bold"
            style={{
              fontSize: "var(--t-body)",
              borderRadius: "var(--r-frame)",
              boxShadow: "inset 0 0 0 1px var(--hairline)",
              color: "var(--paper)",
            }}
          >
            + {m.saved.listNew}
          </button>
        )}

        <p className="mt-3" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
          {t(m.saved.listCount, { n: inList.size })}
        </p>
      </div>
    </div>
  );
}
