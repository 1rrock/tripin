"use client";

/**
 * 전역 진입점 — 지역 / 채널 / 종류.
 *
 * 축을 셋으로 연다:
 *   · 지역 — 도시부터. 그 도시에 간 **모든 채널**의 장소가 한 지도에 뜬다
 *   · 채널 — 유튜버부터. 그 사람이 간 곳만 본다
 *   · 종류 — 맛집·카페·숙소·명소 등 유형부터. 도시·채널을 몰라도 들어온다
 *
 * 전역 `/map` 은 메뉴에서 뺐다 — 도시·조각 화면에 이미 지도가 있다.
 * 모바일은 햄버거, 데스크톱은 헤더 인라인.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/shared/ui/frame";

const ITEMS: { href: string; label: string; icon: IconName; hint: string }[] = [
  { href: "/city", label: "지역", icon: "pin", hint: "도시별로 — 여러 채널이 간 곳을 한 지도에" },
  { href: "/channels", label: "채널", icon: "channel", hint: "유튜버별로 — 그 사람이 간 곳만" },
  {
    href: "/type",
    label: "종류",
    icon: "menu",
    hint: "맛집·카페·숙소·명소 — 유형부터 고르기",
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 패널 닫기는 링크의 onClick 이 한다. 경로 변화를 effect 로 감시해서 닫으면
  // 렌더 결과를 다시 렌더로 되먹이는 꼴이 되고, 뒤로가기 같은 경로 변화에도
  // 열지도 않은 패널을 닫으려 든다.

  // 패널이 열린 동안 뒤 배경이 스크롤되지 않게. Esc 로도 닫힌다
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* 데스크톱 — 헤더 인라인 */}
      <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
        {ITEMS.map((it) => {
          const on = isActive(pathname, it.href);
          const Glyph = Icon[it.icon];
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className="index flex items-center gap-1.5 px-2.5 py-2 transition-colors"
              style={{
                color: on ? "var(--paper)" : "var(--dim)",
                borderRadius: "var(--r-control)",
                boxShadow: on ? "inset 0 0 0 1px var(--wax)" : undefined,
              }}
            >
              <Glyph className="size-3.5" />
              {it.label}
            </Link>
          );
        })}
      </nav>

      {/* 모바일 — 햄버거 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="grid size-9 cursor-pointer place-items-center md:hidden"
        style={{ borderRadius: "var(--r-control)", boxShadow: "inset 0 0 0 1px var(--hairline)" }}
      >
        <Icon.menu className="size-[18px]" style={{ color: "var(--paper)" }} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="메뉴"
          className="fixed inset-0 z-50 flex flex-col md:hidden"
          style={{ background: "var(--ground)" }}
        >
          <div className="flex items-center justify-between px-(--gutter) pt-5 pb-4">
            <span
              style={{
                fontFamily: "var(--font-archivo), sans-serif",
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "0.22em",
              }}
            >
              TRIPIN
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="메뉴 닫기"
              autoFocus
              className="grid size-9 cursor-pointer place-items-center"
              style={{
                borderRadius: "var(--r-control)",
                boxShadow: "inset 0 0 0 1px var(--hairline)",
              }}
            >
              <Icon.close className="size-[18px]" />
            </button>
          </div>

          <nav aria-label="주요 메뉴" className="flex flex-col px-(--gutter)">
            {ITEMS.map((it) => {
              const on = isActive(pathname, it.href);
              const Glyph = Icon[it.icon];
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  aria-current={on ? "page" : undefined}
                  className="flex items-center gap-4 border-b py-5"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <Glyph
                    className="size-6 shrink-0"
                    style={{ color: on ? "var(--wax)" : "var(--dim)" }}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block font-bold"
                      style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.03em" }}
                    >
                      {it.label}
                    </span>
                    <span
                      className="mt-1 block"
                      style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                    >
                      {it.hint}
                    </span>
                  </span>
                  <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </>
  );
}
