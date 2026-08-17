/**
 * 뼈 조각 — 모든 페이지 스켈레톤이 이 한 벌만 쓴다.
 *
 * 🔴 규칙 하나: **실화면 마크업을 그대로 베끼고 글자 자리에만 <Bone> 을 넣는다.**
 *    래퍼·클래스·패딩·gap 을 똑같이 두면 로딩과 본화면의 요소가 같은 좌표에 선다.
 *    새로 짠 레이아웃(대충 비슷한 박스)은 반드시 어긋난다.
 *
 * `<Bone>` 이 zero-width space 를 함께 뱉는 이유: 뼈만 넣으면 그 줄에 글자가 없어
 * line box 가 안 생기고, 진짜 글줄(line-height)보다 행이 낮아진다. ZWSP 가 부모의
 * strut 을 세워 주므로 행 높이가 실제 텍스트와 정확히 같아진다.
 *
 * 서버 컴포넌트. 훅 없음.
 */

import type { CSSProperties, ReactNode } from "react";

/** 글줄 자리. 부모의 font-size·line-height 를 그대로 쓴다 — 감싼 태그를 실화면과 맞출 것 */
export function Bone({ w }: { w: string }) {
  return (
    <>
      <span
        className="bone-line"
        style={{ display: "inline-block", width: w, verticalAlign: "middle" }}
      />
      {"​"}
    </>
  );
}

/** 16:9 프레임 — 실화면의 `<Frame>` 과 같은 상자 */
export function BoneFrame({ className = "" }: { className?: string }) {
  return (
    <span className={`frame ${className}`}>
      <span className="bone" />
    </span>
  );
}

/** 동그란 것 — 아바타·아이콘 원 */
export function BoneDot({
  size,
  radius = "var(--r-round)",
  className = "",
}: {
  size: number;
  radius?: string;
  className?: string;
}) {
  return (
    <span
      className={`bone-ava ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    />
  );
}

/**
 * 인라인 컨트롤 자리 — 칩·Act 처럼 **자기 높이를 가진** 조각.
 *
 * `verticalAlign: "top"` 이 필수다. `.bone-line` 은 `overflow:hidden` 이라
 * 인라인블록의 baseline 이 아래 margin 모서리가 되고, 그러면 뼈가 통째로
 * baseline 위에 올라앉아 그 아래로 strut 의 descender(~6px)가 더 붙는다.
 * 실제 컨트롤(inline-flex)에는 없는 여백이라 줄 높이가 그만큼 어긋난다.
 */
function BoneControl({ w, h, className = "" }: { w: string; h: number; className?: string }) {
  return (
    <span
      className={`bone-line shrink-0 ${className}`}
      style={{
        display: "inline-block",
        verticalAlign: "top",
        width: w,
        height: h,
        borderRadius: "var(--r-round)",
      }}
    />
  );
}

/**
 * 칩 — `.chip` 의 실제 높이(패딩 6+6 + 13px×1.25 = 28).
 *
 * `items-baseline` 을 쓰는 줄에서는 `className="self-center"` 를 넘겨라. 진짜 칩은
 * 안에 글자가 있어 baseline 이 글줄에 걸리는데, 뼈는 `overflow:hidden` 이라
 * baseline 이 아래 모서리라서 그 줄만 6px 쯤 키운다.
 */
export function BoneChip({ w, className }: { w: string; className?: string }) {
  return <BoneControl w={w} h={28} className={className} />;
}

/** Act 버튼 — `inline-flex px-3 py-1.5` + 아이콘 16px = 32 */
export function BoneAct({ w, className }: { w: string; className?: string }) {
  return <BoneControl w={w} h={32} className={className} />;
}

/** 지도 자리 — 실화면의 `.canvas-map` 을 그대로 채운다 */
export function BoneMap() {
  return (
    <div className="canvas-map">
      <span className="bone" />
    </div>
  );
}

/** 브레드크럼 — nav.index 한 줄 (홈 › 지도 › 현재) */
export function BoneCrumb({ last = "5rem" }: { last?: string }) {
  return (
    <div className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
      <span>
        <Bone w="2rem" />
      </span>
      <BoneDot size={10} radius="3px" />
      <span>
        <Bone w="2.5rem" />
      </span>
      <BoneDot size={10} radius="3px" />
      <span>
        <Bone w={last} />
      </span>
    </div>
  );
}

/**
 * 페이지 스켈레톤 공통 껍데기 — 실화면의 `<main>` 을 그대로 대신한다.
 *
 * `role="status"` 를 `<main>` 에 얹지 않는다 — landmark 역할을 덮어써서
 * 스크린리더의 "본문으로 건너뛰기"가 사라진다. 상태는 안쪽 sr-only 가 말한다.
 *
 * `as="div"` 는 **레이아웃이 이미 `<main>` 을 들고 있을 때**만 쓴다(`/saved`).
 * `loading.tsx` 는 그 레이아웃 안에서 그려지므로 여기서 또 `<main>` 을 내면
 * landmark 가 둘이 되어 스크린리더가 본문을 두 번 센다.
 */
export function BoneRoot({
  as: Tag = "main",
  label,
  className,
  style,
  children,
}: {
  as?: "main" | "div";
  label: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Tag aria-busy="true" className={className} style={style}>
      <span role="status" className="sr-only">
        {label}
      </span>
      {children}
    </Tag>
  );
}

/**
 * 크기가 정해진 뼈 덩어리 — 알약·필드·트리거처럼 **높이가 곧 레이아웃**인 자리.
 *
 * 🔴 globals.css 는 layer 밖이라 `.bone-line` 규칙이 Tailwind 유틸리티를 **이긴다**.
 *    · 크기(`h-10`, `size-12`)는 클래스로 주지 말 것 — 반드시 인라인 스타일.
 *    · 표시 토글(`lg:hidden`, `hidden`)도 뼈에 직접 걸지 말 것 — `display:block` 이
 *      이겨서 숨겨야 할 화면에 남는다. **감싼 div 에** 걸어라.
 */
export function BoneBlock({
  w = "100%",
  h,
  radius = "var(--r-round)",
  className = "",
}: {
  w?: string | number;
  h: number;
  radius?: string;
  className?: string;
}) {
  return (
    <span
      className={`bone-line ${className}`}
      style={{ display: "block", width: w, height: h, borderRadius: radius }}
    />
  );
}

/** n개 반복 — `Array.from` 을 매번 쓰지 않으려고 */
export function times(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}
