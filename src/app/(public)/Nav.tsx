"use client";

/**
 * 전역 진입점 — 홈 / 지역 / 채널 (로케일 인식).
 *
 * 데스크톱: 헤더 안 텍스트+아이콘 줄. 홈은 브랜드 마크가 대신하므로 항목이 없다.
 * 모바일: **하단 탭바**.
 *
 * 종류(`/type`)는 도시·조각 안 필터와 검색으로만 간다. 홈에서 뺀 축을
 * 엄지 존 1/4에 두면 맛집 앱으로 읽힌다. 라우트 자체는 산다.
 *
 * 아이콘은 두 화면이 같은 걸 쓴다 — 데스크톱만 다른 글리프를 쓰면 같은 목적지가
 * 화면 폭에 따라 다른 물건으로 보인다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/shared/ui/frame";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { stripLocalePrefix } from "@/shared/i18n/paths";

function isActive(pathname: string, href: string) {
  const bare = stripLocalePrefix(pathname);
  /** 홈은 정확히 일치할 때만 — startsWith 로 두면 모든 화면에서 홈이 켜진다 */
  if (href === "/") return bare === "/";
  return bare === href || bare.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname() ?? "/";
  const { messages: m, href } = useLocale();

  const items: { path: string; label: string; icon: IconName }[] = [
    { path: "/", label: m.common.home, icon: "home" },
    { path: "/city", label: m.nav.region, icon: "pin" },
    { path: "/channels", label: m.nav.channel, icon: "channel" },
  ];

  return (
    <>
      <nav aria-label={m.nav.menu} className="hidden items-center gap-1 md:flex">
        {items.slice(1).map((it) => {
          const on = isActive(pathname, it.path);
          const Glyph = Icon[it.icon];
          return (
            <Link
              key={it.path}
              href={href(it.path)}
              aria-current={on ? "page" : undefined}
              className="nav-item index flex items-center gap-1.5 px-2.5 py-2"
            >
              <Glyph className="size-3.5" />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <nav aria-label={m.nav.tabsAria} className="tabbar fixed inset-x-0 bottom-0 z-30 flex md:hidden">
        {items.map((it) => {
          const on = isActive(pathname, it.path);
          const Glyph = Icon[it.icon];
          return (
            <Link
              key={it.path}
              href={href(it.path)}
              aria-current={on ? "page" : undefined}
              className="tab"
            >
              <Glyph className="size-[22px]" />
              <span className="index">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
