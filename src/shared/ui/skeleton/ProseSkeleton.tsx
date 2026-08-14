/**
 * `/about`, `/policy`, `/privacy`, `/takedown` 공용 스켈레톤.
 * 네 페이지가 공유하는 골격(각 page.tsx 참고): max-w-lg 컬럼 + 2단 브레드크럼(홈 › 현재) +
 * h1 + `max-w-[64ch]` 안에 h2/p 섹션 반복. 섹션 개수는 페이지마다 4~6개로 다르므로
 * 가장 공통되는 4개로 둔다.
 *
 * 브레드크럼이 2단(홈 › 현재)이라 BoneCrumb(3단, 홈 › 지도 › 현재)은 안 맞는다 — 여기서 직접 그린다.
 */

import { Icon } from "@/shared/ui/icons";
import { Bone, BoneRoot } from "./bones";

/** 섹션마다 문단 줄 수가 다르다 — 실제 네 페이지의 흔한 길이(3~4줄)를 따라간다 */
const SECTION_LINES = [
  ["96%", "99%", "62%"],
  ["98%", "94%", "97%", "48%"],
  ["95%", "99%", "71%"],
  ["97%", "93%", "58%"],
];

export function ProseSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot
      label={label}
      className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4"
    >
      <header className="flex flex-col gap-3 pb-1">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <span className="underline-offset-4 hover:underline">
            <Bone w="2rem" />
          </span>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>
            <Bone w="3.5rem" />
          </span>
        </nav>
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          <Bone w="3.5rem" />
        </h1>
      </header>

      <div className="flex max-w-[64ch] flex-col gap-(--block)">
        {SECTION_LINES.map((lines, i) => (
          <section key={i} className="flex flex-col gap-3">
            <h2
              style={{
                fontSize: "var(--t-title)",
                fontWeight: 700,
                color: "var(--paper)",
                letterSpacing: "-0.02em",
              }}
            >
              <Bone w="45%" />
            </h2>
            {/* 한 줄씩 block 으로 쌓는다 — 문단 자체의 line-height(1.7)를 그대로 탄다 */}
            <p style={{ fontSize: "var(--t-body)", color: "var(--dim)", lineHeight: 1.7 }}>
              {lines.map((w, j) => (
                <span key={j} className="block">
                  <Bone w={w} />
                </span>
              ))}
            </p>
          </section>
        ))}
      </div>
    </BoneRoot>
  );
}
