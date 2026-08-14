/**
 * `/type/[type]` 스켈레톤 — src/app/(public)/type/[type]/page.tsx 의 JSX 를 그대로 베낀다.
 * Rule·Frame(wrapper span)·Index 는 텍스트가 없거나 얇은 레이아웃 조각이라 실제 컴포넌트를 쓰고,
 * 글자·썸네일 자리에만 Bone 계열을 넣었다.
 */

import { Index, Rule } from "@/shared/ui/frame";
import { Icon } from "@/shared/ui/icons";
import { Bone, BoneAct, BoneChip, BoneCrumb, BoneFrame, BoneRoot, times } from "./bones";

const CITY_SECTIONS = 3;
const ROWS_PER_CITY = 4;

export function TypeDetailSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot
      label={label}
      className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4"
    >
      <header className="flex flex-col gap-3">
        <BoneCrumb last="4rem" />

        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          <Bone w="40%" />
        </h1>
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          <Bone w="8rem" />
        </p>
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)", lineHeight: 1.65 }}>
          <Bone w="90%" />
        </p>
      </header>

      <div className="flex flex-col gap-(--block)">
        {times(CITY_SECTIONS).map((gi) => (
          <section key={gi} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-bold" style={{ fontSize: "var(--t-title)", letterSpacing: "-0.025em" }}>
                <Bone w="5rem" />
                <span className="index tnum ml-2 font-normal" style={{ color: "var(--dim)" }}>
                  <Bone w="3rem" />
                </span>
              </h2>
              <BoneChip w="5.5rem" className="self-center" />
            </div>

            <ol className="flex flex-col">
              {times(ROWS_PER_CITY).map((i) => (
                <li key={i}>
                  <Rule />
                  <div className="flex items-start gap-3.5 py-(--stack)">
                    <span className="w-[104px] shrink-0 sm:w-[132px]">
                      <BoneFrame />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <Index tone="wax" className="tnum shrink-0">
                          <Bone w="1.4rem" />
                        </Index>
                        <p
                          className="min-w-0 font-bold"
                          style={{
                            fontSize: "var(--t-title)",
                            letterSpacing: "-0.025em",
                            lineHeight: 1.3,
                          }}
                        >
                          <Bone w="70%" />
                        </p>
                      </div>
                      <p className="mt-1" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
                        <Bone w="45%" />
                      </p>
                      <p className="mt-0.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
                        <Bone w="60%" />
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <BoneAct w="6rem" />
                        <BoneAct w="4.5rem" />
                        <BoneChip w="5rem" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              <Rule />
            </ol>
          </section>
        ))}
      </div>

      <span className="index inline-flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
        <Icon.back className="size-3.5" />
        <Bone w="5rem" />
      </span>
    </BoneRoot>
  );
}
