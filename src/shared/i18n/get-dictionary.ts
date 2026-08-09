import type { Locale } from "./config";
import type { Messages } from "./messages/ko";
import { ko } from "./messages/ko";
import { en } from "./messages/en";

const catalogs: Record<Locale, Messages> = { ko, en };

export function getDictionary(locale: Locale): Messages {
  return catalogs[locale] ?? ko;
}

/** `"간 곳 {places}"` + `{ places: 10 }` → `"간 곳 10"` */
export function t(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}
