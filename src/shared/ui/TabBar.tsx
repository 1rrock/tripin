"use client";

/**
 * 언더라인 탭 — 다른 데이터를 가르는 컨트롤.
 * 활성은 2px 산호 밑줄 + 산호 볼드. 컨테이너 선 위에 겹친다(-mb-px).
 */

export function TabBar({
  items,
  activeId,
  onSelect,
  ariaLabel,
}: {
  items: readonly { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-5 border-b border-(--hairline) px-(--gutter)"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(item.id)}
            className={`-mb-px border-b-2 py-2.5 text-sm font-bold transition-colors ${
              active
                ? "border-(--wax) text-(--wax)"
                : "border-transparent text-(--dim)"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
