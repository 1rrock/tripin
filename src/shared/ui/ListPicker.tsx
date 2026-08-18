"use client";

/**
 * 저장 그룹 고르기 — 네이버 지도 "리스트에 저장" 문법.
 *
 * 한 장소가 여러 그룹에 들어가므로 체크(즉시 반영). 확인 버튼 없이 고르고 닫는다.
 * body 포탈 + 높은 z — 장소 드로어/풀페이지 위에도 떠야 한다.
 *
 * 행은 `/saved` 목록과 **같은 조각**(SavedRow)을 쓴다 — 저장 목록에서 보던 행이
 * 여기서도 그대로 나와야 "같은 것을 고르는 중" 으로 읽힌다.
 *
 * 맨 위는 **저장한 곳**이다. 하트가 담는 기본 그룹이라 그룹들과 같은 줄에 세운다.
 * 여기서 체크를 풀면 저장 자체가 풀린다(그래서 따로 "저장 해제" 를 두지 않는다).
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BookmarkSimpleIcon as BookmarkSimple, HeartIcon as Heart, PlusIcon as Plus } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Icon } from "@/shared/ui/icons";
import { ROW_BODY, RowIcon, RowText } from "@/shared/ui/SavedRow";
import { useSaved } from "@/shared/ui/SavedContext";
import { useLocale } from "@/shared/i18n/LocaleContext";

/** mounted 스토어 구독 — 값이 변하지 않으므로 아무것도 하지 않는다. */
const subscribeNever = () => () => {};

/** 고른 표시 — 오른쪽 끝 동그란 체크. 켜지면 산호가 찬다. */
function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className="grid size-6 shrink-0 place-items-center rounded-full"
      style={{
        boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--hairline)",
        background: on ? "var(--wax)" : "transparent",
        color: "#fff",
      }}
    >
      {on ? <Icon.check className="size-3.5" weight="bold" /> : null}
    </span>
  );
}

function PickRow({
  icon,
  tone,
  name,
  on,
  onClick,
}: {
  icon: ReactNode;
  tone?: "plain" | "wax";
  name: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <li className="border-b" style={{ borderColor: "var(--hairline)" }}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        className={`roll w-full cursor-pointer ${ROW_BODY} pr-(--gutter)`}
      >
        <RowIcon tone={tone}>{icon}</RowIcon>
        <RowText name={name} />
        <Check on={on} />
      </button>
    </li>
  );
}

export function ListPicker({
  placeId,
  placeName,
  onClose,
}: {
  placeId: string;
  placeName: string;
  onClose: () => void;
}) {
  const { messages: m } = useLocale();
  const { lists, listsOf, toggleInList, addList, toggleSaved, isSaved } = useSaved();
  const [creating, setCreating] = useState(false);
  /* body 포탈은 클라이언트에만 있다 — SSR 은 false, 하이드레이션 뒤 true.
     mount 이펙트에서 setState 하는 대신 스토어로 읽는다(react-hooks/set-state-in-effect). */
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const inList = listsOf(placeId);
  const saved = isSaved(placeId);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await addList(name);
    if (res.ok) {
      await toggleInList(res.id, placeId);
      setName("");
      setCreating(false);
    } else {
      setError(res.reason === "duplicate" ? m.saved.listDuplicate : m.saved.listFailed);
    }
    setBusy(false);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
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
        style={{ background: "rgb(0 0 0 / 0.28)" }}
      />

      {/* 네이버처럼 거의 전면 높이 — max-h 로만 잡으면 리스트 적을 때 납작해진다 */}
      <div
        className="rise-in relative flex h-[min(92dvh,100%)] w-full max-w-lg flex-col"
        style={{
          background: "var(--sheet)",
          color: "var(--paper)",
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* 핸들 */}
        <div className="flex shrink-0 justify-center pt-2.5 pb-1" aria-hidden>
          <span
            className="block h-1 w-9 rounded-full"
            style={{ background: "var(--hairline)" }}
          />
        </div>

        {/* 장소 헤더 */}
        <div className="flex shrink-0 items-center gap-3 px-4 pb-3">
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center"
            style={{
              borderRadius: "var(--r-frame)",
              background: "var(--hover)",
              color: "var(--dim)",
            }}
          >
            <Icon.pin className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold" style={{ fontSize: "var(--t-body)" }}>
              {placeName}
            </p>
            <p className="mt-0.5 truncate" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              {m.saved.listPickHint}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={m.saved.listDone}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full active:bg-(--hover)"
            style={{ color: "var(--dim)" }}
          >
            <Icon.close className="size-[18px]" />
          </button>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t pb-2"
          style={{ borderColor: "var(--hairline)" }}
        >
          <ul className="flex flex-col">
            {/* 저장한 곳 — 하트가 담는 기본 그룹. 그룹들과 같은 줄에 선다.
                끄면 저장이 풀리고(그룹 담김도 같이 비워진다) 시트를 닫는다 —
                "저장 안 할래" 는 여기서 끝나는 동작이다. */}
            <PickRow
              icon={<Heart className="size-5" weight="fill" />}
              tone="wax"
              name={m.saved.title}
              on={saved}
              onClick={() => {
                if (saved) void toggleSaved(placeId).then(() => onClose());
                else void toggleSaved(placeId);
              }}
            />

            {lists.map((l) => (
              <PickRow
                key={l.id}
                icon={<BookmarkSimple className="size-5" weight="fill" />}
                name={l.name}
                on={inList.has(l.id)}
                onClick={() => void toggleInList(l.id, placeId)}
              />
            ))}
          </ul>

          {/* 새 리스트 */}
          {creating ? (
            <div className="mx-(--gutter) my-3 rounded-xl p-3" style={{ background: "var(--hover)" }}>
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
                className="h-11 w-full rounded-lg bg-(--sheet) px-3 outline-none"
                style={{
                  fontSize: "16px",
                  color: "var(--paper)",
                  boxShadow: "inset 0 0 0 1px var(--hairline)",
                }}
              />
              {error ? (
                <p role="alert" className="mt-1.5 px-0.5" style={{ fontSize: "var(--t-meta)", color: "var(--wax)" }}>
                  {error}
                </p>
              ) : null}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!name.trim() || busy}
                  onClick={() => void submit()}
                  className="h-10 flex-1 cursor-pointer rounded-lg font-bold disabled:opacity-40"
                  style={{
                    fontSize: "var(--t-body)",
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
                  className="h-10 cursor-pointer rounded-lg px-4 font-semibold"
                  style={{
                    fontSize: "var(--t-body)",
                    color: "var(--dim)",
                    boxShadow: "inset 0 0 0 1px var(--hairline)",
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
              className={`roll w-full cursor-pointer border-b ${ROW_BODY} pr-(--gutter)`}
              style={{ borderColor: "var(--hairline)" }}
            >
              <RowIcon>
                <Plus className="size-5" weight="bold" />
              </RowIcon>
              <RowText
                name={m.saved.listNew}
                meta={lists.length === 0 ? m.saved.listEmptyHint : undefined}
              />
            </button>
          )}
        </div>

        {/* 하단 액션 — "저장 해제" 는 두지 않는다. 좋아요 행의 체크를 푸는 것이
            같은 일이고, 같은 일에 버튼이 둘이면 한쪽만 고치는 날이 온다. */}
        <div
          className="shrink-0 border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          style={{ borderColor: "var(--hairline)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl font-bold"
            style={{
              fontSize: "var(--t-body)",
              background: "var(--paper)",
              color: "var(--sheet)",
            }}
          >
            {m.saved.listDone}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
