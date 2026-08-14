"use client";

/**
 * 그룹 이름 바꾸기 · 삭제.
 *
 * 그룹 상세 헤더에만 둔다 — 목록 화면에 관리 버튼을 늘어놓으면 그룹을 고르기도
 * 전에 지울 수 있는 것들이 먼저 보인다.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useSaved } from "@/shared/ui/SavedContext";

export function ListActions({ listId, name }: { listId: string; name: string }) {
  const { messages: m, t, href } = useLocale();
  const { editList, removeList } = useSaved();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft.trim()) return;
    const res = await editList(listId, draft);
    if (res.ok) {
      setEditing(false);
      /* 서버가 그린 제목은 그대로라 새로 받아야 한다 */
      router.refresh();
    } else {
      setError(res.reason === "duplicate" ? m.saved.listDuplicate : m.saved.listFailed);
    }
  }

  if (editing) {
    return (
      <div className="flex w-full flex-col gap-2">
        <input
          value={draft}
          maxLength={40}
          autoFocus
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(name);
              setError(null);
            }
          }}
          aria-label={m.saved.listRename}
          className="h-11 w-full px-3 outline-none"
          style={{
            fontSize: "16px",
            borderRadius: "var(--r-frame)",
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
            onClick={() => void save()}
            className="h-9 cursor-pointer px-4 font-bold"
            style={{
              fontSize: "var(--t-meta)",
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
              setEditing(false);
              setDraft(name);
              setError(null);
            }}
            className="h-9 cursor-pointer px-4 font-semibold"
            style={{
              fontSize: "var(--t-meta)",
              borderRadius: "var(--r-frame)",
              boxShadow: "inset 0 0 0 1px var(--hairline)",
              color: "var(--dim)",
            }}
          >
            {m.saved.listCancel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="h-8 cursor-pointer px-3 font-semibold"
        style={{
          fontSize: "var(--t-meta)",
          borderRadius: "var(--r-frame)",
          boxShadow: "inset 0 0 0 1px var(--hairline)",
          color: "var(--dim)",
        }}
      >
        {m.saved.listRename}
      </button>
      <button
        type="button"
        onClick={async () => {
          /* 되돌릴 수 없으니 한 번 묻는다. 담긴 장소가 남는다는 것도 같이 알린다 —
             "그룹 지우면 저장한 곳도 날아가나" 가 실제로 헷갈리는 지점이다. */
          if (!window.confirm(t(m.saved.listDeleteConfirm, { name }))) return;
          await removeList(listId);
          router.push(href("/saved"));
        }}
        className="h-8 cursor-pointer px-3 font-semibold"
        style={{
          fontSize: "var(--t-meta)",
          borderRadius: "var(--r-frame)",
          boxShadow: "inset 0 0 0 1px var(--hairline)",
          color: "var(--wax)",
        }}
      >
        {m.saved.listDelete}
      </button>
    </div>
  );
}
