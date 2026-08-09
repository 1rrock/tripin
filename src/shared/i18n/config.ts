/** 지원 로케일 — 기본 ko, EN 은 `/en` 접두사 (proxy rewrite). */
export const locales = ["ko", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

export function isLocale(v: string): v is Locale {
  return (locales as readonly string[]).includes(v);
}
