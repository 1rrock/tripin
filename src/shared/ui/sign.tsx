/**
 * 공항 사인 시스템 프리미티브.
 *
 * 이 파일이 월드의 문법을 소유한다 — 화면은 여기 있는 것만 조합한다.
 * 치수·색은 전부 globals.css 토큰에서 오므로, 조정은 CSS 에서 하고 여기서 px 를 쓰지 않는다.
 *
 * 근거: .impeccable/mocks/mobile-v4-structure.png (승인 컴프),
 *      실측 스크립트 .impeccable/refs/measure-reference.py
 */
import type { CSSProperties, ReactNode, SVGProps } from "react";
import Link from "next/link";

/* ── 픽토그램 ────────────────────────────────────────────────────────
   AIGA 교통 사인 계열의 솔리드 글리프. 64 그리드에서 그린다.
   stroke 를 쓰지 않는다 — 이 월드의 아이콘은 면이지 선이 아니다.
   크기는 부모(.ds-box)가 --glyph-ratio 로 정하므로 여기서 지정하지 않는다. */
type Glyph = (p: SVGProps<SVGSVGElement>) => ReactNode;

function g(path: ReactNode): Glyph {
  function Svg(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 64 64" aria-hidden focusable="false" {...props}>
        {path}
      </svg>
    );
  }
  return Svg;
}

