/**
 * `/saved` 뼈대 — `src/app/(public)/saved/SavedIndex.tsx` 의 미러.
 *
 * 행 목록 문법: 원형 아이콘(40) · 이름 · 그 아래 개수 한 줄. 행 안쪽은 실화면과
 * 같은 `ROW_BODY` 를 그대로 쓴다 — 패딩을 손으로 베끼면 한쪽만 고치는 날이 온다.
 *
 * `<main>` 을 내지 않는다. `/saved` 는 제 레이아웃이 `<main>` 을 들고 있고
 * (`saved/layout.tsx`) `loading.tsx` 는 그 안에서 그려진다.
 *
 * 두 단(lg+)도 그대로 들고 간다: 좋아요 행은 한 줄을 통째로, 그룹은 2열, 왼쪽 단만
 * 세로 헤어라인. 모바일에만 서는 "새 리스트" 행과 데스크톱에만 서는 머리의 버튼도
 * 각자 제 폭에서만 나타난다 — 한쪽만 그리면 반대 폭에서 목록이 한 행씩 밀린다.
 */

import { ROW_BODY } from "@/shared/ui/SavedRow";
import { Bone, BoneBlock, BoneDot, BoneRoot, times } from "./bones";

/** 짝수로 둔다 — 두 단에서 오른쪽 칸이 비면 실화면에 없는 빈 칸을 하나 더 그려야 한다 */
const GROUPS = 4;

/** 그룹 이름은 길이가 제각각이다. 다 같은 폭으로 깔면 뼈가 표처럼 보인다 */
const NAME_W = ["6.5rem", "4.5rem", "8rem", "5.5rem"];

function Row({
  name,
  /** 대개 "3곳" 같은 개수. 계정 행만 한 문장이라 훨씬 길다 */
  meta = "3.25rem",
  className = "",
  menu = false,
}: {
  name: string;
  meta?: string;
  /** 격자에서의 자리(열 넓이·세로 구분선) — 실화면 `SavedRow` 의 같은 이름 그대로 */
  className?: string;
  /** 그룹 행에만 붙는 ⋮ (`ListRowMenu` 의 `size-7` 버튼) */
  menu?: boolean;
}) {
  return (
    <li
      className={`flex items-center border-b ${className}`}
      style={{ borderColor: "var(--hairline)" }}
    >
      <span className={ROW_BODY}>
        <BoneDot size={40} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>
            <Bone w={name} />
          </span>
          <span style={{ fontSize: "var(--t-meta)" }}>
            <Bone w={meta} />
          </span>
        </span>
      </span>
      <div className="flex shrink-0 items-center pr-2">{menu ? <BoneDot size={28} /> : null}</div>
    </li>
  );
}

export function SavedSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot as="div" label={label} className="flex flex-col">
      {/* SavedHeader — 모바일에서는 통째로 접힌다(sr-only + hidden). 그래서 목록이
          공용 헤더의 헤어라인에 그대로 붙는다. 실화면과 같은 접힘이어야 한다. */}
      <div className="flex items-end justify-between gap-6 lg:mb-7">
        <div className="min-w-0">
          <h1
            className="sr-only lg:not-sr-only"
            style={{ fontSize: "var(--t-display)", fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            <Bone w="4rem" />
          </h1>
          <p className="mt-1.5 hidden lg:block" style={{ fontSize: "var(--t-body)" }}>
            <Bone w="9rem" />
          </p>
        </div>
        {/* 새 리스트 버튼 — `h-11 w-fit px-4`, 라운드는 --r-control */}
        <div className="hidden shrink-0 lg:block">
          <BoneBlock w="7.5rem" h={44} radius="var(--r-control)" />
        </div>
      </div>

      <ul
        className="-mx-(--gutter) lg:grid lg:grid-cols-2 lg:border-t [&>li:last-child]:border-b-0"
        style={{ borderColor: "var(--hairline)" }}
      >
        {/* 저장한 곳 — 그룹들의 머리라 두 단에서도 한 줄을 통째로 쓴다 */}
        <Row name="5rem" className="lg:col-span-2" />

        {times(GROUPS).map((i) => (
          <Row
            key={i}
            name={NAME_W[i % NAME_W.length]}
            className={i % 2 === 0 ? "lg:border-r lg:pr-3" : ""}
            menu
          />
        ))}

        {/* 새 리스트 행 — 모바일에만. `NewListButton variant="row"` 은 ⋮ 가 없고
            오른쪽 여백이 --gutter 지만, 뼈에서는 안쪽 배치가 같아 Row 로 충분하다. */}
        <Row name="6rem" className="lg:hidden" />

        {/* 계정 행 — 아래 줄이 개수가 아니라 한 문장이다("로그인하면 다른 기기에서도…") */}
        <Row name="4rem" meta="17rem" className="lg:col-span-2" />
      </ul>
    </BoneRoot>
  );
}
