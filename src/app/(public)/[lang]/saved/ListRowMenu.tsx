"use client";

/**
 * 그룹 행의 `⋮` 메뉴 — 이름 바꾸기 · 삭제.
 *
 * 그룹 상세(`ListActions`)에도 같은 기능이 있지만, 정리는 대개 **목록을 훑으며**
 * 한다. 매번 그룹에 들어갔다 나와야 하면 이름 하나 고치는 데 왕복이 두 번이다.
 * 그래서 사이드바(데스크톱)와 인덱스(모바일) 양쪽 행에 붙인다.
 *
 * 한 컴포넌트 안의 작은 상태 기계다: 닫힘 → 메뉴 → 이름 편집.
 * 이름 편집을 별도 모달로 띄우지 않는 이유는 그 편이 행 옆에서 끝나 맥락이 안 끊기기 때문이다.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DotsThreeVerticalIcon as DotsThreeVertical } from "@phosphor-icons/react";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useSaved } from "@/shared/ui/SavedContext";

type Mode = "closed" | "menu" | "rename";

export function ListRowMenu({
  listId,
  name,
  /** 지금 이 그룹을 보고 있는가 — 삭제하면 화면을 옮겨야 한다 */
  isCurrent = false,
}: {
  listId: string;
  name: string;
  isCurrent?: boolean;
}) {
  const { messages: m, t, href } = useLocale();
  const { editList, removeList } = useSaved();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("closed");
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* 바깥을 누르거나 Escape 면 닫는다. 팝오버가 열린 채로 다른 그룹을 누르면
     어느 그룹의 메뉴였는지 알 수 없게 된다. */
  useEffect(() => {
    if (mode === "closed") return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMode("closed");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("closed");
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [mode]);

  useEffect(() => {
    if (mode === "rename") inputRef.current?.select();
  }, [mode]);

  async function save() {
    if (!draft.trim() || draft.trim() === name) {
      setMode("closed");
      return;
    }
    const res = await editList(listId, draft);
    if (res.ok) {
      setMode("closed");
      /* 서버가 그린 제목·사이드바는 그대로라 새로 받아야 한다 */
      router.refresh();
    } else {
      setError(res.reason === "duplicate" ? m.saved.listDuplicate : m.saved.listFailed);
    }
  }

  const item = (label: string, onClick: () => void, danger = false) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer px-3 py-2 text-left"
      style={{
        fontSize: "var(--t-meta)",
        fontWeight: 600,
        /* 파괴 액션은 --alert 다. 브랜드색(--wax)은 워드마크·주 CTA·활성 표시 전용이라
           "지우기"와 "이게 우리 색"이 같은 색이면 강조가 서로를 취소한다. */
        color: danger ? "var(--alert)" : "var(--paper)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          /* 행 전체가 링크라 부모로 새면 그룹으로 이동해 버린다 */
          e.stopPropagation();
          e.preventDefault();
          setDraft(name);
          setError(null);
          setMode((cur) => (cur === "closed" ? "menu" : "closed"));
        }}
        aria-label={t(m.saved.listMenuAria, { name })}
        aria-haspopup="menu"
        aria-expanded={mode !== "closed"}
        className="grid size-7 cursor-pointer place-items-center rounded-full"
        style={{ color: "var(--dim)" }}
      >
        <DotsThreeVertical className="size-4" weight="bold" />
      </button>

      {mode === "menu" ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-[132px] overflow-hidden py-1"
          style={{
            background: "var(--sheet)",
            borderRadius: "var(--r-control)",
            boxShadow: "var(--lift), inset 0 0 0 1px var(--hairline)",
          }}
        >
          {item(m.saved.listRename, () => setMode("rename"))}
          {item(
            m.saved.listDelete,
            async () => {
              /* 되돌릴 수 없으니 한 번 묻는다. 담긴 장소가 남는다는 것도 같이 알린다 —
                 "그룹 지우면 저장한 곳도 날아가나" 가 실제로 헷갈리는 지점이다. */
              if (!window.confirm(t(m.saved.listDeleteConfirm, { name }))) return;
              setMode("closed");
              await removeList(listId);
              if (isCurrent) router.push(href("/saved"));
              else router.refresh();
            },
            true,
          )}
        </div>
      ) : null}

      {mode === "rename" ? (
        <div
          className="absolute right-0 z-30 mt-1 flex w-[210px] flex-col gap-2 p-2.5"
          style={{
            background: "var(--sheet)",
            borderRadius: "var(--r-control)",
            boxShadow: "var(--lift), inset 0 0 0 1px var(--hairline)",
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            maxLength={40}
            autoFocus
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
            aria-label={m.saved.listRename}
            className="h-9 w-full px-2.5 outline-none"
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
            <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--alert)" }}>
              {error}
            </p>
          ) : null}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => void save()}
              className="h-8 flex-1 cursor-pointer font-bold"
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
              onClick={() => setMode("closed")}
              className="h-8 cursor-pointer px-2.5 font-semibold"
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
      ) : null}
    </div>
  );
}
