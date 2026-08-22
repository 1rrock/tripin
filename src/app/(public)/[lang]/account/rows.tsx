import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/shared/ui/icons";

/**
 * 마이페이지의 행 문법 — 시안 C(설정 줄).
 *
 * 화면 전체가 이 한 가지 행이다: 왼쪽 라벨, 오른쪽 값, 헤어라인.
 * 서버·클라이언트 양쪽에서 쓰므로 "use client" 를 붙이지 않는다.
 */

export function RowList({ children }: { children: ReactNode }) {
  return <ul>{children}</ul>;
}

export function RowItem({ children }: { children: ReactNode }) {
  return (
    <li className="border-t first:border-t-0" style={{ borderColor: "var(--hairline)" }}>
      {children}
    </li>
  );
}

/** 행 내부 공통 — 높이·정렬·호버. 링크/버튼이 이걸 두른다. */
export const rowShellClass = "roll -mx-2 flex h-13 w-full items-center gap-3 rounded-(--r-control) px-2";

export function RowLabel({ children, tone }: { children: ReactNode; tone?: "wax" | "dim" }) {
  return (
    <span
      className="min-w-0 flex-1 truncate text-left"
      style={{
        fontSize: "var(--t-body)",
        fontWeight: 600,
        color: tone === "wax" ? "var(--wax)" : tone === "dim" ? "var(--dim)" : undefined,
      }}
    >
      {children}
    </span>
  );
}

export function RowValue({ children }: { children: ReactNode }) {
  return (
    <span className="tnum shrink-0" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
      {children}
    </span>
  );
}

/** 링크 행 — 서버에서 그대로 쓴다. */
export function LinkRow({ href, label, value }: { href: string; label: ReactNode; value?: ReactNode }) {
  return (
    <RowItem>
      <Link href={href} className={rowShellClass}>
        <RowLabel>{label}</RowLabel>
        {value != null ? <RowValue>{value}</RowValue> : null}
        <Icon.chevron className="roll-go size-4 shrink-0" />
      </Link>
    </RowItem>
  );
}

/**
 * 섹션 — 라벨 + 행 목록.
 *
 * 모바일은 라벨이 행들 **위**에 얹힌 한 단. 데스크톱(lg+)에서는 라벨이 **왼쪽 단**으로
 * 빠지고 행이 오른쪽에 선다. 좁은 화면의 한 단을 그대로 늘리면 1400px 짜리 화면에
 * 라벨-행-라벨-행이 세로로 길게 이어져 스크롤만 길어진다 — 옆에 자리가 있으면
 * 무엇에 관한 설정인지는 옆에서 말하는 편이 낫다(맥 시스템 설정 문법).
 *
 * 행 단은 34rem 에서 멈춘다. 화면 폭만큼 늘리면 왼쪽 이름과 오른쪽 값 사이가 멀어져
 * 어느 값이 어느 이름의 것인지 눈으로 이어야 한다.
 */
export function RowSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 lg:grid lg:grid-cols-[9rem_minmax(0,34rem)] lg:gap-x-10">
      {label ? (
        /* `.index` 를 쓰지 않고 유틸리티로 같은 꼴을 낸다 — globals.css 의 `.index` 는
           레이어 밖이라 Tailwind 의 lg: 유틸리티가 이겨내지 못한다(v4 캐스케이드).
           lg 에서는 한 단의 머리 노릇을 하므로 12px 로는 너무 작다. 위 여백은
           첫 행(h-13)의 글과 눈높이를 맞추는 값. */
        <p className="text-[length:var(--t-index)] leading-[1.2] font-semibold tracking-[-0.01em] text-[var(--dim)] lg:pt-3.5 lg:text-[length:var(--t-title)] lg:font-bold lg:text-[var(--paper)]">
          {label}
        </p>
      ) : null}
      {/* 라벨이 없어도 행은 늘 오른쪽 단에 선다 — 섹션끼리 왼쪽 선이 어긋나지 않게 */}
      <div className="flex min-w-0 flex-col gap-1.5 lg:col-start-2 lg:row-start-1">{children}</div>
    </section>
  );
}
