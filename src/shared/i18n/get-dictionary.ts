import type { Locale } from "./config";
import type { Messages } from "./messages/ko";
import { ko } from "./messages/ko";
import { en } from "./messages/en";

const catalogs: Record<Locale, Messages> = { ko, en };

export function getDictionary(locale: Locale): Messages {
  return catalogs[locale] ?? ko;
}

/**
 * `"간 곳 {places}"` + `{ places: 10 }` → `"간 곳 10"`
 *
 * 복수형: `{n|clip|clips}` 는 변수 `n` 이 1 이면 앞쪽, 아니면 뒤쪽을 쓴다.
 * 한국어는 수 일치가 없어 ko 카탈로그에는 이 문법이 등장하지 않는다 —
 * 영어에서 "1 types" 같은 문장이 나오는 것을 막으려고 둔 최소 장치다.
 */
export function t(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template
    .replace(
      /\{(\w+)\|([^|{}]*)\|([^|{}]*)\}/g,
      (_, key: string, one: string, many: string) =>
        Number(vars[key]) === 1 ? one : many,
    )
    .replace(/\{(\w+)\}/g, (_, key: string) =>
      vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
    );
}
