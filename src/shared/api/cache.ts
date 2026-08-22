import { revalidateTag, unstable_cache } from "next/cache";

/**
 * 공개 데이터 캐시.
 *
 * 로케일이 URL 세그먼트(`(public)/[lang]/`)가 되면서 공개 페이지 대부분이
 * 정적(ISR)이다 — searchParams 를 읽는 화면(지도·도시 상세·크리에이터 허브·조각)과
 * force-dynamic(저장·계정·로그인)만 요청마다 렌더된다. 이 캐시는 그 동적 화면들과
 * ISR 재생성이 Supabase 왕복을 페이지 수만큼 반복하지 않게 하는 층이다.
 *
 * ⚠️ 공개 서버 트리에서 `headers()`·`cookies()` 를 읽으면 그 라우트의 정적화가
 *    통째로 풀린다 — 요청마다 렌더 = Vercel Active CPU 소진(2026-08 무료 한도
 *    초과 사태의 원인). 로케일이 필요하면 params.lang 으로 받아라.
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
/** 라우트 핸들러의 `Cache-Tag` 헤더도 이 값을 쓴다 — 리터럴이 갈라지면
 *  `vercel cache invalidate --tag public-data` 가 그 CDN 사본을 못 지운다. */
export const PUBLIC_DATA_TAG = "public-data";

/** 태그 무효화가 안 걸린 경로를 위한 상한. 페이지의 옛 ISR 주기와 같다. */
const TTL_SECONDS = 3600;

/**
 * unstable_cache 는 직렬화 2MiB 를 넘는 항목을 **조용히** 버린다 — 빌드 로그
 * "items over 2MB can not be cached" 한 줄이 전부이고, 그 뒤로는 요청마다
 * 풀스캔이다(cities:home-map 이 실제로 그렇게 꺼진 적이 있다). 넘기 **전에**
 * 알 수 있게, 로더가 실제로 돌 때(=미스)마다 크기를 재서 80% 부터 함수 로그에
 * 경고를 남긴다. Vercel 로그에서 `[cachePublic]` 로 찾는다.
 */
const ITEM_SIZE_LIMIT = 2 * 1024 * 1024;
const ITEM_SIZE_WARN_AT = 0.8;

export function cachePublic<A extends unknown[], R>(
  loader: (...args: A) => Promise<R>,
  keyParts: string[],
): (...args: A) => Promise<R> {
  const measured = async (...args: A): Promise<R> => {
    const out = await loader(...args);
    try {
      const size = new TextEncoder().encode(JSON.stringify(out)).length;
      if (size >= ITEM_SIZE_LIMIT * ITEM_SIZE_WARN_AT) {
        const pct = Math.round((size / ITEM_SIZE_LIMIT) * 100);
        console.warn(
          `[cachePublic] ${keyParts.join("/")}(${JSON.stringify(args)}) 항목이 ` +
            `${(size / 1024 / 1024).toFixed(2)}MiB — 2MiB 상한의 ${pct}%. ` +
            `100% 를 넘는 순간 조용히 캐시가 꺼지고 매 요청 풀스캔이 된다. ` +
            `필드를 빼거나 항목을 쪼갤 것(cities.ts HomeMapPlace 주석).`,
        );
      }
    } catch {
      /* 측정 실패(순환 참조 등)가 응답을 막아선 안 된다 — 캐시 계약(직렬화 가능)
         위반은 어차피 unstable_cache 쪽에서 드러난다 */
    }
    return out;
  };
  return unstable_cache(measured, keyParts, {
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
