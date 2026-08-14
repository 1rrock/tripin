"use client";

/**
 * 홈 랜딩 — 검색이 첫 화면, 아래로 도시·영상·채널·조각.
 *
 * 히어로는 Airbnb 알약 + Trip 종류 탭. 컷 위에 글자를 얹지 않는다.
 * 검색 알약은 바로 지도로 보내지 않는다 — 통합 검색을 연다.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react";
import type { FeedCreator, FeedPiece, FeedVideo } from "@/shared/api/home";
import type { CityRow } from "@/shared/api/cities";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { CategoryGrid } from "@/shared/ui/CategoryGrid";
import { DestinationGrid, DestinationRail } from "@/shared/ui/DestinationRail";
import { HOME_TYPES, typeIcon } from "@/shared/ui/type-icons";
import { ChannelFeed, PieceFeed, VideoFeed } from "./HomeFeeds";

const RAIL = 8;
const GRID = 12;

function openSearch() {
  window.dispatchEvent(new Event("tripin:open-search"));
}

export function HomeSheet({
  pieces,
  cities,
  videos,
  creators,
}: {
  pieces: FeedPiece[];
  cities: CityRow[];
  videos: FeedVideo[];
  creators: FeedCreator[];
}) {
  const { messages: m, href } = useLocale();
  const rail = cities.slice(0, RAIL);
  const grid = cities.slice(0, GRID);

  return (
    <div className="mx-auto w-full max-w-lg lg:max-w-5xl">
      <section className="px-(--gutter) pt-4 pb-4 lg:pt-8 lg:pb-6">
        <h1 className="sr-only">
          {m.home.title} {m.home.titleLine2}
        </h1>

        <HeroSearch />

        <nav
          className="mt-6 hidden justify-center gap-1 lg:flex"
          aria-label={m.home.filterAria}
        >
          {HOME_TYPES.map((type) => {
            const Glyph = typeIcon(type);
            return (
              <Link
                key={type}
                href={href(`/map?type=${type}`)}
                className="flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-xl px-3 py-2 text-(--paper) transition-colors hover:bg-(--hover)"
              >
                <Glyph size={22} weight="duotone" />
                <span className="text-[12px] font-medium">{m.placeTypes[type]}</span>
              </Link>
            );
          })}
        </nav>
      </section>

      <div className="lg:hidden">
        <CategoryGrid />
        <hr className="rule mx-(--gutter)" />
        <DestinationRail cities={rail} />
      </div>

      <div className="hidden lg:block">
        <DestinationGrid cities={grid} />
      </div>

      <VideoFeed videos={videos} />
      <ChannelFeed creators={creators} />
      <PieceFeed pieces={pieces} />
    </div>
  );
}

/**
 * 데스크톱: Airbnb 식 두 칸 + 산호 검색 알약.
 * 모바일: 한 칸 — 종류는 아래 그리드가 맡는다.
 * 검색 칸·버튼은 통합 검색을 연다. 종류만 지도 필터로 직행한다.
 */
function HeroSearch() {
  const { messages: m, href } = useLocale();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={openSearch}
        aria-label={m.home.searchAria}
        className="relative flex h-12 w-full items-center rounded-full bg-(--hover) pr-3 pl-11 text-left active:bg-[#ededed] lg:hidden"
      >
        <MagnifyingGlass
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-(--dim)"
        />
        <span className="truncate text-base text-(--dim)">{m.home.goWhere}</span>
      </button>

      <div
        ref={box}
        className="relative hidden items-center rounded-full bg-white lg:flex"
        style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.10), 0 0 0 1px var(--hairline)" }}
      >
        <button
          type="button"
          onClick={openSearch}
          className="flex min-w-0 flex-1 flex-col justify-center rounded-l-full py-3.5 pr-4 pl-6 text-left transition-colors hover:bg-(--hover)"
        >
          <span className="text-[12px] font-bold">{m.home.goWhere}</span>
          <span className="mt-0.5 truncate text-[14px] text-(--dim)">{m.home.goWhereHint}</span>
        </button>
        <span aria-hidden className="h-8 w-px shrink-0 bg-(--hairline)" />
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center py-3.5 pr-3 pl-5 text-left transition-colors hover:bg-(--hover)"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-bold">{m.home.whatToSee}</span>
              <span className="mt-0.5 block truncate text-[14px] text-(--dim)">
                {m.home.whatToSeeHint}
              </span>
            </span>
            <CaretDown className={`size-3.5 shrink-0 text-(--dim) ${open ? "rotate-180" : ""}`} />
          </button>
          {open ? (
            <ul
              role="listbox"
              className="absolute top-[calc(100%+10px)] right-0 left-0 z-20 overflow-hidden rounded-2xl bg-white py-1"
              style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.14), 0 0 0 1px var(--hairline)" }}
            >
              {HOME_TYPES.map((type) => {
                const Glyph = typeIcon(type);
                return (
                  <li key={type}>
                    <Link
                      href={href(`/map?type=${type}`)}
                      role="option"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-medium hover:bg-(--hover)"
                    >
                      <Glyph size={18} weight="duotone" />
                      {m.placeTypes[type]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={openSearch}
          aria-label={m.home.searchGo}
          className="m-2 grid size-12 shrink-0 place-items-center rounded-full bg-(--wax) text-white transition-opacity hover:opacity-90"
        >
          <MagnifyingGlass className="size-5" weight="bold" />
        </button>
      </div>
    </div>
  );
}
