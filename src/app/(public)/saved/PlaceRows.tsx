"use client";

/**
 * 저장된 장소 목록의 행들 — 좋아요 화면과 그룹 상세가 같이 쓴다.
 *
 * 클라이언트인 이유: 하트를 눌러 해제하거나 그룹에서 빼면 **즉시 목록에서 빠져야**
 * 한다. 서버가 그린 목록을 그대로 두면 눌러도 행이 남아 "안 지워졌나" 싶어진다.
 * 그래서 서버 목록을 초기값으로 받고, 이후엔 컨텍스트가 정답이다.
 */

import type { SavedPlaceRow } from "@/shared/api/saved-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import { Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { ListButton, SaveButton } from "@/shared/ui/SaveButton";
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
  const { isSaved, listsOf, ready } = useSaved();

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

      {/* 데스크톱은 두 칸으로 — 한 칸이면 넓은 화면에서 줄이 지나치게 길어진다 */}
      <ul className="grid grid-cols-1 gap-x-6 xl:grid-cols-2">
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

                {r.mapUrl ? (
                  <OutboundA
                    href={r.mapUrl}
                    className="mt-2 inline-flex h-9 items-center gap-1.5 px-3"
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
