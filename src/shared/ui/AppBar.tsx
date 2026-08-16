/**
 * 화면 머리 한 줄 — 뒤로 · 제목 · 액션.
 *
 * 장소 전체화면(PlaceSheet full)에서 쓰던 머리말을 그대로 꺼내 공통으로 만든 것이다.
 * 지도·저장·마이의 상단 바도 같은 문법을 쓴다: **제목은 브랜드가 서 있던 자리에**,
 * 뒤로가기는 그 왼쪽에. 화면마다 제 안에 제목과 뒤로가기를 따로 그리면 같은 것이
 * 위치도 크기도 조금씩 다르게 생긴다(실제로 브레드크럼·h1·"← 저장한 곳" 세 벌이었다).
 *
 * 훅이 없다 — 서버 컴포넌트에서도, 클라이언트 컴포넌트에서도 그대로 쓴다.
 */

import type { CSSProperties, ReactNode } from "react";

/** 40px 손가락 타깃의 둥근 아이콘 자리 — 뒤로·닫기·하트가 같은 크기로 선다 */
export function AppBarButton({
  label,
  onClick,
  tone = "ink",
  children,
}: {
  label: string;
  onClick: () => void;
  /** dim 은 닫기처럼 한 단 물러나는 것 */
  tone?: "ink" | "dim";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors active:bg-(--hover)"
      style={{ color: tone === "dim" ? "var(--dim)" : "var(--paper)" }}
    >
      {children}
    </button>
  );
}

/**
 * 제목만 따로 쓰는 자리 — 공용 헤더가 브랜드 대신 이걸 세운다.
 *
 * 기본은 `p` 다. 헤더는 화면의 제목을 **보여 주는** 자리이지 문서 구조가 아니고,
 * 페이지는 저마다 h1 을 이미 들고 있다(대개 sr-only). h2 가 필요한 모달만 태그를 바꾼다.
 */
export function AppBarTitle({
  children,
  as: Tag = "p",
  /**
   * 남는 폭을 제목이 먹는가. 모달 머리말은 그렇다(true).
   *
   * 공용 헤더에서는 false — 옆에 폭을 다 쓰려는 검색창이 서 있어서, 제목이 flex-1 이면
   * 둘이 남은 자리를 나눠 갖다가 태블릿 폭에서 제목이 0 으로 줄어 사라진다(실제로 겪음).
   */
  fill = true,
  className = "",
}: {
  children: ReactNode;
  as?: "p" | "h1" | "h2";
  fill?: boolean;
  className?: string;
}) {
  return (
    <Tag
      className={`min-w-0 truncate font-bold ${fill ? "flex-1" : "max-w-[60%] shrink-0"} ${className}`}
      style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em" }}
    >
      {children}
    </Tag>
  );
}

export function AppBar({
  leading,
  title,
  titleAs,
  actions,
  className = "",
  style,
}: {
  /** 뒤로가기 — 없으면 제목이 왼쪽 끝에 선다 */
  leading?: ReactNode;
  title: ReactNode;
  titleAs?: "p" | "h1" | "h2";
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`} style={style}>
      {leading}
      <AppBarTitle as={titleAs} className={leading ? "" : "px-1"}>
        {title}
      </AppBarTitle>
      {actions}
    </div>
  );
}
