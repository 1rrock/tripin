import type { Metadata } from "next";
import { Suspense } from "react";
import { Boards } from "./Boards";

export const metadata: Metadata = {
  title: "히어로 시안",
  robots: { index: false, follow: false },
};

/**
 * 홈 히어로 문구·레이아웃 비교판. 색인하지 않는다.
 * 고른 안만 HomeSheet 에 옮긴다.
 */
export default function HeroConceptsPage() {
  return (
    /* Boards 가 useSearchParams() 를 쓴다 — Suspense 없이는 정적 프리렌더 실패 */
    <Suspense fallback={null}>
      <Boards />
    </Suspense>
  );
}
