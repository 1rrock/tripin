"use client";

/**
 * 저장된 장소 목록의 행들 — 좋아요 화면과 그룹 상세가 같이 쓴다.
 *
 * 행은 구글 지도 저장 목록 문법: 이름·도시가 본문, 오른쪽은 지도·하트·⋯.
 * 그룹 이름은 한 줄 메타. 칩·바꾸기·지도 버튼을 아래로 쌓지 않는다.
 */

import type { SavedPlaceRow } from "@/shared/api/saved-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import { Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { PlaceMenu } from "@/shared/ui/PlaceMenu";
import { SaveButton } from "@/shared/ui/SaveButton";
import { useSaved } from "@/shared/ui/SavedContext";
import { TYPE_COLOR } from "@/shared/ui/type-icons";

export function PlaceRows({
  rows,
  /** 그룹 상세면 그 그룹 id — 그룹에서 빠진 장소를 즉시 감추는 데 쓴다. */
  listId,
  /** 그룹 없음 화면이면 true — 어딘가에 담기는 순간 이 목록에서 빠진다. */
  ungroupedOnly = false,
  emptyText,
}: {
  rows: SavedPlaceRow[];
  listId?: string;
  ungroupedOnly?: boolean;
  emptyText: string;
}) {
  const { locale, messages: m, t } = useLocale();
  const { isSaved, lists, listsOf, ready } = useSaved();

  const visible = !ready
    ? rows
    : rows.filter((r) => {
        if (!isSaved(r.id)) return false;
        if (listId) return listsOf(r.id).has(listId);
        if (ungroupedOnly) return listsOf(r.id).size === 0;
        return true;
      });

  if (visible.length === 0) {
    return (
      <p className="py-6" style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
        {emptyText}
      </p>
    );
  }

  return (
    <>
      <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
        {t(m.saved.countLabel, { n: visible.length })}
      </p>

      <ul className="grid grid-cols-1 gap-x-6 xl:grid-cols-2">
        {visible.map((r) => {
          const name = displayPlaceName(
            { name: r.name, nameLocal: locale === "en" ? r.nameEn : r.nameLocal },
            locale,
          );
          const city = displayCityName({ name: r.cityName, nameEn: r.cityNameEn }, locale);
          const color = TYPE_COLOR[r.placeType];
          const groups = lists.filter((l) => listsOf(r.id).has(l.id)).map((l) => l.name);

          return (
            <li
              key={r.id}
              className="flex items-start gap-2 border-b py-3.5"
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
                {groups.length > 0 ? (
                  <span className="mt-1 block truncate text-[13px] text-(--dim)">
                    {groups.join(" · ")}
                  </span>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center">
                {r.mapUrl ? (
                  <OutboundA
                    href={r.mapUrl}
                    aria-label={m.common.openMap}
                    className="grid size-9 place-items-center"
                    style={{
                      borderRadius: "var(--r-frame)",
                      color: "var(--dim)",
                    }}
                  >
                    <Icon.out className="size-4" />
                  </OutboundA>
                ) : null}
                <SaveButton placeId={r.id} placeName={name} bare />
                <PlaceMenu placeId={r.id} placeName={name} listId={listId} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
