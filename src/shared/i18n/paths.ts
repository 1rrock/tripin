import { defaultLocale, type Locale, isLocale } from "./config";

export const LOCALE_HEADER = "x-tripin-locale";

/**
 * 경로에 로케일 접두사.
 * ko → `/city` · en → `/en/city` (홈은 `/` · `/en`)
 */
export function localePath(path: string, locale: Locale): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === "ko") return normalized === "" ? "/" : normalized;
  if (normalized === "/") return "/en";
  return `/en${normalized}`;
}

/** 현재 pathname(브라우저)에서 로케일 제거한 내부 경로. */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  return pathname;
}

export function localeFromPathname(pathname: string): Locale {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return "ko";
}

/** 같은 페이지의 다른 언어 URL. */
export function switchLocalePath(pathname: string, search: string, next: Locale): string {
  const bare = stripLocalePrefix(pathname);
  const base = localePath(bare, next);
  return search ? `${base}${search}` : base;
}

export function parseLocaleHeader(raw: string | null): Locale {
  return raw && isLocale(raw) ? raw : defaultLocale;
}
