/**
 * `/celebs` 뼈대 — `src/app/(public)/[lang]/celebs/page.tsx` 의 미러.
 *
 * 인물별 그룹 문법: 헤더(헤드라인 + 인트로) → sticky 앵커 칩 줄 → 인물마다
 * (바 + 이름 + 곳 수) 헤더와 2열/4열 카드 그리드. `Frame`·`Index`는 텍스트가
 * 없거나 얇은 레이아웃 조각이라 실제 컴포넌트를 쓰고, 글자·썸네일 자리에만
 * Bone 계열을 넣는다.
 */

import { Index } from "@/shared/ui/frame";
import { Bone, BoneChip, BoneFrame, BoneRoot, times } from "@/shared/ui/skeleton/bones";

const CHIPS = ["4rem", "3rem", "4.5rem", "3rem", "3.5rem"];
const SECTIONS = 2;
const CARDS_PER_SECTION = 4;

export default function Loading() {
  return (
    <BoneRoot label="…" className="mx-auto w-full max-w-lg pb-14 lg:max-w-5xl">
      <header className="px-(--gutter) pt-6">
        <p
          aria-hidden
          className="text-[28px] leading-[1.12] font-black tracking-[-0.045em] lg:text-[36px]"
        >
          <Bone w="55%" />
        </p>
        <p className="mt-2 text-[14px] text-(--dim)">
          <Bone w="70%" />
        </p>
      </header>

      {/* 인물 앵커 칩 — 실화면과 같은 sticky 자리에 세운다 */}
      <div
        className="no-scrollbar sticky top-(--site-header-h) z-10 mt-4 flex gap-1.5 overflow-x-auto bg-(--ground) px-(--gutter) py-2.5"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        {CHIPS.map((w, i) => (
          <BoneChip key={i} w={w} />
        ))}
      </div>

      {times(SECTIONS).map((i) => (
        <section key={i} className="scroll-mt-14 pt-9">
          <div className="flex items-baseline gap-2.5 px-(--gutter)">
            <span
              aria-hidden
              className="h-[3px] w-[18px] self-center"
              style={{ background: "var(--wax)" }}
            />
            <h2 className="text-xl font-bold tracking-[-0.03em]">
              <Bone w="5rem" />
            </h2>
            <Index>
              <Bone w="3rem" />
            </Index>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 px-(--gutter) lg:grid-cols-4">
            {times(CARDS_PER_SECTION).map((j) => (
              <li key={j} className="min-w-0">
                <BoneFrame className="block w-full" />
                <p className="mt-2 text-[14px] font-semibold tracking-[-0.01em]">
                  <Bone w="70%" />
                </p>
                <p className="mt-0.5 text-[12px] text-(--dim)">
                  <Bone w="45%" />
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </BoneRoot>
  );
}
