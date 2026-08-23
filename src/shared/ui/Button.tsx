import Link from "next/link";
import type { ReactNode } from "react";
import { OutboundA } from "@/shared/ui/OutboundA";

/**
 * 🔒 **봉인된 단추.** 면을 차지하는 주 행동은 전부 여기를 지난다.
 *
 * 왜 봉인했나 — 공개 트리에 공용 `Button` 이 아예 없었다(`grep "export function
 * Button"` → 0). 그래서 주 CTA 색이 화면마다 갈렸다: 홈 히어로와 신청 폼은
 * 밀랍, 저장·장소·오류·지도는 먹색. 같은 무게의 행동이 두 색으로 말하면
 * 방문자는 "이 색이 무슨 뜻인지"를 화면마다 다시 배워야 한다.
 *
 * 🔴 금지 — 호출부에서 height·background·radius 를 손으로 적지 말 것.
 *    그 순간 열 번째 단추가 생긴다. 규격은 이 파일에만 있다.
 * 🔴 금지 — `primary` 를 먹색으로 바꾸지 말 것. **primary = --wax** 는
 *    PRODUCT.md 의 계약이다(워드마크·주 CTA·활성 표시에만 산호).
 *    반대로 위험·파괴 행동에 산호를 쓰지도 말 것 — 그건 `--alert` 다.
 * 🔴 금지 — `className` 으로 색·크기를 덮어쓰기. className 은 **레이아웃**
 *    (flex-1·w-full·mt-2) 전용이다. 새 모양이 필요하면 여기에 값을 더한다.
 *
 * variant — `primary`   밀랍 채움. 한 화면에 하나. 이 화면이 시키는 일.
 *           `secondary` 먹색 채움. 강하지만 브랜드를 쓰지 않는 확정 행동.
 *           `ghost`     헤어라인 링. 나란히 서는 대안·취소.
 * size    — `sm` 40px · `md` 44px · `lg` 48px.
 *           라운드는 sm 만 `--r-control`(10px), 나머지는 `--r-frame`(12px) —
 *           작은 단추에 12px 을 물리면 알약처럼 보여 칩과 헷갈린다.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 44, lg: 48 };

const SKIN: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: "var(--wax)", color: "#fff" },
  secondary: { background: "var(--paper)", color: "var(--sheet)" },
  ghost: {
    background: "transparent",
    color: "var(--paper)",
    boxShadow: "inset 0 0 0 1px var(--hairline)",
  },
};

export function Button({
  variant = "primary",
  size = "md",
  href,
  scroll = true,
  onClick,
  type = "button",
  disabled,
  title,
  ariaLabel,
  ref,
  className = "",
  children,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  scroll?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  /**
   * 초점을 손으로 옮겨야 하는 자리에만. 파괴적 확인 판은 열자마자 "취소"에
   * 초점이 서야 해서(`SessionRows`) 이 손잡이가 없으면 호출부가 단추를 다시
   * 손으로 그리게 된다 — 규격이 갈리는 길이다. `href` 를 쓰면 무시된다.
   */
  ref?: React.Ref<HTMLButtonElement>;
  /** 레이아웃 전용(flex-1·w-full·mt-*). 규격을 덮어쓰는 용도가 아니다. */
  className?: string;
  children: ReactNode;
}) {
  const cls = `inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 font-bold transition-transform active:scale-[0.98] disabled:cursor-default disabled:opacity-40 ${className}`;
  const style: React.CSSProperties = {
    height: HEIGHT[size],
    paddingInline: 16,
    fontSize: "var(--t-body)",
    borderRadius: size === "sm" ? "var(--r-control)" : "var(--r-frame)",
    ...SKIN[variant],
  };

  if (href) {
    /* 바깥으로 나가는 단추는 클릭이 성공 지표라 OutboundA 를 지난다 */
    if (href.startsWith("http")) {
      return (
        <OutboundA href={href} title={title} className={cls} style={style}>
          {children}
        </OutboundA>
      );
    }
    return (
      <Link
        href={href}
        scroll={scroll}
        title={title}
        aria-label={ariaLabel}
        className={cls}
        style={style}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={cls}
      style={style}
    >
      {children}
    </button>
  );
}
