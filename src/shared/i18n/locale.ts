import { headers } from "next/headers";
import { LOCALE_HEADER, parseLocaleHeader } from "./paths";
import type { Locale } from "./config";

export {
  LOCALE_HEADER,
  localePath,
  stripLocalePrefix,
  localeFromPathname,
  switchLocalePath,
} from "./paths";

/** 서버 컴포넌트 전용 — proxy 가 심어 둔 헤더. 클라이언트에서 import 금지. */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  return parseLocaleHeader(h.get(LOCALE_HEADER));
}
