"use client";

/**
 * 데스크톱 캔버스 필터 — 지역·종류·채널.
 * 가로 칩 대신 잡코리아식 드롭다운. 검색해서 고르고 적용한다.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react";
import type { FeedCreator } from "@/shared/api/home";
import type { PlaceType } from "@/shared/api/database.types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName } from "@/shared/i18n/display";
import { Avatar } from "@/shared/ui/frame";
import { HOME_TYPES, typeIcon } from "@/shared/ui/type-icons";
import { choseong, isChoseongQuery } from "@/shared/lib/search";
import type { HomeRegionId } from "@/shared/lib/geo-regions";

function hit(hay: string, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const h = hay.toLowerCase();
  if (h.includes(needle)) return true;
  return isChoseongQuery(needle) && choseong(hay).includes(needle);
}

export type RegionDraft = { region: HomeRegionId | null; city: string | null };

export type CityOption = {
  slug: string;
  name: string;
  nameEn: string | null;
  countryCode: string;
  placeCount: number;
};

export type RegionGroup = { id: HomeRegionId; items: CityOption[] };

function Trigger({
  label,
  active,
  open,
  onClick,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className="flex h-9 min-w-0 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold tracking-[-0.02em]"
      style={{
        background: open || active ? "var(--paper)" : "var(--ground)",
        color: open || active ? "#fff" : "var(--paper)",
        boxShadow: open || active ? "none" : "inset 0 0 0 1px var(--hairline)",
      }}
    >
      <span className="truncate">{label}</span>
      <CaretDown className={`size-3.5 shrink-0 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function Panel({
  title,
  onReset,
  onApply,
  children,
}: {
  title: string;
  onReset: () => void;
  onApply: () => void;
  children: React.ReactNode;
}) {
  const { messages: m } = useLocale();

  return (
    <div
      role="dialog"
      aria-label={title}
      className="absolute top-[calc(100%+8px)] right-0 left-0 z-30 overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.14), 0 0 0 1px var(--hairline)" }}
    >
      {children}
      <div
        className="flex items-center justify-end gap-2 border-t px-4 py-3"
        style={{ borderColor: "var(--hairline)", background: "var(--hover)" }}
      >
        <button
          type="button"
          onClick={onReset}
          className="index h-9 px-3 text-(--dim) underline-offset-4 hover:underline"
        >
          {m.home.filterReset}
        </button>
        <button
          type="button"
          onClick={onApply}
          className="h-9 rounded-full bg-(--paper) px-4 text-[13px] font-semibold text-white"
        >
          {m.home.filterApply}
        </button>
      </div>
    </div>
  );
}

function Find({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative mx-3 mt-3 mb-2 flex h-9 items-center rounded-xl bg-(--hover) pr-3 pl-8">
      <MagnifyingGlass
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-(--dim)"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] outline-none placeholder:text-(--dim)"
      />
    </label>
  );
}

export function CanvasFilters({
  region,
  city,
  type,
  channel,
  regionLabel,
  typeLabel,
  channelLabel,
  groups,
  creators,
  channelCounts,
  typeCounts,
  trailing,
  variant = "sheet",
  onApply,
}: {
  region: HomeRegionId | null;
  city: string | null;
  type: PlaceType | null;
  channel: string | null;
  regionLabel: string;
  typeLabel: string;
  channelLabel: string;
  groups: RegionGroup[];
  creators: FeedCreator[];
  channelCounts: Map<string, number>;
  typeCounts: Map<PlaceType, number>;
  /** 필터 줄 끝에 붙는 것 — 저장 칩이 여기 들어온다. 별도 줄로 띄우면
   *  규격이 어긋나 보이고 지도 세로 공간도 한 줄 더 먹는다. */
  trailing?: ReactNode;
  /** sheet = 목록 시트 안(데스크톱). floating = 지도 위 검색창 아래(모바일). */
  variant?: "sheet" | "floating";
  onApply: (next: {
    region: HomeRegionId | null;
    city: string | null;
    type: PlaceType | null;
    channel: string | null;
  }) => void;
}) {
  const { messages: m, t, locale } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<null | "region" | "type" | "channel">(null);
  const [find, setFind] = useState("");
  const [draftR, setDraftR] = useState<RegionDraft>({ region, city });
  const [draftT, setDraftT] = useState<PlaceType | null>(type);
  const [draftC, setDraftC] = useState<string | null>(channel);
  const [pane, setPane] = useState<HomeRegionId | "all">(region ?? "all");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, []);

  const openMenu = (id: "region" | "type" | "channel") => {
    setFind("");
    setDraftR({ region, city });
    setDraftT(type);
    setDraftC(channel);
    setPane(region ?? "all");
    setOpen((cur) => (cur === id ? null : id));
  };

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (c) =>
          !find.trim() ||
          hit(displayCityName(c, locale), find) ||
          hit(m.home.homeRegions[g.id], find),
      ),
    }))
    .filter((g) => !find.trim() || g.items.length > 0 || hit(m.home.homeRegions[g.id], find));

  const rightCities =
    pane === "all"
      ? visibleGroups.flatMap((g) => g.items)
      : (visibleGroups.find((g) => g.id === pane)?.items ?? []);

  const visibleCreators = creators.filter((c) => {
    const n = channelCounts.get(c.slug) ?? 0;
    if (n === 0) return false;
    return !find.trim() || hit(c.displayName, find) || hit(c.slug, find);
  });

  return (
    /* floating = 지도 위에 뜬 줄(모바일). 칩이 두 줄로 접히면 지도를 그만큼 더 가리므로
       감싸지 않고 옆으로 흐르게 둔다. 드롭다운은 이 상자 기준이라 넘침에 안 잘린다. */
    <div ref={rootRef} className={variant === "floating" ? "relative pt-2" : "relative px-4 pb-3"}>
      <div
        className={
          variant === "floating"
            ? /* 칩은 줄지 않는다 — 줄어들면 "지역"이 "지…"가 된다. 넘치면 옆으로 흐른다 */
              "no-scrollbar flex gap-2 overflow-x-auto [&>*]:shrink-0"
            : "flex flex-wrap gap-2"
        }
      >
        <Trigger
          label={regionLabel}
          active={Boolean(region || city)}
          open={open === "region"}
          onClick={() => openMenu("region")}
        />
        <Trigger
          label={typeLabel}
          active={Boolean(type)}
          open={open === "type"}
          onClick={() => openMenu("type")}
        />
        <Trigger
          label={channelLabel}
          active={Boolean(channel)}
          open={open === "channel"}
          onClick={() => openMenu("channel")}
        />
        {trailing}
      </div>

      {open === "region" ? (
        <Panel
          title={m.home.regionPick}
          onReset={() => {
            setDraftR({ region: null, city: null });
            setPane("all");
          }}
          onApply={() => {
            onApply({
              region: draftR.city ? null : draftR.region,
              city: draftR.city,
              type,
              channel,
            });
            setOpen(null);
          }}
        >
          <Find value={find} onChange={setFind} placeholder={m.home.filterFind} />
          <div className="grid max-h-[min(52vh,360px)] grid-cols-[7.5rem_1fr] overflow-hidden border-t border-(--hairline)">
            <div className="overflow-auto border-r border-(--hairline) py-1">
              <button
                type="button"
                onClick={() => {
                  setPane("all");
                  setDraftR({ region: null, city: null });
                  onApply({ region: null, city: null, type, channel });
                }}
                className="flex w-full px-3 py-2.5 text-left text-[13px] font-semibold"
                style={{
                  background: pane === "all" && !draftR.city ? "var(--halo)" : undefined,
                  color: pane === "all" && !draftR.city ? "var(--wax)" : "var(--paper)",
                }}
              >
                {m.home.regionAll}
              </button>
              {visibleGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setPane(g.id);
                    setDraftR({ region: g.id, city: null });
                    onApply({ region: g.id, city: null, type, channel });
                  }}
                  className="flex w-full px-3 py-2.5 text-left text-[13px] font-semibold"
                  style={{
                    background: pane === g.id ? "var(--halo)" : undefined,
                    color: pane === g.id ? "var(--wax)" : "var(--paper)",
                  }}
                >
                  {m.home.homeRegions[g.id]}
                </button>
              ))}
            </div>
            <div className="overflow-auto py-1">
              {rightCities.map((c) => {
                const on = draftR.city === c.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => {
                      const next = {
                        region: pane === "all" ? null : pane,
                        city: on ? null : c.slug,
                      };
                      setDraftR(next);
                      onApply({ ...next, type, channel });
                      setOpen(null);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[13px]"
                    style={{
                      background: on ? "var(--halo)" : undefined,
                      color: on ? "var(--wax)" : "var(--paper)",
                      fontWeight: on ? 700 : 500,
                    }}
                  >
                    <span>{displayCityName(c, locale)}</span>
                    <span className="index tnum text-(--dim)">{c.placeCount}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>
      ) : null}

      {open === "type" ? (
        <Panel
          title={m.home.typePick}
          onReset={() => setDraftT(null)}
          onApply={() => {
            onApply({ region, city, type: draftT, channel });
            setOpen(null);
          }}
        >
          <Find value={find} onChange={setFind} placeholder={m.home.filterFind} />
          <div className="max-h-[min(52vh,360px)] overflow-auto py-1">
            <button
              type="button"
              onClick={() => setDraftT(null)}
              className="flex w-full px-4 py-2.5 text-left text-[13px] font-semibold"
              style={{
                background: draftT === null ? "var(--halo)" : undefined,
                color: draftT === null ? "var(--wax)" : "var(--paper)",
              }}
            >
              {m.home.typeAll}
            </button>
            {HOME_TYPES.filter((key) => {
              const n = typeCounts.get(key) ?? 0;
              if (n === 0) return false;
              return !find.trim() || hit(m.placeTypes[key], find);
            }).map((key) => {
              const Glyph = typeIcon(key);
              const on = draftT === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const next = on ? null : key;
                    setDraftT(next);
                    onApply({ region, city, type: next, channel });
                    setOpen(null);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px]"
                  style={{
                    background: on ? "var(--halo)" : undefined,
                    color: on ? "var(--wax)" : "var(--paper)",
                    fontWeight: on ? 700 : 500,
                  }}
                >
                  <Glyph size={18} weight={on ? "fill" : "duotone"} />
                  <span className="flex-1">{m.placeTypes[key]}</span>
                  <span className="index tnum text-(--dim)">{typeCounts.get(key) ?? 0}</span>
                </button>
              );
            })}
          </div>
        </Panel>
      ) : null}

      {open === "channel" ? (
        <Panel
          title={m.home.channelPick}
          onReset={() => setDraftC(null)}
          onApply={() => {
            onApply({ region, city, type, channel: draftC });
            setOpen(null);
          }}
        >
          <Find value={find} onChange={setFind} placeholder={m.home.filterFind} />
          <div className="max-h-[min(52vh,360px)] overflow-auto py-1">
            <button
              type="button"
              onClick={() => setDraftC(null)}
              className="flex w-full px-4 py-2.5 text-left text-[13px] font-semibold"
              style={{
                background: draftC === null ? "var(--halo)" : undefined,
                color: draftC === null ? "var(--wax)" : "var(--paper)",
              }}
            >
              {m.cityDetail.allChannels}
            </button>
            {visibleCreators.map((c) => {
              const on = draftC === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    const next = on ? null : c.slug;
                    setDraftC(next);
                    onApply({ region, city, type, channel: next });
                    setOpen(null);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left"
                  style={{
                    background: on ? "var(--halo)" : undefined,
                    color: on ? "var(--wax)" : "var(--paper)",
                  }}
                >
                  <Avatar initials={c.initials} accent={c.accentColor} src={c.avatarUrl} size={28} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {c.displayName}
                  </span>
                  <span className="index tnum text-(--dim)">
                    {t(m.home.placesUnit, { n: channelCounts.get(c.slug) ?? 0 })}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
