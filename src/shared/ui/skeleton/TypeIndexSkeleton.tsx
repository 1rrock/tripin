/**
 * `/type` 스켈레톤 — src/app/(public)/type/page.tsx 는 두 형제 덩어리다:
 *  1) <ExplorerCanvas lead="type" .../> — 데스크톱 전용 오버레이 캔버스
 *     (src/app/(public)/HomeCanvas.tsx, surface="overlay" 일 때 루트 클래스가
 *     "canvas-page hidden lg:block")
 *  2) <main className="... lg:hidden"> 안의 <TypeIndex> — 아이콘 그리드 + ResultRow 목록
 * 두 덩어리를 같은 형제 구조로 두고, BoneRoot 는 <main> 쪽에만 씌운다.
 */

import { Bone, BoneBlock, BoneDot, BoneFrame, BoneMap, BoneRoot, times } from "./bones";

/** 아이콘 칸은 **장소가 있는 종류**만 깔린다 — 현재 6~7개라 4열에서 두 줄. 10개로 두면 세 줄이 되어 아래가 통째로 86px 밀린다 */
const GRID_ICONS = 7;
const RESULT_ROWS = 6;

export function TypeIndexSkeleton({ label }: { label: string }) {
  return (
    <>
      <div className="canvas-page hidden lg:block">
        <BoneMap />

        <section className="canvas-panel">
          <h1 className="sr-only">{label}</h1>
          <div className="px-4 pt-4 pb-1">
            <p className="text-xl font-bold tracking-[-0.03em]">
              <Bone w="4rem" />
            </p>
          </div>

          {/* 검색 알약 h-10 */}
          <div className="px-4 pt-3 pb-3">
            <div className="relative flex h-10 w-full items-center">
              <BoneBlock h={40} radius="var(--r-frame)" className="min-w-0 flex-1" />
            </div>
          </div>

          {/* CanvasFilters — 지역·종류·채널 트리거 3개 (h-9 알약) */}
          <div className="relative px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {["4.5rem", "3.5rem", "4rem"].map((w, i) => (
                <BoneBlock key={i} w={w} h={36} />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 pb-2">
            <p className="index tnum" style={{ color: "var(--dim)" }}>
              <Bone w="4rem" />
            </p>
          </div>

          <ul className="px-4 pb-6">
            {times(RESULT_ROWS).map((i) => (
              <li key={i} className={i > 0 ? "mt-5" : ""}>
                {/* 실화면은 `<button>` 이라 li 가 6px 더 크다(버튼은 아래 모서리가
                    baseline). `inline-block + overflow-hidden` 으로 같게 만든다 */}
                <span className="inline-block w-full overflow-hidden text-left">
                  <BoneFrame className="block w-full" />
                  <span className="mt-2.5 block truncate text-[15px] font-semibold tracking-[-0.01em]">
                    <Bone w="70%" />
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-(--dim)">
                    <Bone w="45%" />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <BoneRoot label={label} className="mx-auto w-full max-w-lg lg:hidden">
        <div>
          <header className="px-(--gutter) pt-4 pb-3">
            <h1 className="text-xl font-bold tracking-[-0.03em]">
              <Bone w="30%" />
            </h1>
          </header>

          <nav className="grid grid-cols-4 gap-y-3.5 px-(--gutter) pb-5 sm:grid-cols-5">
            {times(GRID_ICONS).map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <BoneDot size={48} />
                <span className="break-keep text-center text-[12px] font-medium">
                  <Bone w="80%" />
                </span>
              </div>
            ))}
          </nav>

          <hr className="rule mx-(--gutter)" />

          <ul>
            {times(RESULT_ROWS).map((i) => (
              <li key={i} className="border-b border-(--hairline)">
                <div className="flex gap-3 px-(--gutter) py-3.5">
                  <BoneFrame className="w-[112px] shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-medium text-(--dim)">
                      <Bone w="35%" />
                    </span>
                    <span className="mt-0.5 block truncate text-[15px] font-semibold tracking-[-0.01em]">
                      <Bone w="60%" />
                    </span>
                    <span className="mt-1 block truncate text-[13px] text-(--dim)">
                      <Bone w="50%" />
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </BoneRoot>
    </>
  );
}
