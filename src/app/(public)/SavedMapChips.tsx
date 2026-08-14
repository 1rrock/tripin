"use client";

/**
 * 지도 필터 줄의 저장 칩 — `♥ 저장한 곳` 과 그룹들.
 *
 * 지도를 하나로 유지하기 위한 장치다. 저장 화면에 지도를 또 두면 Google Maps 가
 * 로드당 과금이라 비용이 그대로 두 배가 되고, 지도 코드도 두 벌이 된다.
 * 그래서 "저장한 곳을 지도에서 본다" 는 요구를 `/map` 의 필터로 푼다.
 *
 * 🔴 저장한 곳이 하나도 없으면 **아무것도 그리지 않는다.**
 *    방문자 대부분은 검색으로 들어와 한 번 보고 나가는 사람이고,
 *    그들에게 늘 비어 있는 필터 줄은 자리만 먹는 소음이다.
 *
 * ⚠️ 규격은 `CanvasFilters` 의 `Trigger` 를 그대로 따른다 —
 *    h-9 · rounded-full · px-3.5 · 13px · 활성은 --paper 바탕.
 *    같은 줄에 서는 칩이라 하나라도 어긋나면 줄이 깨져 보인다(실제로 겪음).
 */

import { Heart } from "@phosphor-icons/react";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useSaved } from "@/shared/ui/SavedContext";

export function SavedMapChips({
  savedOnly,
  listId,
  onChange,
}: {
  savedOnly: boolean;
  listId: string | null;
  onChange: (next: { saved: boolean; list: string | null }) => void;
}) {
  const { messages: m } = useLocale();
  const { ready, savedCount, lists, countIn } = useSaved();

  if (!ready || savedCount === 0) return null;

  const chip = (
    key: string,
    label: string,
    n: number,
    on: boolean,
    onClick: () => void,
    heart = false,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="flex h-9 min-w-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold tracking-[-0.02em]"
      style={{
        background: on ? "var(--paper)" : "var(--ground)",
        color: on ? "#fff" : "var(--paper)",
        boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)",
      }}
    >
      {heart ? (
        <Heart
          className="size-3.5 shrink-0"
          weight="fill"
          /* 꺼져 있을 때만 산호 — 켜지면 바탕이 먹색이라 산호가 탁해진다 */
          style={{ color: on ? "#fff" : "var(--wax)" }}
        />
      ) : null}
      <span className="truncate">{label}</span>
      <span className="tnum shrink-0" style={{ opacity: 0.6 }}>
        {n}
      </span>
    </button>
  );

  return (
    <>
      {chip(
        "saved",
        m.saved.mapFilter,
        savedCount,
        savedOnly && !listId,
        /* 그룹이 켜져 있으면 그룹을 풀고 전체 저장으로 — 토글 둘이 어긋난 상태
           (그룹은 켜졌는데 저장은 꺼짐)를 만들지 않는다 */
        () => onChange({ saved: !(savedOnly && !listId), list: null }),
        true,
      )}

      {lists.map((l) =>
        chip(l.id, l.name, countIn(l.id), listId === l.id, () =>
          onChange(listId === l.id ? { saved: false, list: null } : { saved: true, list: l.id }),
        ),
      )}
    </>
  );
}
