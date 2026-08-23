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

/**
 * 현재 pathname 에서 로케일 접두사를 걷어낸 내부 경로.
 *
 * ⚠️ `/ko` 도 반드시 걷어야 한다. `usePathname()` 이 주소창 경로를 준다는 것은
 * **런타임에서만** 맞다 — 정적 렌더(SSG/ISR)에서는 rewrite 된 **라우트 경로**
 * (`/ko`, `/ko/map`)를 준다. 실측으로 확인했다:
 *
 *   /        aria-current 0        /en       2   ← 같은 홈인데 ko 만 비었다
 *   /map     aria-current 0        /en/map   3
 *   /saved   aria-current 3 (force-dynamic — 런타임이라 주소창 경로가 온다)
 *
 * `/ko` 를 안 걷으면 pathname 에서 파생되는 값이 ko 정적 페이지 전부에서 어긋난다:
 * `Nav.isActive` 가 한 번도 안 맞아 탭 활성 표시가 서버 HTML 에 없고(하이드레이션
 * 뒤에야 뜬다 — JS 를 안 쓰는 클라이언트엔 영영 없다), `switchLocalePath` 는
 * `/en/ko/map` 이라는 404 를 만든다.
 *
 * `/ko/about` 은 실제로 열리는 주소이기도 하다(proxy 가 bare 로 308) — 그쪽에서도
 * 걷어내는 것이 맞다.
 */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en" || pathname === "/ko") return "/";
  if (pathname.startsWith("/en/") || pathname.startsWith("/ko/")) {
    return pathname.slice(3) || "/";
  }
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
