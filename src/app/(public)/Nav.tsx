"use client";

/**
 * 전역 진입점 — 홈 / 지역 / 채널.
 *
 * 데스크톱(lg+): 지도 위 플로팅 아이콘 레일.
 * 태블릿: 헤더 안 텍스트+아이콘.
 * 모바일: 하단 탭바 — 헤더 밖에 둔다. 헤더 backdrop-filter 안에 fixed 를 두면
 * 뷰포트가 아니라 헤더 바닥에 붙는다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, MagnifyingGlass, MapPin, Playlist, SquaresFour } from "@phosphor-icons/react";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { stripLocalePrefix } from "@/shared/i18n/paths";
import { Mark } from "@/shared/ui/Mark";
import { LanguageSwitch } from "./LanguageSwitch";

const ITEMS = [
  { path: "/", icon: House, labelKey: "home" },
  { path: "/city", icon: MapPin, labelKey: "region" },
  { path: "/type", icon: SquaresFour, labelKey: "type" },
  { path: "/channels", icon: Playlist, labelKey: "channel" },
] as const;

function isActive(pathname: string, href: string) {
  const bare = stripLocalePrefix(pathname);
  if (href === "/") return bare === "/";
  if (href === "/channels") return bare === "/channels" || bare.startsWith("/c/");
  return bare === href || bare.startsWith(`${href}/`);
}

function useNavItems() {
  const { messages: m, href } = useLocale();
  return ITEMS.map((it) => ({
    path: it.path,
    href: href(it.path),
    label: it.labelKey === "home" ? m.common.home : m.nav[it.labelKey],
    Icon: it.icon,
  }));
}

export function Nav() {
  const pathname = usePathname() ?? "/";
  const { messages: m } = useLocale();
  const items = useNavItems();

  return (
    <nav aria-label={m.nav.menu} className="hidden items-center gap-0.5 md:flex lg:hidden">
      {items.slice(1).map((it) => {
        const on = isActive(pathname, it.path);
        const Glyph = it.Icon;
        return (
          <Link
            key={it.path}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className="nav-item index flex items-center gap-1.5 px-2.5 py-2"
          >
            <Glyph className="size-3.5" weight={on ? "fill" : "regular"} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DesktopRail() {
  const pathname = usePathname() ?? "/";
  const { messages: m, href } = useLocale();
  const items = useNavItems();

  return (
    <nav aria-label={m.nav.menu} className="desktop-rail">
      <Link
        href={href("/")}
        aria-label={m.brandAria}
        className="mb-2 grid size-11 place-items-center"
      >
        <Mark className="size-7" />
      </Link>
      {items.map((it) => {
        const on = isActive(pathname, it.path);
        const Glyph = it.Icon;
        return (
          <Link
            key={it.path}
            href={it.href}
            aria-current={on ? "page" : undefined}
            aria-label={it.label}
            title={it.label}
            className="desktop-rail-btn"
          >
            <Glyph className="size-[22px]" weight={on ? "fill" : "regular"} />
          </Link>
        );
      })}
      <button
        type="button"
        className="desktop-rail-btn"
        aria-label={m.search.open}
        title={m.search.open}
        onClick={() => window.dispatchEvent(new Event("tripin:open-search"))}
      >
        <MagnifyingGlass className="size-[22px]" />
      </button>
      <div className="mt-auto flex justify-center px-0.5">
        <LanguageSwitch />
      </div>
    </nav>
  );
}

export function TabDock() {
  const pathname = usePathname() ?? "/";
  const { messages: m } = useLocale();
  const items = useNavItems();
  const activeIndex = items.findIndex((it) => isActive(pathname, it.path));

  return (
    <nav aria-label={m.nav.tabsAria} className="tabbar fixed inset-x-0 bottom-0 z-50 lg:hidden">
      <div className="relative mx-auto flex h-14 max-w-2xl items-stretch">
        {activeIndex >= 0 ? (
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/4 transition-transform duration-[400ms] ease-[cubic-bezier(0.3,1.28,0.45,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                key={activeIndex}
                className="animate-nav-pill-liquid h-9 w-16 rounded-full bg-(--halo)"
              />
            </div>
          </div>
        ) : null}
        {items.map((it) => {
          const on = isActive(pathname, it.path);
          const Glyph = it.Icon;
          return (
            <Link
              key={it.path}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className="tab relative z-[1]"
            >
              <Glyph className="size-[22px]" weight={on ? "fill" : "regular"} />
              <span className="index">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
