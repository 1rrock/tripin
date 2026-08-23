import { notFound } from "next/navigation";
import { loadCreatorMap } from "@/shared/api/creator-hub";

/**
 * 존재 판정 전용 레이아웃 — **그릴 것이 없다.** children 을 그대로 통과시킨다.
 *
 * 왜 여기인가: 같은 그룹의 `loading.tsx` 가 page 를 Suspense 로 감싸는데, 그 경계가
 * 200 헤더를 **먼저** flush 한다. page 에서 뒤늦게 부른 `notFound()` 는 상태 코드를
 * 바꾸지 못했다 — `/c/nope` 이 404 가 아니라 200 이었고, 404 문구는 RSC 플라이트
 * 안에만 있어 JS 가 돌기 전엔 HTML 에 없었다. `generateMetadata` 안에서 부르는
 * 우회도 같은 이유로 200 이다.
 *
 * Next 의 계층은 `layout > Suspense(loading) > page` 다 — 라우트 그룹 `(hub)` 도
 * 세그먼트라 이 layout 은 경계 **밖**이다. layout 이 await 하면 응답이 아직
 * flush 되지 않아 404 가 제대로 나가고, page 본문은 여전히 스켈레톤이 덮는다.
 *
 * `[creator]` 가 아니라 `(hub)` 에 두는 이유: `[creator]/layout.tsx` 로 올리면
 * 조각(`[creator]/[city]`)·영상(`[creator]/v/[videoId]`)까지 이 판정을 지나야 하는데,
 * 그 둘은 각자 더 구체적인 판정을 이미 갖고 있다.
 *
 * 로더는 `cachePublic`(React `cache` 포함)이라 page 와 첫 promise 를 나눠 쓴다.
 */
export default async function CreatorHubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  if (!(await loadCreatorMap(creator))) notFound();
  return children;
}
