"use client";

/**
 * 저장 목록의 행들.
 *
 * 클라이언트인 이유: 하트를 눌러 해제하면 **즉시 목록에서 빠져야** 한다.
 * 서버가 그린 목록을 그대로 두면 해제해도 행이 남아 있어 "안 지워졌나" 싶어진다.
 * 그래서 서버가 준 목록을 초기값으로 받고, 이후 저장 상태는 컨텍스트가 정답이다.
 */

import Link from "next/link";
import type { SavedPlaceRow } from "@/shared/api/saved-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import { Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { SaveButton, VisitedButton } from "@/shared/ui/SaveButton";
import { useSaved } from "@/shared/ui/SavedContext";
import { TYPE_COLOR } from "@/shared/ui/type-icons";

export function SavedList({ rows }: { rows: SavedPlaceRow[] }) {
  const { locale, messages: m, t, href } = useLocale();
  const { isSaved, isVisited, ready } = useSaved();

  /* 컨텍스트를 아직 못 읽었으면 서버가 준 목록을 그대로 믿는다.
     다 읽은 뒤부터는 컨텍스트가 정답 — 해제한 행이 즉시 사라진다. */
  const visible = ready ? rows.filter((r) => isSaved(r.id)) : rows;

  if (visible.length === 0) {
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

  return (
    <>
      <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
        {t(m.saved.countLabel, { n: visible.length })}
        {visitedCount > 0 ? ` · ${t(m.saved.visitedCount, { n: visitedCount })}` : ""}
      </p>

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

              <SaveButton placeId={r.id} placeName={name} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
