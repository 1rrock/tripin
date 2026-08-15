"use client";

/**
 * 장소 행의 `⋯` — 구글 지도 저장 목록과 같은 자리.
 *
 * 칩의 "바꾸기"·칩 × 는 행을 두 줄로 밀고 지도 버튼을 아래로 떨어뜨렸다.
 * 그룹 이동·빼기는 메뉴에 모은다. 시트는 고른 뒤에만 연다.
 */

import { useEffect, useRef, useState } from "react";
import { DotsThreeVertical } from "@phosphor-icons/react";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useSaved } from "@/shared/ui/SavedContext";
import { ListPicker } from "@/shared/ui/ListPicker";

export function PlaceMenu({
  placeId,
  placeName,
  listId,
  className = "",
}: {
  placeId: string;
  placeName: string;
  /** 지금 보고 있는 그룹 — 있으면 "이 그룹에서 빼기" */
  listId?: string;
  className?: string;
}) {
  const { messages: m, t } = useLocale();
  const { listsOf, toggleInList } = useSaved();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inList = listsOf(placeId);
  const assigned = inList.size > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = (label: string, onClick: () => void) => (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full cursor-pointer px-3 py-2.5 text-left"
      style={{ fontSize: "var(--t-meta)", fontWeight: 600, color: "var(--paper)" }}
    >
      {label}
    </button>
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-label={t(m.saved.placeMenuAria, { name: placeName })}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`grid size-9 cursor-pointer place-items-center ${className}`}
        style={{ borderRadius: "var(--r-frame)", color: "var(--dim)" }}
      >
        <DotsThreeVertical className="size-5" weight="bold" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-[168px] overflow-hidden py-1"
          style={{
            background: "var(--sheet)",
            borderRadius: "var(--r-control)",
            boxShadow: "var(--lift), inset 0 0 0 1px var(--hairline)",
          }}
        >
          {item(assigned ? m.saved.listMove : m.saved.listAdd, () => {
            setOpen(false);
            setPicking(true);
          })}
          {listId && inList.has(listId)
            ? item(m.saved.listRemoveHere, () => {
                setOpen(false);
                void toggleInList(listId, placeId);
              })
            : null}
        </div>
      ) : null}

      {picking ? (
        <ListPicker placeId={placeId} placeName={placeName} onClose={() => setPicking(false)} />
      ) : null}
    </div>
  );
}
