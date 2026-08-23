import { PUBLIC_DATA_TAG } from "@/shared/api/cache";

/**
 * 공개 목록 JSON 라우트의 **404 갈래** 응답 헤더.
 *
 * 왜 따로 있나: 여섯 라우트가 전부 성공 갈래에만 캐시 헤더를 달고, 없는 slug 에는
 * `NextResponse.json(…, { status: 404 })` 를 헤더 없이 돌려줬다. 그러면
 *   ① 404 가 CDN 에 안 앉아 없는 slug 를 두드릴 때마다 오리진 함수가 깨어나고
 *   ② 로더가 전부 `cachePublic` 인데 `unstable_cache` 는 **인자를 캐시 키에 넣으므로**
 *      없는 slug 마다 `null` 을 담은 캐시 항목이 하나씩 쌓인다.
 *
 * 성공 갈래(s-maxage 1시간)보다 짧다. 여기 걸리는 slug 는 "영원히 없는 것"이 아니라
 * **아직 안 생긴 것**이라 — 도시·채널·조각은 늘어난다 — 곧 200 이 될 주소다.
 * `max-age` 를 안 주는 것도 같은 이유다: 브라우저 사본은 태그 퍼지로 못 지운다.
 * CDN 만 60초 물고 있게 두고, 그 사본은 `Cache-Tag` 로 어드민 퍼지가 즉시 걷는다.
 *
 * 성공 갈래의 헤더 문자열은 **일부러 여기 안 넣었다** — 8개 공개 JSON 라우트가
 * 바이트까지 같아야 하는 값이라, 한 자리로 모으는 일은 그 8개를 한 번에 옮길 때
 * 할 일이지 404 를 고치는 김에 곁다리로 건드릴 것이 아니다.
 */
export const NOT_FOUND_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, max-age=0, s-maxage=60",
  "Cache-Tag": PUBLIC_DATA_TAG,
};
