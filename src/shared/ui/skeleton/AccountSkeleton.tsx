/**
 * `/account` 뼈대 — `src/app/(public)/account/page.tsx` 와 `rows.tsx` 의 미러.
 *
 * 화면 전체가 한 가지 행이다(시안 C, 설정 줄): 왼쪽 라벨 · 오른쪽 값 · 헤어라인.
 * 행 높이가 `h-13` 으로 박혀 있어서 뼈가 글줄 길이에 흔들리지 않는다 — 이 화면의
 * 스켈레톤이 실화면과 어긋날 수 있는 자리는 **섹션 수와 행 수**뿐이다.
 *
 * 모바일은 라벨이 행들 위에 얹힌 한 단, lg 부터 라벨이 왼쪽 단(9rem)으로 빠지고
 * 행이 오른쪽 34rem 단에 선다. 그 분기를 그대로 들고 간다 — 한 단으로만 그리면
 * 데스크톱에서 라벨과 행이 통째로 왼쪽으로 밀렸다가 제자리를 찾는다.
 *
 * 사람마다 다른 자리가 둘 있다. 둘 다 **로그인 안 한 사람** 기준으로 깐다 —
 * 하트·저장은 로그인 없이 되는 설계라(LoginPanel 주석) 이 화면을 여는 사람의
 * 대다수가 그쪽이다.
 *   구독 섹션 — 한 채널 + "채널 둘러보기". 0명이면 안내 한 줄 + 그 행이라 높이가
 *               가깝다. 예전에는 셋을 깔아 흔한 경우보다 130px 을 더 먹었다.
 *   마지막   — 라벨 없는 로그인 패널(제목·안내·공급자 4줄). 로그인한 사람에게는
 *               "계정" 세 행이 서지만, 그쪽은 이 화면을 훨씬 덜 연다.
 */

import type { ReactNode } from "react";
import { Icon } from "@/shared/ui/icons";
import { Bone, BoneBlock, BoneDot, BoneRoot, times } from "./bones";

/** `rows.tsx` 의 `RowSection` — 라벨 단 + 행 단. 라벨은 없을 수 있다(로그인 패널) */
function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 lg:grid lg:grid-cols-[9rem_minmax(0,34rem)] lg:gap-x-10">
      {label ? (
        <p className="text-[length:var(--t-index)] leading-[1.2] font-semibold tracking-[-0.01em] lg:pt-3.5 lg:text-[length:var(--t-title)] lg:font-bold">
          <Bone w={label} />
        </p>
      ) : null}
      {/* 라벨이 없어도 행은 늘 오른쪽 단 — 섹션끼리 왼쪽 선이 어긋나지 않게 */}
      <div className="flex min-w-0 flex-col gap-1.5 lg:col-start-2 lg:row-start-1">{children}</div>
    </section>
  );
}

/** `LoginPanel` — 제목·안내 두 줄·공급자 버튼 4개(h-11, 사이 8px) */
function BoneLoginPanel() {
  return (
    <section className="flex w-full flex-col gap-3">
      <div>
        <p className="font-extrabold" style={{ fontSize: "var(--t-title)" }}>
          <Bone w="3.5rem" />
        </p>
        {/* 안내는 모바일에서 두 줄로 접히고, lg 부터는 행 단이 34rem 이라 한 줄에 든다.
            둘째 줄을 늘 그리면 데스크톱에서 패널이 19.5px 더 크다(실측). */}
        <p className="mt-0.5" style={{ fontSize: "var(--t-meta)" }}>
          <span className="block">
            <Bone w="97%" />
          </span>
          <span className="block lg:hidden">
            <Bone w="42%" />
          </span>
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {times(4).map((i) => (
          <li key={i}>
            <BoneBlock h={44} radius="var(--r-frame)" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** `rows.tsx` 의 `RowItem` + `rowShellClass`. 높이 h-13 은 실화면과 같아야 한다 */
function Row({
  label,
  value,
  avatar = false,
  chip = false,
  chevron = false,
}: {
  label: string;
  value?: string;
  /** 구독 행의 프로필 원(30) */
  avatar?: boolean;
  /** 구독 행 오른쪽 "구독 중" 칩 — `h-8 px-2.5` */
  chip?: boolean;
  chevron?: boolean;
}) {
  return (
    <li className="border-t first:border-t-0" style={{ borderColor: "var(--hairline)" }}>
      <div className="-mx-2 flex h-13 w-full items-center gap-3 rounded-(--r-control) px-2">
        {avatar ? (
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <BoneDot size={30} />
            <span className="min-w-0 flex-1" style={{ fontSize: "var(--t-body)", fontWeight: 600 }}>
              <Bone w={label} />
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1" style={{ fontSize: "var(--t-body)", fontWeight: 600 }}>
            <Bone w={label} />
          </span>
        )}

        {value ? (
          <span className="shrink-0" style={{ fontSize: "var(--t-meta)" }}>
            <Bone w={value} />
          </span>
        ) : null}
        {/* 칩은 정사각형이 아니다 — BoneDot 은 인라인 width 가 박혀 있어 못 늘린다 */}
        {chip ? <BoneBlock w="3.5rem" h={32} className="shrink-0" /> : null}
        {chevron ? <Icon.chevron className="roll-go size-4 shrink-0" /> : null}
      </div>
    </li>
  );
}

export function AccountSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot
      label={label}
      className="mx-auto flex w-full max-w-lg flex-col gap-6 px-(--gutter) pt-4 pb-(--block) lg:max-w-3xl lg:gap-9 lg:pt-10"
    >
      {/* 모바일에서는 제목을 공용 헤더가 든다(HeaderLead) — 여기서는 접힌다 */}
      <h1
        className="sr-only lg:not-sr-only"
        style={{ fontSize: "var(--t-display)", fontWeight: 700, letterSpacing: "-0.02em" }}
      >
        <Bone w="6rem" />
      </h1>

      {/* 저장 — 두 행은 누구에게나 똑같이 선다. 이 화면에서 유일하게 확실한 자리 */}
      <Section label="2.5rem">
        <ul>
          <Row label="5rem" value="3rem" chevron />
          <Row label="3.5rem" value="3rem" chevron />
        </ul>
      </Section>

      {/* 구독한 채널 — 한 채널 + "채널 둘러보기" */}
      <Section label="4.5rem">
        <ul>
          <Row label="7rem" avatar chip />
          <Row label="6.5rem" chevron />
        </ul>
      </Section>

      {/* 로그인 — 라벨 없는 섹션. 실화면 SessionRows 가 익명일 때 내는 꼴 그대로 */}
      <Section>
        <BoneLoginPanel />
      </Section>
    </BoneRoot>
  );
}
