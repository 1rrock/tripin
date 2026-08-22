/**
 * 로케일은 **URL 세그먼트**에서 온다 — 페이지·레이아웃은 `params.lang` 을 읽는다.
 *
 * 옛 `getLocale()`(→ `next/headers`) 은 지웠다: headers() 를 읽는 순간 그 트리가
 * 요청마다 렌더되어 공개 페이지 정적화(ISR)가 통째로 풀린다. 서버 컴포넌트에서
 * 로케일이 필요하면 페이지가 params 로 받아 props 로 내려보내라.
 */
export {
  LOCALE_HEADER,
  localePath,
  stripLocalePrefix,
  localeFromPathname,
  switchLocalePath,
  parseLocaleHeader,
} from "./paths";
