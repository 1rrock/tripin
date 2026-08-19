"use client";

/**
 * 데스크톱 캔버스 필터 — 지역·종류·채널.
 * 가로 칩 대신 잡코리아식 드롭다운. 검색해서 고르고 적용한다.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CaretDownIcon as CaretDown,
  CaretRightIcon as CaretRight,
  MagnifyingGlassIcon as MagnifyingGlass,
} from "@phosphor-icons/react";
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
  buttonRef,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onClick: () => void;
  buttonRef: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
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

function focusable(panel: HTMLElement) {
  return Array.from(
    panel.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [href]"),
  );
}

/** 고르는 순간 적용되고 닫힌다 — 확인 단추가 없다. 그래서 바닥 줄도 없다.
 *  (지역의 1depth 만 예외다. 거긴 오른쪽 목록을 여는 줄이라 적용도 닫기도 하지 않는다.)
 *  role="dialog" 이니 포커스도 다이얼로그처럼 움직인다: 열리면 안으로 들어가고,
 *  Tab 은 패널을 못 벗어나고, 닫히면 연 트리거로 돌아간다. */
function Panel({
  title,
  children,
  triggerRef,
}: {
  title: string;
  children: React.ReactNode;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    // 언마운트 시점의 클린업에서 쓸 값 — 그때의 triggerRef.current 를 보장할 수
    // 없으니 이펙트가 열릴 때의 트리거를 붙잡아 둔다.
    const trigger = triggerRef.current;
    /* 입력창 자동 포커스는 데스크톱만 — 모바일(floating)에서는 열자마자
       키보드가 올라와 방금 연 목록을 도로 가린다. 터치에는 포커스 링이
       필요 없고, 외장 키보드 사용자는 Tab 한 번이면 입력창에 닿는다. */
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const find = desktop ? panel.querySelector<HTMLInputElement>("input") : null;
    (find ?? (desktop ? focusable(panel)[0] : null))?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusable(panel);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", onKeyDown);
    return () => {
      panel.removeEventListener("keydown", onKeyDown);
      // 언마운트되는 경로 전부(Esc, 바깥 클릭, 항목 선택)가 여기로 모인다 —
      // 트리거로 되돌리는 코드를 세 곳에 흩어두지 않아도 된다.
      trigger?.focus();
    };
  }, [triggerRef]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="absolute top-[calc(100%+8px)] right-0 left-0 z-30 overflow-hidden rounded-2xl bg-(--sheet)"
      style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.14), 0 0 0 1px var(--hairline)" }}
    >
      {children}
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
        /* 16px 미만이면 iOS 가 포커스 때 화면을 확대한다 (PRODUCT.md 접근성) */
        className="w-full bg-transparent text-[16px] outline-none placeholder:text-(--dim)"
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
  const [pane, setPane] = useState<HomeRegionId | "all">(region ?? "all");
  const regionTriggerRef = useRef<HTMLButtonElement>(null);
  const typeTriggerRef = useRef<HTMLButtonElement>(null);
  const channelTriggerRef = useRef<HTMLButtonElement>(null);

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

  /** 2depth 맨 줄 — 열려 있는 권역 자체. 검색 중이면 없다. */
  const wholePane =
    pane === "all" || find.trim() ? null : (groups.find((g) => g.id === pane) ?? null);
  const wholePaneCount = wholePane?.items.reduce((n, c) => n + c.placeCount, 0) ?? 0;

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
          buttonRef={regionTriggerRef}
        />
        <Trigger
          label={typeLabel}
          active={Boolean(type)}
          open={open === "type"}
          onClick={() => openMenu("type")}
          buttonRef={typeTriggerRef}
        />
        <Trigger
          label={channelLabel}
          active={Boolean(channel)}
          open={open === "channel"}
          onClick={() => openMenu("channel")}
          buttonRef={channelTriggerRef}
        />
        {trailing}
      </div>

      {open === "region" ? (
        <Panel title={m.home.regionPick} triggerRef={regionTriggerRef}>
          <Find value={find} onChange={setFind} placeholder={m.home.filterFind} />
          {/* grid 가 아니라 flex 다 — grid 의 auto 행은 max-height 로 눌러도 제 내용만큼
              키를 잡아서, 상자만 잘리고 안쪽 목록은 스크롤되지 않았다. flex 는 stretch 로
              눌린 높이를 그대로 받아 min-h-0 과 함께 스크롤이 산다. */}
          <div className="flex max-h-[min(52vh,360px)] overflow-hidden border-t border-(--hairline)">
            <div className="w-30 min-h-0 shrink-0 overflow-y-auto overscroll-contain border-r border-(--hairline) py-1">
              <button
                type="button"
                onClick={() => {
                  setPane("all");
                  onApply({ region: null, city: null, type, channel });
                  setOpen(null);
                }}
                className="flex w-full px-3 py-2.5 text-left text-[13px] font-semibold"
                style={{
                  background: !region && !city ? "var(--halo)" : undefined,
                  color: !region && !city ? "var(--wax)" : "var(--paper)",
                }}
              >
                {m.home.regionAll}
              </button>
              {visibleGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  /* 누르는 순간 적용하지 않는다 — 오른쪽 목록만 연다.
                     권역 자체를 고르는 건 그 목록 맨 위 "전체" 줄이다. */
                  onClick={() => setPane(g.id)}
                  aria-expanded={pane === g.id}
                  className="flex w-full items-center justify-between gap-1 px-3 py-2.5 text-left text-[13px] font-semibold"
                  style={{
                    background: pane === g.id ? "var(--halo)" : undefined,
                    color: pane === g.id ? "var(--wax)" : "var(--paper)",
                  }}
                >
                  <span className="min-w-0 truncate">{m.home.homeRegions[g.id]}</span>
                  {/* 고르는 줄이 아니라 여는 줄이라는 표시 — 실제 선택은 오른쪽에서 끝난다. */}
                  <CaretRight aria-hidden className="size-3 shrink-0 opacity-60" />
                </button>
              ))}
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain py-1">
              {/* 검색 중에는 안 보인다 — 그때는 도시를 찾는 중이지 권역을 고르는 중이 아니다. */}
              {wholePane ? (
                <button
                  type="button"
                  onClick={() => {
                    onApply({ region: wholePane.id, city: null, type, channel });
                    setOpen(null);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[13px] font-semibold"
                  style={{
                    background: region === wholePane.id && !city ? "var(--halo)" : undefined,
                    color: region === wholePane.id && !city ? "var(--wax)" : "var(--paper)",
                  }}
                >
                  <span>{t(m.home.regionWhole, { name: m.home.homeRegions[wholePane.id] })}</span>
                  <span className="index tnum text-(--dim)">{wholePaneCount}</span>
                </button>
              ) : null}
              {rightCities.map((c) => {
                const on = city === c.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => {
                      onApply({
                        region: pane === "all" ? null : pane,
                        city: on ? null : c.slug,
                        type,
                        channel,
                      });
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
        <Panel title={m.home.typePick} triggerRef={typeTriggerRef}>
          <Find value={find} onChange={setFind} placeholder={m.home.filterFind} />
          <div className="max-h-[min(52vh,360px)] overflow-y-auto overscroll-contain py-1">
            <button
              type="button"
              onClick={() => {
                onApply({ region, city, type: null, channel });
                setOpen(null);
              }}
              className="flex w-full px-4 py-2.5 text-left text-[13px] font-semibold"
              style={{
                background: type === null ? "var(--halo)" : undefined,
                color: type === null ? "var(--wax)" : "var(--paper)",
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
              const on = type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onApply({ region, city, type: on ? null : key, channel });
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
        <Panel title={m.home.channelPick} triggerRef={channelTriggerRef}>
          <Find value={find} onChange={setFind} placeholder={m.home.filterFind} />
          <div className="max-h-[min(52vh,360px)] overflow-y-auto overscroll-contain py-1">
            <button
              type="button"
              onClick={() => {
                onApply({ region, city, type, channel: null });
                setOpen(null);
              }}
              className="flex w-full px-4 py-2.5 text-left text-[13px] font-semibold"
              style={{
                background: channel === null ? "var(--halo)" : undefined,
                color: channel === null ? "var(--wax)" : "var(--paper)",
              }}
            >
              {m.cityDetail.allChannels}
            </button>
            {visibleCreators.map((c) => {
              const on = channel === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    onApply({ region, city, type, channel: on ? null : c.slug });
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
