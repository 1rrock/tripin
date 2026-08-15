/**
 * 홈 뼈대 — `src/app/(public)/HomeSheet.tsx` + `HomeFeeds.tsx` 의 미러.
 *
 * 홈은 모바일과 데스크톱이 **다른 물건**이다:
 *   모바일 — 지면 카드 → 종류 그리드 10칸 → 룰 → 도시 가로 롤 → 피드 3덩어리
 *   데스크톱 — 지면 카드 → 도시 4열 그리드 → 피드(영상만 4열)
 * 그래서 스켈레톤도 `lg:hidden` / `hidden lg:block` 을 실화면 그대로 들고 간다.
 * 한쪽만 그리면 반대쪽 화면에서 로딩과 본화면이 통째로 어긋난다.
 */

import { Bone, BoneBlock, BoneDot, BoneFrame, BoneRoot, times } from "./bones";

/** 섹션 머리 — HomeFeeds 의 `<Head>` 와 같은 줄 */
function Head({ w = "6.5rem" }: { w?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-(--gutter)">
      <h2 className="text-xl font-bold tracking-[-0.03em] lg:text-2xl">
        <Bone w={w} />
      </h2>
      <span className="text-[13px] font-medium">
        <Bone w="3.25rem" />
      </span>
    </div>
  );
}

export function HomeSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot label={label}>
      {/* 히어로 — FieldHero. 피드 컬럼 밖으로 전폭 */}
      <section className="px-(--gutter) pt-7 pb-7 lg:px-14 lg:pt-[60px] lg:pb-14">
        <div className="max-w-[520px]">
          <h2 className="text-[32px] leading-[1.08] font-black tracking-[-0.048em] lg:text-[52px]">
            <Bone w="16rem" />
          </h2>
          <div className="mt-5 lg:mt-7">
            <BoneBlock h={52} className="lg:h-14" />
          </div>
          <div className="mt-3.5 flex gap-1.5 lg:mt-[18px]">
            {times(4).map((i) => (
              <BoneBlock key={i} w={72} h={32} />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-lg lg:max-w-5xl">

        {/* ── 모바일: 종류 그리드 + 도시 롤 ───────────────────────── */}
        <div className="lg:hidden">
          {/* CategoryGrid — 5열 × (종류 7 + 도구 3) */}
          <div className="grid grid-cols-5 gap-y-5 px-(--gutter) pb-6">
            {times(10).map((i) => (
              <span key={i} className="flex flex-col items-center gap-1.5">
                <BoneDot size={48} />
                <span className="text-center text-[12px] font-medium">
                  <Bone w="2.5rem" />
                </span>
              </span>
            ))}
          </div>

          <hr className="rule mx-(--gutter)" />

          {/* DestinationRail */}
          <section className="pt-5">
            <div className="flex items-baseline justify-between gap-3 px-(--gutter)">
              <h2 className="text-xl font-bold tracking-[-0.03em]">
                <Bone w="6rem" />
              </h2>
              <span className="text-[13px] font-medium">
                <Bone w="4rem" />
              </span>
            </div>
            <ul className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto px-(--gutter) pb-1">
              {times(8).map((i) => (
                <li key={i} className="w-[132px] shrink-0">
                  <BoneFrame className="block w-full" />
                  <p className="mt-2.5 text-[14px] font-semibold">
                    <Bone w="60%" />
                  </p>
                  <p className="text-[12px]">
                    <Bone w="85%" />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ── 데스크톱: 도시 4열 그리드 ───────────────────────────── */}
        <div className="hidden lg:block">
          <section className="px-(--gutter) pt-2 pb-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-[-0.03em]">
                <Bone w="7rem" />
              </h2>
              <span className="text-[13px] font-medium">
                <Bone w="4rem" />
              </span>
            </div>
            <ul className="mt-5 grid grid-cols-4 gap-x-4 gap-y-8">
              {times(12).map((i) => (
                <li key={i} className="min-w-0">
                  <BoneFrame className="block w-full" />
                  <p className="mt-2.5 text-[16px] font-semibold">
                    <Bone w="55%" />
                  </p>
                  <p className="text-[12px]">
                    <Bone w="80%" />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 최근 영상 — 모바일 가로 롤, 데스크톱 4열 */}
        <section className="pt-8 lg:pt-12">
          <Head w="6.5rem" />
          <ul className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-(--gutter) pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
            {times(8).map((i) => (
              <li key={i} className="w-[220px] shrink-0 lg:w-auto">
                <BoneFrame className="block w-full" />
                <p className="mt-2.5 text-[15px] font-semibold tracking-[-0.01em]">
                  <Bone w="65%" />
                </p>
                <p className="mt-0.5 text-[13px]">
                  <Bone w="45%" />
                </p>
                <p className="mt-0.5 text-[12px]">
                  <Bone w="80%" />
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 채널 롤 — 아바타 + 컷 4 */}
        <section className="pt-8 lg:pt-12">
          <Head w="5rem" />
          <ul className="mt-4 flex flex-col">
            {times(6).map((i) => (
              <li key={i} className="border-b border-(--hairline)">
                <div className="block px-(--gutter) py-4">
                  <span className="flex items-center gap-3.5">
                    <BoneDot size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 text-[15px] font-bold tracking-[-0.02em]">
                          <Bone w="7rem" />
                        </span>
                        <span className="index shrink-0">
                          <Bone w="3.5rem" />
                        </span>
                      </span>
                      <span className="mt-0.5 block">
                        <span className="index">
                          <Bone w="11rem" />
                        </span>
                      </span>
                    </span>
                  </span>
                  <span className="mt-3 grid grid-cols-4 gap-2">
                    {times(4).map((j) => (
                      <BoneFrame key={j} className="block w-full" />
                    ))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 조각 — 채널×도시 가로 롤 */}
        <section className="pt-8 pb-4 lg:pt-12 lg:pb-6">
          <Head w="7.5rem" />
          <ul className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-(--gutter) pb-1">
            {times(8).map((i) => (
              <li key={i} className="w-[168px] shrink-0 lg:w-[200px]">
                <BoneFrame className="block w-full" />
                <p className="mt-2.5 text-[15px] font-semibold tracking-[-0.01em]">
                  <Bone w="60%" />
                </p>
                <p className="mt-0.5 text-[12px]">
                  <Bone w="85%" />
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </BoneRoot>
  );
}
