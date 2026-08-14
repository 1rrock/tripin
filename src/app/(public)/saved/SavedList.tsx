"use client";

/**
 * 저장 목록의 행들.
 *
 * 클라이언트인 이유: 하트를 눌러 해제하면 **즉시 목록에서 빠져야** 한다.
 * 서버가 그린 목록을 그대로 두면 해제해도 행이 남아 있어 "안 지워졌나" 싶어진다.
 * 그래서 서버가 준 목록을 초기값으로 받고, 이후 저장 상태는 컨텍스트가 정답이다.
 */

import { useState } from "react";
import Link from "next/link";
import type { SavedPlaceRow } from "@/shared/api/saved-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import { Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { ListButton, SaveButton, VisitedButton } from "@/shared/ui/SaveButton";
import { useSaved } from "@/shared/ui/SavedContext";
import { TYPE_COLOR } from "@/shared/ui/type-icons";

/** 그룹 필터 — 전체 / 그룹들 / 그룹 없음. */
const ALL = "__all__";
const UNGROUPED = "__ungrouped__";

export function SavedList({ rows }: { rows: SavedPlaceRow[] }) {
  const { locale, messages: m, t, href } = useLocale();
  const { isSaved, isVisited, ready, lists, listsOf, editList, removeList } = useSaved();
  const [filter, setFilter] = useState<string>(ALL);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  /* 컨텍스트를 아직 못 읽었으면 서버가 준 목록을 그대로 믿는다.
     다 읽은 뒤부터는 컨텍스트가 정답 — 해제한 행이 즉시 사라진다. */
  const saved = ready ? rows.filter((r) => isSaved(r.id)) : rows;

  const visible =
    filter === ALL
      ? saved
      : filter === UNGROUPED
        ? saved.filter((r) => listsOf(r.id).size === 0)
        : saved.filter((r) => listsOf(r.id).has(filter));

  const activeList = lists.find((l) => l.id === filter) ?? null;

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 py-8">
        <p style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>{m.saved.empty}</p>
        <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>{m.saved.emptyHint}</p>
        <Link
          href={href("/map")}
          className="mt-1 inline-flex h-10 items-center gap-1.5 px-4 font-bold"
          style={{
            fontSize: "var(--t-body)",
            borderRadius: "var(--r-frame)",
            background: "var(--paper)",
            color: "var(--sheet)",
          }}
        >
          <Icon.map className="size-4" />
          {m.saved.emptyCta}
        </Link>
      </div>
    );
  }

  const visitedCount = visible.filter((r) => isVisited(r.id)).length;
  const ungroupedCount = saved.filter((r) => listsOf(r.id).size === 0).length;

  /** 필터 칩 하나. */
  const chip = (key: string, label: string, n: number) => {
    const on = filter === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => {
          setFilter(key);
          setRenaming(null);
        }}
        aria-pressed={on}
        className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 px-3 transition-transform active:scale-95"
        style={{
          borderRadius: "999px",
          fontSize: "var(--t-meta)",
          fontWeight: 700,
          background: on ? "var(--paper)" : "transparent",
          color: on ? "var(--sheet)" : "var(--dim)",
          boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)",
        }}
      >
        {label}
        <span className="tnum" style={{ opacity: 0.65 }}>
          {n}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* 그룹 칩 — 그룹이 하나도 없으면 줄 자체를 안 그린다.
          빈 필터 줄은 자리만 먹고 알려주는 게 없다. */}
      {lists.length > 0 ? (
        <div className="-mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) pb-0.5">
          {chip(ALL, m.saved.listAll, saved.length)}
          {lists.map((l) =>
            chip(
              l.id,
              l.name,
              saved.filter((r) => listsOf(r.id).has(l.id)).length,
            ),
          )}
          {ungroupedCount > 0 ? chip(UNGROUPED, m.saved.listUngrouped, ungroupedCount) : null}
        </div>
      ) : null}

      {/* 그룹을 고른 상태에서만 이름 바꾸기·삭제가 나온다 —
          전체 목록 화면에 관리 버튼을 늘어놓지 않는다 */}
      {activeList ? (
        renaming === activeList.id ? (
          <div className="flex flex-col gap-2">
            <input
              value={draft}
              maxLength={40}
              autoFocus
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              onKeyDown={async (e) => {
                if (e.key !== "Enter" || !draft.trim()) return;
                const res = await editList(activeList.id, draft);
                if (res.ok) setRenaming(null);
                else setError(res.reason === "duplicate" ? m.saved.listDuplicate : m.saved.listFailed);
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
              <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--brand)" }}>
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const res = await editList(activeList.id, draft);
                  if (res.ok) setRenaming(null);
                  else
                    setError(
                      res.reason === "duplicate" ? m.saved.listDuplicate : m.saved.listFailed,
                    );
                }}
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
                  setRenaming(null);
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
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(activeList.name);
                setRenaming(activeList.id);
              }}
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
                /* 되돌릴 수 없으니 한 번 묻는다. 담긴 장소는 남는다는 것도 같이 알린다 —
                   "그룹 지우면 저장한 곳도 날아가나" 가 실제로 헷갈리는 지점이다. */
                if (!window.confirm(t(m.saved.listDeleteConfirm, { name: activeList.name })))
                  return;
                await removeList(activeList.id);
                setFilter(ALL);
              }}
              className="h-8 cursor-pointer px-3 font-semibold"
              style={{
                fontSize: "var(--t-meta)",
                borderRadius: "var(--r-frame)",
                boxShadow: "inset 0 0 0 1px var(--hairline)",
                color: "var(--brand)",
              }}
            >
              {m.saved.listDelete}
            </button>
          </div>
        )
      ) : null}

      <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
        {t(m.saved.countLabel, { n: visible.length })}
        {visitedCount > 0 ? ` · ${t(m.saved.visitedCount, { n: visitedCount })}` : ""}
      </p>

      {visible.length === 0 ? (
        <p className="py-6" style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
          {m.saved.listPlacesEmpty}
        </p>
      ) : null}

      <ul className="flex flex-col">
        {visible.map((r) => {
          const name = displayPlaceName(
            { name: r.name, nameLocal: locale === "en" ? r.nameEn : r.nameLocal },
            locale,
          );
          const city = displayCityName({ name: r.cityName, nameEn: r.cityNameEn }, locale);
          const color = TYPE_COLOR[r.placeType];

          return (
            <li
              key={r.id}
              className="flex items-center gap-3 border-b py-3.5"
              style={{ borderColor: "var(--hairline)" }}
            >
              <div className="min-w-0 flex-1">
                <span className={`block text-[12px] font-medium ${color?.fg ?? "text-(--dim)"}`}>
                  {m.placeTypes[r.placeType]}
                </span>
                <span className="mt-0.5 block truncate text-[15px] font-semibold tracking-[-0.01em]">
                  {name}
                </span>
                <span className="mt-1 block truncate text-[13px] text-(--dim)">{city}</span>

                <div className="mt-2 flex items-center gap-2">
                  <VisitedButton placeId={r.id} placeName={name} />
                  {r.mapUrl ? (
                    <OutboundA
                      href={r.mapUrl}
                      className="inline-flex h-9 items-center gap-1.5 px-3"
                      style={{
                        fontSize: "var(--t-meta)",
                        fontWeight: 600,
                        borderRadius: "var(--r-frame)",
                        boxShadow: "inset 0 0 0 1px var(--hairline)",
                        color: "var(--paper)",
                      }}
                    >
                      <Icon.out className="size-3.5" />
                      {m.common.openMap}
                    </OutboundA>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <ListButton placeId={r.id} placeName={name} />
                <SaveButton placeId={r.id} placeName={name} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
