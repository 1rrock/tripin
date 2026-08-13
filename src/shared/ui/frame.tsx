/**
 * 화면 문법 — 서버 컴포넌트에서도 쓸 수 있다. 아이콘/Act 는 ./icons (클라이언트).
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { channelAvatar } from "@/shared/lib/youtube";

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
        // eslint-disable-next-line @next/next/no-img-element -- yt3 CDN 원본
        <img
          src={channelAvatar(src, size * 2)}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
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

export function Chip({
  active = false,
  href,
  onClick,
  scroll = true,
  children,
}: {
  active?: boolean;
  href?: string;
  onClick?: () => void;
  scroll?: boolean;
  children: ReactNode;
}) {
  if (href) {
    return (
      <Link
        href={href}
        scroll={scroll}
        className="chip"
        data-active={active ? "true" : undefined}
      >
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="chip">
      {children}
    </button>
  );
}
