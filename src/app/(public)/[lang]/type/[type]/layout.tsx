import { notFound } from "next/navigation";
import { loadTypeDetail, parsePlaceType } from "@/shared/api/place-types";

/**
 * 존재 판정 전용 레이아웃 — **그릴 것이 없다.** children 을 그대로 통과시킨다.
 *
 * 왜 여기인가: 같은 폴더의 `loading.tsx` 가 page 를 Suspense 로 감싸는데,
 * 그 경계는 200 헤더를 **먼저** flush 한다. 뒤늦게 page 에서 `notFound()` 가
 * 나도 상태 코드를 못 바꾼다 — `/type/nope` 이 404 가 아니라 200 이었고,
 * 404 문구는 RSC 플라이트 안에만 있어 JS 가 돌기 전엔 HTML 에 없었다.
 * (`generateMetadata` 안에서 부르는 우회도 같은 이유로 200 이다.)
 *
 * Next 의 계층은 `layout > Suspense(loading) > page` 다. layout 이 await 하면
 * 응답이 아직 flush 되지 않아 404 가 제대로 나가고, page 본문의 느린 작업은
 * 여전히 `loading.tsx` 스켈레톤이 덮는다 — 스켈레톤을 잃지 않는다.
 *
 * 로더는 `cachePublic`(React `cache` 포함)이라 page 와 같은 요청에서 두 번째
 * 호출은 첫 promise 를 그대로 받는다 — 중복 왕복이 아니다.
 */
export default async function TypeDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ type: string }>;
}) {
  const { type: typeParam } = await params;
  /* 닫힌 열거형이라 DB 왕복 없이 여기서 떨어진다 — `src/proxy.ts` 가 깨진 퍼센트
     이스케이프를 이 세그먼트로 rewrite 하는 것도 그래서다. */
  const type = parsePlaceType(typeParam);
  if (!type) notFound();
  if (!(await loadTypeDetail(type))) notFound();
  return children;
}
