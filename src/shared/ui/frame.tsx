/**
 * 화면 문법 — 서버 컴포넌트에서도 쓸 수 있다. 아이콘/Act 는 ./icons (클라이언트).
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { channelAvatar } from "@/shared/lib/youtube";
import { AvatarPhoto } from "@/shared/ui/AvatarPhoto";
import { OutboundA } from "@/shared/ui/OutboundA";

export function Frame({
  waxed = false,
  className = "",
  children,
}: {
  waxed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <span className={`frame ${waxed ? "waxed" : ""} ${className}`}>{children}</span>;
}

export function Avatar({
  initials,
  accent,
  size = 34,
  src,
  alt = "",
}: {
  initials: string;
  accent: string;
  size?: number;
  src?: string | null;
  alt?: string;
}) {
  return (
    <span
      aria-hidden={alt ? undefined : true}
      className="grid shrink-0 place-items-center overflow-hidden font-bold"
      style={{
        width: size,
        height: size,
        boxSizing: "border-box",
        borderRadius: "var(--r-round)",
        background: "var(--hover)",
        border: `2px solid ${accent}`,
        fontSize: Math.round(size * 0.4),
        lineHeight: 1,
      }}
    >
      {src ? (
        <AvatarPhoto src={channelAvatar(src, size * 2)} alt={alt} size={size} fallback={initials} />
      ) : (
        initials
      )}
    </span>
  );
}

export function Index({
  children,
  tone = "dim",
  className = "",
  style,
}: {
  children: ReactNode;
  tone?: "dim" | "paper" | "wax";
  className?: string;
  style?: React.CSSProperties;
}) {
  const color = tone === "wax" ? "var(--wax)" : tone === "paper" ? "var(--paper)" : "var(--dim)";
  return (
    <span className={`index ${className}`} style={{ color, ...style }}>
      {children}
    </span>
  );
}

export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`rule ${className}`} />;
}

export function Meta({
  items,
  className = "",
}: {
  items: (string | null | undefined)[];
  className?: string;
}) {
  const shown = items.filter((v): v is string => Boolean(v));
  if (shown.length === 0) return null;
  return (
    <p
      className={`tnum ${className}`}
      style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.5 }}
    >
      {shown.join("  ·  ")}
    </p>
  );
}

export function FrameNo({ n, active = false }: { n: number; active?: boolean }) {
  return (
    <span
      aria-hidden
      className="index tnum grid size-7 shrink-0 place-items-center"
      style={{
        borderRadius: "var(--r-round)",
        color: active ? "#fff" : "var(--dim)",
        background: active ? "var(--wax)" : "var(--hover)",
      }}
    >
      {n}
    </span>
  );
}

export type ChipSize = "sm" | "md";
export type ChipTone = "neutral" | "soft" | "quiet" | "wax";

/**
 * 🔒 **봉인된 알약.** 이 앱의 칩은 전부 여기를 지난다.
 *
 * 왜 봉인했나 — 같은 역할의 칩이 9벌로 각각 구현돼 있었고, 계산 높이가
 * 28/32/36/37px 로 흩어져 **한 줄에 섞이면 밑선이 어긋났다**. 실제로
 * `/c/[creator]/v/[videoId]` 하단 "다음 행동" 줄이 그랬다. `SavedMapChips.tsx`
 * 는 그 비용을 치르고 나서 고치는 대신 "규격은 Trigger 를 그대로 따른다,
 * 하나라도 어긋나면 줄이 깨진다(실제로 겪음)" 는 주석을 달아 뒀다.
 *
 * 🔴 금지 — 호출부에서 알약을 다시 그리지 말 것.
 *    padding·height·font-weight·background 를 손으로 적은 알약이 보이면
 *    그건 열 번째 벌이다. 규격은 `globals.css` 의 `.chip*` 한 곳에만 있다.
 * 🔴 금지 — 새 모양이 필요하다고 className 으로 색·크기를 덮어쓰지 말 것.
 *    여기에 size 나 tone 값을 **더하고** 그 이유를 한 줄 적는다.
 *    (className 은 레이아웃 — 줄바꿈·flex 몫 — 에만 쓴다.)
 *
 * size — `sm` 28px(기본, 라벨에 가까운 칩) · `md` 36px(누를 자리로 서는 칩).
 *        **한 줄에 두 단을 섞지 않는다.** 그게 밑선을 어긋나게 한 원인이다.
 * tone — `neutral` 기본(끄면 헤어라인 링, 켜면 잉크 채움)
 *        `soft`    바탕이 깔린 보조 행동(`Act`)
 *        `quiet`   이미 끝난 토글(구독중) — 켜지면 타오르지 않고 물러난다
 *        `wax`     밀랍 CTA — 토글이 아니라 링크라 `active` 를 보지 않는다
 */
export function Chip({
  size = "sm",
  tone = "neutral",
  active = false,
  href,
  onClick,
  scroll = true,
  title,
  expanded,
  ariaLabel,
  buttonRef,
  className = "",
  children,
}: {
  size?: ChipSize;
  tone?: ChipTone;
  active?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  scroll?: boolean;
  title?: string;
  /** 드롭다운을 여는 칩 — aria-expanded */
  expanded?: boolean;
  ariaLabel?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
  /** 레이아웃 전용(min-w-0·flex-1 등). 규격을 덮어쓰는 용도가 아니다. */
  className?: string;
  children: ReactNode;
}) {
  const cls = [
    "chip",
    size === "md" && "chip-md",
    tone !== "neutral" && `chip-${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    /* 바깥으로 나가는 알약은 클릭이 성공 지표라 OutboundA 를 지난다 —
       Act 가 하던 갈래를 여기로 올렸다. */
    if (href.startsWith("http")) {
      return (
        <OutboundA href={href} title={title} className={cls}>
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
        data-active={active ? "true" : undefined}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-expanded={expanded}
      aria-label={ariaLabel}
      title={title}
      className={cls}
    >
      {children}
    </button>
  );
}
