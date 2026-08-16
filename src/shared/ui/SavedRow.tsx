/**
 * 저장 화면의 한 행 — 원형 아이콘 · 이름 · 그 아래 한 줄.
 *
 * 구글 지도 "내 장소" 의 문법을 가져온다: 라운드 박스·그림자 없이 전체 폭 행,
 * 구분은 헤어라인 하나. 대신 **색은 가져오지 않는다** — 목록마다 다른 색 원을 주면
 * 화면이 무지개가 된다(globals.css 규율). 원은 회색 하나, 산호는 좋아요 행에만.
 *
 * 저장 목록(`/saved`)과 그룹 고르기 시트(`ListPicker`)가 같은 조각을 쓴다.
 * 같은 것을 두 벌로 그리면 한쪽만 고치는 일이 반드시 생긴다 — 그래서 shared 에 둔다.
 *
 * 행 전체가 링크다. `trailing`(⋮ 메뉴)은 링크 **밖**의 형제로 둔다 — 중첩
 * 인터랙티브는 스크린리더에서 무엇을 누르는지 알 수 없고, 클릭이 링크로 새기도 한다.
 */

import Link from "next/link";
import type { ReactNode } from "react";

/** 행 안쪽 — 아이콘부터 글까지. 링크든 버튼이든 이 배치를 그대로 쓴다. */
export const ROW_BODY = "flex min-w-0 flex-1 items-center gap-3.5 py-3 pl-(--gutter) pr-2";

export function RowIcon({
  tone = "plain",
  children,
}: {
  tone?: "plain" | "wax";
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-full"
      style={{
        background: tone === "wax" ? "var(--halo)" : "var(--hover)",
        color: tone === "wax" ? "var(--wax)" : "var(--paper)",
      }}
    >
      {children}
    </span>
  );
}

export function RowText({ name, meta }: { name: ReactNode; meta?: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
      <span className="truncate" style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>
        {name}
      </span>
      {meta ? (
        <span className="tnum" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
          {meta}
        </span>
      ) : null}
    </span>
  );
}

export function SavedRow({
  href,
  icon,
  tone = "plain",
  name,
  meta,
  trailing,
  className = "",
}: {
  href: string;
  icon: ReactNode;
  tone?: "plain" | "wax";
  name: ReactNode;
  /** 이름 아래 회색 한 줄 — 개수나 안내. 없으면 이름만 선다. */
  meta?: ReactNode;
  trailing?: ReactNode;
  /** 칸이 격자에 설 때 쓰는 자리 지정(열 넓이·세로 구분선). 행의 안쪽은 안 바뀐다. */
  className?: string;
}) {
  return (
    <li className={`flex items-center border-b ${className}`} style={{ borderColor: "var(--hairline)" }}>
      <Link href={href} className={`roll ${ROW_BODY}`}>
        <RowIcon tone={tone}>{icon}</RowIcon>
        <RowText name={name} meta={meta} />
      </Link>
      <div className="flex shrink-0 items-center pr-2">{trailing}</div>
    </li>
  );
}