export const Icon = {
  person: g(
    <>
      <circle cx="32" cy="19" r="11" />
      <path d="M32 34c-11 0-20 7-20 16v6h40v-6c0-9-9-16-20-16z" />
    </>,
  ),
  search: g(
    <path d="M27 5a22 22 0 1 0 13.2 39.6l14.4 14.4 4.8-4.8-14.4-14.4A22 22 0 0 0 27 5zm0 6.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31z" />,
  ),
  food: g(
    <path d="M14 5v19c0 4.3 2.3 6.7 5.5 7.6V59h7.4V31.6c3.2-.9 5.5-3.3 5.5-7.6V5h-5.2v15h-2.9V5h-4.1v15h-2.9V5zM48 5c-5.3 0-9.4 7.4-9.4 19v13.6h5.3V59H51V5z" />,
  ),
  sight: g(
    <path d="M32 4 7 17.6v6.2h50v-6.2zM14 29v21.4H8.6V57h46.8v-6.6H50V29h-7.4v21.4h-6.9V29h-7.4v21.4h-6.9V29z" />,
  ),
  cafe: g(
    <path d="M9 6h35v7.4h5.2a9.4 9.4 0 0 1 0 18.8H44v3.6A12.6 12.6 0 0 1 31.4 48.6H21.6A12.6 12.6 0 0 1 9 36zm35 14.4v5.4h5.2a2.7 2.7 0 0 0 0-5.4zM7 53h39v6H7z" />,
  ),
  pin: g(
    <path d="M32 3C21 3 12 12 12 23c0 15 20 38 20 38s20-23 20-38C52 12 43 3 32 3zm0 27.5a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />,
  ),
  home: g(<path d="M32 4 3 30h9v30h17V41h6v19h17V30h9z" />),
  list: g(<path d="M6 12h52v9H6zm0 17h52v9H6zm0 17h52v9H6z" />),
  bookmark: g(<path d="M13 4h38v56L32 45 13 60z" />),
  more: g(
    <>
      <circle cx="12" cy="32" r="6.5" />
      <circle cx="32" cy="32" r="6.5" />
      <circle cx="52" cy="32" r="6.5" />
    </>,
  ),
  chevron: g(<path d="M25 8 19 14l18 18-18 18 6 6 24-24z" />),
  back: g(<path d="M39 8l6 6-18 18 18 18-6 6-24-24z" />),
  play: g(<path d="M14 6v52l38-26z" />),
  plane: g(
    <>
      <path d="M6 54h52v5H6z" />
      <path d="M58.4 31.5c-.7-2.8-3.6-4.5-6.4-3.8l-12 3.2-15.6-14.5-4.9 1.3 9.3 16.1-11.2 3-4.5-3.4-3.6 1 5.2 9 40-10.7c2.8-.8 4.5-3.7 3.7-6.5z" />
    </>,
  ),
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof Icon;

/** 장소 타입 → 픽토그램. 미지의 타입은 핀으로 떨어진다. */
export function placeGlyph(type: string | null | undefined): IconName {
  if (!type) return "pin";
  if (/음식|맛집|식당|restaurant|food/i.test(type)) return "food";
  if (/카페|cafe|coffee/i.test(type)) return "cafe";
  if (/명소|관광|landmark|attraction/i.test(type)) return "sight";
  return "pin";
}

/* ── 검정 픽토그램 인셋 ─────────────────────────────────────────────
   이 월드의 서명. 글리프는 박스의 --glyph-ratio 배이고, 그 여백이 형태를 만든다.
   글리프가 박스를 꽉 채우면 사인이 아니라 아이콘 버튼으로 읽힌다. */
export function Box({
  icon,
  size = "card",
  className = "",
}: {
  icon: IconName;
  size?: "card" | "quick" | "avatar";
  className?: string;
}) {
  const Glyph = Icon[icon];
  return (
    <span className={`ds-box ds-box--${size} ${className}`}>
      <Glyph />
    </span>
  );
}

/* ── 카드 ──────────────────────────────────────────────────────────
   지면과 같은 노랑 위에 헤어라인으로만 선다. 활성은 색이 아니라 보더 굵기다. */
export function Card({
  active = false,
  as: Tag = "div",
  className = "",
  children,
  ...rest
}: {
  active?: boolean;
  as?: "div" | "article" | "li";
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <Tag className={`ds-card ${className}`} data-active={active} {...rest}>
      {children}
    </Tag>
  );
}

/** 카드 안 구분선. 보더보다 얇다 — 실측 1.2px vs 2px. */
export function Divider() {
  return <hr className="ds-divider" />;
}

/**
 * 데이터 행 — 시안의 GATE / BOARDING / SEAT.
 * 작은 자간확장 라벨과 큰 값의 스케일 점프가 이 월드의 대담함을 만든다.
 * 값이 짧을수록(숫자·타임코드) 이 문법이 잘 산다.
 */
export function DataRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="flex">
      {items.map(({ label, value }, i) => (
        <div
          key={label}
          className={`min-w-0 flex-1 pr-[15px] ${i ? "border-l border-hairline pl-[15px]" : ""}`}
        >
          <dt className="ds-label text-ink">{label}</dt>
          <dd
            className="tnum truncate font-bold text-ink"
            style={{ fontSize: "var(--t-value)", letterSpacing: "-0.02em", lineHeight: 1.12 }}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ── 하단 내비 ─────────────────────────────────────────────────────
   전폭·하단 고정. 활성은 칩이 아니라 아이콘·라벨의 색 전환이다 (시안 폰 화면 기준).
   safe-area 를 존중하지 않으면 iOS 홈 인디케이터에 라벨이 가린다. */
export type NavItem = { icon: IconName; label: string; href: string };

export function BottomNav({ items, active }: { items: NavItem[]; active: number }) {
  return (
    <nav
      aria-label="주요 화면"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-between bg-ink px-2 pt-3.5"
      style={{
        borderTopLeftRadius: "var(--r-nav)",
        borderTopRightRadius: "var(--r-nav)",
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
      }}
    >
      {items.map(({ icon, label, href }, i) => {
        const Glyph = Icon[icon];
        const on = i === active;
        return (
          <a
            key={label}
            href={href}
            aria-current={on ? "page" : undefined}
            className="focus-ring-invert flex flex-1 flex-col items-center gap-1.5 py-1"
            style={{ color: on ? "var(--sign)" : "var(--on-ink)" }}
          >
            <Glyph
              style={{ width: "var(--icon-nav)", height: "var(--icon-nav)", fill: "currentColor" }}
            />
            <span style={{ fontSize: "var(--t-nav)", fontWeight: 500, lineHeight: 1.1 }}>
              {label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

/** 내비가 가리는 만큼의 스페이서 — 마지막 카드가 잘리지 않게 한다. */
export function NavSpacer() {
  return <div aria-hidden style={{ height: "calc(96px + env(safe-area-inset-bottom))" }} />;
}

/* ── 액션 버튼 ─────────────────────────────────────────────────────
   시안의 "Find Gates" 문법: 지면과 같은 노랑 + 검정 보더 + **우측 검정 아이콘 인셋**.
   인셋이 이 버튼을 사인 시스템의 것으로 만든다 — 빼면 평범한 아웃라인 버튼이 된다.
   primary 는 보더가 잉크, quiet 은 헤어라인. pressed 는 지면을 잉크로 반전한다. */
export function Action({
  icon,
  children,
  href,
  onClick,
  primary = false,
  pressed,
  title,
}: {
  icon: IconName;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
  pressed?: boolean;
  title?: string;
}) {
  const Glyph = Icon[icon];
  const inner = (
    <>
      <span style={{ fontSize: "var(--t-chip)", fontWeight: 500 }}>{children}</span>
      <span
        aria-hidden
        className="grid shrink-0 place-items-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: 7,
          background: pressed ? "var(--sign)" : "var(--ink)",
        }}
      >
        <Glyph
          style={{ width: 14, height: 14, fill: pressed ? "var(--ink)" : "var(--on-ink)" }}
        />
      </span>
    </>
  );
  const style: CSSProperties = {
    background: pressed ? "var(--ink)" : "transparent",
    color: pressed ? "var(--sign)" : "var(--ink)",
    border: `var(--stroke-card) solid ${primary || pressed ? "var(--ink)" : "var(--hairline)"}`,
    borderRadius: "var(--r-field)",
  };
  const cls = "inline-flex items-center gap-2.5 py-1.5 pr-1.5 pl-3.5";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className={cls}
        style={style}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={title}
      className={`${cls} cursor-pointer`}
      style={style}
    >
      {inner}
    </button>
  );
}

/* ── 칩 ────────────────────────────────────────────────────────────
   필터. 활성은 잉크 반전(지면이 잉크, 글자가 사인)이다. */
export function Chip({
  active = false,
  href,
  onClick,
  children,
}: {
  active?: boolean;
  /** 라우팅 필터면 href, 클라이언트 필터면 onClick — 둘 중 하나만 준다 */
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className = "inline-flex shrink-0 items-center px-4 py-2.5 font-medium";
  const style: CSSProperties = {
    background: active ? "var(--ink)" : "transparent",
    color: active ? "var(--sign)" : "var(--ink)",
    border: `var(--stroke-card) solid ${active ? "var(--ink)" : "var(--hairline)"}`,
    borderRadius: "var(--r-field)",
    fontSize: "var(--t-chip)",
  };
  if (href) {
    return (
      <Link
        href={href}
        // 필터 칩은 스크롤 위치를 유지해야 한다 — 훑던 자리에서 걸러야 과업이 안 끊긴다
        scroll={false}
        aria-current={active ? "true" : undefined}
        className={className}
        style={style}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${className} cursor-pointer`}
      style={style}
    >
      {children}
    </button>
  );
}
