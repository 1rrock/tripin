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
 * 구독 섹션의 행 수는 사람마다 다르다. 셋으로 깐다 — 없는 사람에게는 한 행짜리
 * 안내로 줄어들지만, 짧게 깔았다가 늘어나는 쪽이 길게 깔았다가 줄어드는 쪽보다
 * 아래 섹션을 더 크게 밀어낸다.
 */

import type { ReactNode } from "react";
import { Icon } from "@/shared/ui/icons";
import { Bone, BoneBlock, BoneDot, BoneRoot, times } from "./bones";

const SUBS = 3;

/** `rows.tsx` 의 `RowSection` — 라벨 단 + 행 단 */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 lg:grid lg:grid-cols-[9rem_minmax(0,34rem)] lg:gap-x-10">
      <p className="text-[length:var(--t-index)] leading-[1.2] font-semibold tracking-[-0.01em] lg:pt-3.5 lg:text-[length:var(--t-title)] lg:font-bold">
        <Bone w={label} />
      </p>
      <div className="flex min-w-0 flex-col gap-1.5 lg:col-start-2 lg:row-start-1">
        <ul>{children}</ul>
      </div>
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

      <Section label="2.5rem">
        <Row label="5rem" value="3rem" chevron />
        <Row label="3.5rem" value="3rem" chevron />
      </Section>

      <Section label="2.5rem">
        {times(SUBS).map((i) => (
          <Row key={i} label={["7rem", "5rem", "8.5rem"][i % 3]} avatar chip />
        ))}
        <Row label="6.5rem" chevron />
      </Section>

      <Section label="2.5rem">
        <Row label="10rem" />
        <Row label="4rem" />
        <Row label="5rem" />
      </Section>
    </BoneRoot>
  );
}
