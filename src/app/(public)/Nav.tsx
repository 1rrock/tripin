"use client";

/**
 * 전역 진입점 — 홈 / 지도.
 *
 * 지역·종류·채널은 탭이 아니라 지도 필터다. 홈에서 고르면 `/map` 으로 간다.
 *
 * 데스크톱(lg+): 지도 옆 플로팅 아이콘 레일.
 * 태블릿: 헤더 안 텍스트+아이콘.
 * 모바일: 하단 탭바 — 헤더 밖에 둔다. 헤더 backdrop-filter 안에 fixed 를 두면
 * 뷰포트가 아니라 헤더 바닥에 붙는다.
 *
 * 계정(마이)은 어느 폭에서든 **내비의 맨 오른쪽/맨 아래**에 선다. 헤더에 두면
 * 브랜드·검색과 같은 줄에서 크롬처럼 보이는데, 실제로는 사람들이 찾아 들어가는
 * 목적지다. 탭바 넷째 칸이 그 자리다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlyphHeart, GlyphHome, GlyphMap, GlyphUser } from "@/shared/ui/glyphs";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { stripLocalePrefix } from "@/shared/i18n/paths";
import { Mark } from "@/shared/ui/Mark";

/**
 * 탭은 셋이다.
 *
 * 채널(/channels)은 화면으로는 살아 있지만 **탭에서는 뺀다** — 홈에 채널 목록이
 * 이미 있고, PRODUCT.md 의 모델도 "지역·종류·채널은 /map 필터" 다. 넷이 되면
 * 모바일 탭바에서 라벨이 좁아지고 엄지로 누르는 영역이 줄어든다.
 * 검색 유입은 /channels 로 그대로 들어오므로 SEO 는 잃지 않는다.
 */
const ITEMS = [
  { path: "/", icon: GlyphHome, labelKey: "home" },
  { path: "/map", icon: GlyphMap, labelKey: "map" },
  { path: "/saved", icon: GlyphHeart, labelKey: "saved" },
] as const;

/**
 * 계정은 배열 밖에 따로 둔다 — 홈·지도·저장은 콘텐츠를 가르는 축이고, 이건 설정함이다.
 * 레일에서는 mt-auto 로 떨어져 서고, 탭바에서는 맨 오른쪽 칸을 받는다.
 */
const ACCOUNT = { path: "/account", icon: GlyphUser } as const;

function isActive(pathname: string, href: string) {
  const bare = stripLocalePrefix(pathname);
  if (href === "/") return bare === "/";
  return bare === href || bare.startsWith(`${href}/`);
}

function useNavItems() {
  const { messages: m, href } = useLocale();
  return ITEMS.map((it) => ({
    path: it.path,
    href: href(it.path),
    label:
      it.labelKey === "home"
        ? m.common.home
        : it.labelKey === "saved"
          ? m.saved.nav
          : m.nav[it.labelKey],
    Icon: it.icon,
  }));
}

function useAccountItem() {
  const { messages: m, href } = useLocale();
  return {
    path: ACCOUNT.path,
    href: href(ACCOUNT.path),
    label: m.account.nav,
    Icon: ACCOUNT.icon,
  };
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
  const account = useAccountItem();
  const accountOn = isActive(pathname, account.path);

  return (
    <nav aria-label={m.nav.menu} className="desktop-rail">
      <Link
        href={href("/")}
        aria-label={m.brandAria}
        className="mb-1 grid size-11 place-items-center"
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
            aria-label={it.label}
            aria-current={on ? "page" : undefined}
            className="desktop-rail-btn"
          >
            <Glyph className="size-5" weight={on ? "fill" : "regular"} />
          </Link>
        );
      })}

      {/* 계정은 레일 **맨 아래**에 따로 선다. 탭 셋과 같은 무리로 보이면 안 된다 —
          홈·지도·저장은 콘텐츠를 가르는 축이고, 이건 설정함이다.
          mt-auto 가 그 거리를 만든다(레일이 bottom:16px 까지 늘어나 있다). */}
      <Link
        href={account.href}
        aria-label={account.label}
        aria-current={accountOn ? "page" : undefined}
        className="desktop-rail-btn mt-auto"
      >
        <account.Icon className="size-5" weight={accountOn ? "fill" : "regular"} />
      </Link>
    </nav>
  );
}

export function TabDock() {
  const pathname = usePathname() ?? "/";
  const { messages: m } = useLocale();
  /* 계정이 맨 오른쪽 넷째 칸이다 — 헤더에 있던 아이콘을 여기로 내렸다.
     알약 폭은 items.length 에서 뽑으니 칸이 늘어도 자리는 저절로 맞는다. */
  const items = [...useNavItems(), useAccountItem()];
  const activeIndex = items.findIndex((it) => isActive(pathname, it.path));

  return (
    <nav aria-label={m.nav.tabsAria} className="tabbar fixed inset-x-0 bottom-0 z-50 lg:hidden">
      <div className="relative mx-auto flex h-14 max-w-2xl items-stretch">
        {activeIndex >= 0 ? (
          /* 폭을 items.length 에서 뽑는다 — w-1/2 로 박아두면 탭이 늘 때
             알약이 엉뚱한 칸에 선다(실제로 저장 탭을 넣으며 겪음). */
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 transition-transform duration-[400ms] ease-[cubic-bezier(0.3,1.28,0.45,1)] motion-reduce:transition-none"
            style={{
              width: `${100 / items.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          >
            {/* 알약 높이는 아이콘+라벨 덩어리(20 + gap 3 + 12*1.2 ≈ 37px)보다 커야 한다.
                h-9(36px)일 때는 오히려 덩어리보다 작아서 아이콘 머리가 배경 밖으로
                나왔다. 48px 이면 위아래 5px 이 남고, 바(56px) 안에서도 4px 뜬다. */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                key={activeIndex}
                className="animate-nav-pill-liquid h-12 w-16 rounded-full bg-(--halo)"
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
              <Glyph className="size-5" weight={on ? "fill" : "regular"} />
              <span className="index">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
