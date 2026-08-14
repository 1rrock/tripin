/**
 * `/channels` 뼈대 — `src/app/(public)/channels/page.tsx` 의 미러.
 *
 * 채널 하나가 롤 하나: 아바타 + 이름/영상·곳 수 + 핸들·도시 줄 + 컷 4장.
 * 컷 줄은 모바일에서 가로 스크롤(`w-[46%]`), sm 부터 4열 그리드로 바뀐다 —
 * 실화면의 분기를 그대로 들고 와야 두 화면이 같은 자리에 선다.
 */

import { Bone, BoneDot, BoneFrame, BoneRoot, times } from "./bones";

const ROWS = 6;

export function ChannelsSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot
      label={label}
      className="mx-auto flex w-full max-w-lg flex-col px-(--gutter) pt-4 lg:max-w-3xl"
    >
      <header className="pb-3">
        <h1 className="text-xl font-bold tracking-[-0.03em] lg:text-2xl">
          <Bone w="3.5rem" />
        </h1>
      </header>

      <ul className="mt-(--stack) flex flex-col">
        {times(ROWS).map((i) => (
          <li key={i}>
            {i > 0 ? <hr className="rule" /> : null}
            <div className="-mx-2.5 block rounded-(--r-control) px-2.5 py-(--stack)">
              <span className="flex items-center gap-3.5">
                <BoneDot size={42} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span
                      className="min-w-0 font-bold"
                      style={{
                        fontSize: "var(--t-title)",
                        letterSpacing: "-0.025em",
                        lineHeight: 1.15,
                      }}
                    >
                      <Bone w="8rem" />
                    </span>
                    <span className="index tnum shrink-0">
                      <Bone w="5.5rem" />
                    </span>
                  </span>
                  <span className="mt-0.5 block leading-none">
                    <span className="index">
                      <Bone w="12rem" />
                    </span>
                  </span>
                </span>
              </span>

              <span className="no-scrollbar -mx-(--gutter) mt-3 flex gap-2 overflow-x-auto px-(--gutter) sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
                {times(4).map((j) => (
                  <BoneFrame key={j} className="w-[46%] shrink-0 sm:w-auto" />
                ))}
              </span>
            </div>
          </li>
        ))}
        <hr className="rule" />
      </ul>
    </BoneRoot>
  );
}
