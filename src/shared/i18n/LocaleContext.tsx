"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages/ko";
import { t as format } from "./get-dictionary";

type Ctx = {
  locale: Locale;
  messages: Messages;
  /** path without locale prefix → localized href */
  href: (path: string) => string;
  t: (template: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const href = (path: string) => {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (locale === "ko") return normalized;
    if (normalized === "/") return "/en";
    return `/en${normalized}`;
  };

  return (
    <LocaleContext.Provider
      value={{
        locale,
        messages,
        href,
        t: format,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
