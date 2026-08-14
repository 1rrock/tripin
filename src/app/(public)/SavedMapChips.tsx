"use client";

/**
 * 지도 위의 저장 필터 — `♥ 저장한 곳` 과 그룹 칩들.
 *
 * 지도를 하나로 유지하기 위한 장치다. 저장 화면에 지도를 또 두면 Google Maps 가
 * 로드당 과금이라 비용이 그대로 두 배가 되고, 지도 코드도 두 벌이 된다.
 * 그래서 "저장한 곳을 지도에서 본다" 는 요구를 `/map` 의 필터로 푼다.
 *
 * 🔴 저장한 곳이 하나도 없으면 **아무것도 그리지 않는다.**
 *    이 서비스 방문자 대부분은 검색으로 들어와 한 번 보고 나가는 사람이고,
 *    그들에게 늘 비어 있는 필터 줄은 자리만 먹는 소음이다.
 */

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

  const chip = (key: string, label: string, n: number, on: boolean, onClick: () => void) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 px-3 transition-transform active:scale-95"
      style={{
        borderRadius: "999px",
        fontSize: "var(--t-meta)",
        fontWeight: 700,
        background: on ? "var(--wax)" : "transparent",
        color: on ? "#fff" : "var(--dim)",
        boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)",
      }}
    >
      {label}
      <span className="tnum" style={{ opacity: 0.75 }}>
        {n}
      </span>
    </button>
  );

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
      {chip(
        "saved",
        `♥ ${m.saved.mapFilter}`,
        savedCount,
        savedOnly && !listId,
        /* 그룹이 켜져 있으면 그룹을 풀고 전체 저장으로 — 토글 두 개가 서로
           어긋난 상태(그룹은 켜졌는데 저장은 꺼짐)를 만들지 않는다 */
        () => onChange({ saved: !(savedOnly && !listId), list: null }),
      )}

      {lists.map((l) =>
        chip(l.id, l.name, countIn(l.id), listId === l.id, () =>
          onChange(
            listId === l.id ? { saved: false, list: null } : { saved: true, list: l.id },
          ),
        ),
      )}

    </div>
  );
}
