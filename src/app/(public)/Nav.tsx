"use client";

/**
 * 전역 진입점 — 지역 / 채널 / 종류 (로케일 인식).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/shared/ui/frame";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { stripLocalePrefix } from "@/shared/i18n/paths";

function isActive(pathname: string, href: string) {
  const bare = stripLocalePrefix(pathname);
  return bare === href || bare.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname() ?? "/";
  const { messages: m, href } = useLocale();
  const [open, setOpen] = useState(false);

  const items: { path: string; label: string; icon: IconName; hint: string }[] = [
    { path: "/city", label: m.nav.region, icon: "pin", hint: m.nav.regionHint },
    { path: "/channels", label: m.nav.channel, icon: "channel", hint: m.nav.channelHint },
    { path: "/type", label: m.nav.type, icon: "menu", hint: m.nav.typeHint },
  ];

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
      <nav aria-label={m.nav.menu} className="hidden items-center gap-1 md:flex">
        {items.map((it) => {
          const on = isActive(pathname, it.path);
          const Glyph = Icon[it.icon];
          return (
            <Link
              key={it.path}
              href={href(it.path)}
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

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={m.nav.openMenu}
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
          aria-label={m.nav.menu}
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
              aria-label={m.nav.closeMenu}
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

          <nav aria-label={m.nav.menu} className="flex flex-col px-(--gutter)">
            {items.map((it) => {
              const on = isActive(pathname, it.path);
              const Glyph = Icon[it.icon];
              return (
                <Link
                  key={it.path}
                  href={href(it.path)}
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
