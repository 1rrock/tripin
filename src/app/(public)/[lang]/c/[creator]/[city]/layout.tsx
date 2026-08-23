import { notFound } from "next/navigation";
import { loadPiece, type PageParams } from "./loader";

/**
 * 존재 판정 전용 레이아웃 — **그릴 것이 없다.** children 을 그대로 통과시킨다.
 *
 * 왜 여기인가: 같은 폴더의 `loading.tsx` 가 page 를 Suspense 로 감싸는데, 그 경계가
 * 200 헤더를 **먼저** flush 한다. page 에서 뒤늦게 부른 `notFound()` 는 상태 코드를
 * 바꾸지 못했다 — `/c/x/nowhere` 가 404 가 아니라 200 이었고, 404 문구는 RSC
 * 플라이트 안에만 있어 JS 가 돌기 전엔 HTML 에 없었다. `generateMetadata` 안에서
 * 부르는 우회도 같은 이유로 200 이다 — 메타데이터 해석도 경계 뒤에 있다.
 *
 * Next 의 계층은 `layout > Suspense(loading) > page` 다. layout 이 await 하면
 * 응답이 아직 flush 되지 않아 404 가 제대로 나가고, page 본문(535곳짜리 조각이
 * 있다)은 여전히 `loading.tsx` 스켈레톤이 덮는다 — 스켈레톤을 잃지 않는다.
 *
 * `loadPiece` 는 `cachePublic`(React `cache` 포함)이라 page·generateMetadata 와
 * 같은 요청 안에서는 첫 promise 를 나눠 쓴다 — 중복 왕복이 아니다.
 *
 * 확정 핀 미달 조각은 여기서 404 로 떨어뜨리지 않는다 — page 가 200 + noindex 의
 * "준비 중" 화면을 그린다(`PendingPiece`).
 */
export default async function CreatorCityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<PageParams>;
}) {
  const { creator, city } = await params;
  if (!(await loadPiece({ creator, city }))) notFound();
  return children;
}
