import { revalidateTag, unstable_cache } from "next/cache";

/**
 * 공개 데이터 캐시.
 *
 * ⚠️ 공개 페이지는 정적이 아니다. `(public)/layout.tsx` 와 루트 `layout.tsx` 가
 *    `getLocale()` → `next/headers` 를 읽으므로 하위 트리 전체가 요청마다 렌더된다
 *    (`npm run build` 출력에서 공개 라우트가 전부 `ƒ`). 로케일이 URL 세그먼트가
 *    아니라 proxy 헤더로만 오는 구조(docs/I18N.md)의 대가다.
 *
 *    그래서 페이지의 `export const revalidate` 는 이 트리에서 아무 일도 하지 않았고,
 *    요청 한 번마다 Supabase 풀테이블 스캔이 그대로 나갔다. 렌더는 동적으로 두고
 *    **데이터 왕복만** 캐시한다 — 비용의 대부분이 렌더가 아니라 DB 에 있다.
 *
 * 규칙 두 가지:
 *
 *   1. 캐시되는 함수 안에서 `headers()`·`cookies()` 를 읽지 마라. 먼저 도착한
 *      요청의 로케일이 캐시에 굳어 EN 요청에 KO 응답이 나간다. 로더는 `name` 과
 *      `name_en` 을 **둘 다** 실어 보내고, 표시 문자열은 캐시 밖에서 고른다
 *      (`shared/i18n/display.ts`).
 *   2. 결과는 JSON 으로 직렬화된다 — `Map`·`Set`·`Date` 를 그대로 반환하면
 *      캐시를 거치며 빈 객체가 된다. 평범한 배열·객체만 돌려줄 것.
 *
 * 무효화: 어드민 액션이 공개 데이터를 바꿀 때 `purgePublicData()`.
 * `revalidatePath` 는 이 캐시를 비우지 않는다 — 둘 다 불러야 한다.
 */
const PUBLIC_DATA_TAG = "public-data";

/** 태그 무효화가 안 걸린 경로를 위한 상한. 페이지의 옛 ISR 주기와 같다. */
const TTL_SECONDS = 3600;

export function cachePublic<A extends unknown[], R>(
  loader: (...args: A) => Promise<R>,
  keyParts: string[],
): (...args: A) => Promise<R> {
  return unstable_cache(loader, keyParts, {
    tags: [PUBLIC_DATA_TAG],
    revalidate: TTL_SECONDS,
  });
}

/**
 * 공개 데이터 캐시를 **즉시** 버린다. 어드민이 공개 상태·내용을 바꿀 때 부른다.
 *
 * `{ expire: 0 }` 이 핵심이다 — Next 16 의 기본 프로필("max" 등)은
 * stale-while-revalidate 라 낡은 값이 한 번 더 나갈 수 있다. 여기서는 안 된다:
 * 삭제 요청에 따른 비공개는 법정 임시조치이고(LEGAL.md · 정보통신망법 §44조의2④)
 * 지연되면 그 자체가 문제다. 운영자가 토글 직후 결과를 보지 못하는 것도 곤란하다.
 */
export function purgePublicData(): void {
  revalidateTag(PUBLIC_DATA_TAG, { expire: 0 });
}
