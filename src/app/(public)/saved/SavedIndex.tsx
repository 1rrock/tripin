"use client";

/**
 * 모바일 전용 그룹 인덱스 — 좋아요 카드 + 내 그룹 카드들.
 *
 * 데스크톱에는 이 화면이 없다. 거기선 사이드바가 같은 일을 하고 본문에는 바로
 * 좋아요 목록이 뜬다(시안 C). 좁은 화면에서 사이드바를 접어 넣으면 내용이
 * 반으로 줄어서, 모바일은 "목록 → 상세" 로 민다.
 */

import Link from "next/link";
import { Heart } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { SavedListRow } from "@/shared/api/saved-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useSaved } from "@/shared/ui/SavedContext";
import { NewListButton } from "./NewListButton";

export function SavedIndex({
  lists,
  likedCount,
  ungroupedCount,
}: {
  lists: SavedListRow[];
  likedCount: number;
  ungroupedCount: number;
}) {
  const { messages: m, t, href } = useLocale();
  const { lists: clientLists, countIn, ready, savedCount } = useSaved();

  const rows: SavedListRow[] = ready
    ? clientLists.map((l) => ({ id: l.id, name: l.name, count: countIn(l.id) }))
    : lists;
  const liked = ready ? savedCount : likedCount;

  const card = (path: string, label: ReactNode, n: number, liked = false) => (
    <Link
      key={path}
      href={href(path)}
      className="flex items-center justify-between gap-3 px-3.5 py-3.5 transition-colors active:bg-(--hover)"
      style={{
        borderRadius: "var(--r-frame)",
        boxShadow: liked ? "none" : "inset 0 0 0 1px var(--hairline)",
        background: liked ? "var(--halo)" : "transparent",
        color: liked ? "var(--halo-ink)" : "var(--paper)",
      }}
    >
      <span
        className="flex min-w-0 items-center gap-2 truncate"
        style={{ fontSize: "var(--t-body)", fontWeight: 800 }}
      >
        {label}
      </span>
      <span
        className="tnum shrink-0"
        style={{ fontSize: "var(--t-meta)", color: liked ? "inherit" : "var(--dim)", opacity: 0.8 }}
      >
        {t(m.saved.listCount, { n })}
      </span>
    </Link>
  );

  return (
    <div className="flex flex-col gap-2.5 lg:hidden">
      {card(
        "/saved/liked",
        <>
          <Heart className="size-4 shrink-0" weight="fill" />
          {m.saved.likedNav}
        </>,
        liked,
        true,
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="index" style={{ color: "var(--dim)" }}>
          {m.saved.lists}
        </p>
        <NewListButton />
      </div>

      {rows.length === 0 ? (
        <div className="py-2">
          <p style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>{m.saved.listEmpty}</p>
          <p className="mt-0.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
            {m.saved.listEmptyHint}
          </p>
        </div>
      ) : (
        rows.map((l) => card(`/saved/${l.id}`, l.name, l.count))
      )}

      {ungroupedCount > 0
        ? card("/saved/ungrouped", m.saved.listUngrouped, ungroupedCount)
        : null}
    </div>
  );
}
