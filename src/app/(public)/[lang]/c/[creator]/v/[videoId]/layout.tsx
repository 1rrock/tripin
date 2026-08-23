import { notFound } from "next/navigation";
import { loadVideoDetail } from "@/shared/api/videos";

/**
 * 존재 판정 전용 레이아웃 — **그릴 것이 없다.** children 을 그대로 통과시킨다.
 *
 * 왜 여기인가: 같은 폴더의 `loading.tsx` 가 page 를 Suspense 로 감싸는데, 그 경계가
 * 200 헤더를 **먼저** flush 한다. page 에서 뒤늦게 부른 `notFound()` 는 상태 코드를
 * 바꾸지 못했다 — `/c/x/v/BADID` 가 404 가 아니라 200 이었다. (이 라우트의
 * `loading.tsx` 를 지웠다가 되돌리는 통제 실험으로 인과가 확정된 자리다.)
 *
 * Next 의 계층은 `layout > Suspense(loading) > page` 다. layout 이 await 하면
 * 응답이 아직 flush 되지 않아 404 가 제대로 나가고, page 본문은 여전히
 * `loading.tsx` 스켈레톤이 덮는다 — 스켈레톤을 잃지 않는다.
 *
 * 로더는 `cachePublic`(React `cache` 포함)이라 page·generateMetadata 와 첫
 * promise 를 나눠 쓴다.
 */
export default async function VideoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ creator: string; videoId: string }>;
}) {
  const { creator, videoId } = await params;
  if (!(await loadVideoDetail(creator, videoId))) notFound();
  return children;
}
