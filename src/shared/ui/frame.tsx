/**
 * 콘택트 시트의 문법 — 이 월드의 모든 화면이 여기서만 형태를 가져온다.
 *
 * 서버 컴포넌트에서도 쓸 수 있도록 훅이 없다. 핸들러가 필요한 컨트롤은
 * 쓰는 쪽(클라이언트 컴포넌트)에서 onClick 을 넘긴다.
 *
 * 아이콘 두 층:
 *  · **stroke** — 열린 선. 액션·메타 등 장식용. 24 / 1.6 / round.
 *  · **dual**   — 닫힌 패스(`.ig-body`). 기본은 외곽선, 탭·헤더 활성에서
 *                 내부를 currentColor 로 채운다(시안 7 · Classic Nav + Ink).
 *                 구멍은 evenodd 로 패스에 심어 배경색에 묶이지 않게 한다.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { channelAvatar } from "@/shared/lib/youtube";

/* ── 아이콘 ──────────────────────────────────────────────────────────── */

type IconProps = React.SVGProps<SVGSVGElement>;

function glyph(path: ReactNode) {
  return function Glyph(props: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...props}
      >
        {path}
      </svg>
    );
  };
}

export const Icon = {
  search: glyph(
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.4 15.4 20 20" />
    </>,
  ),
  chevron: glyph(<path d="m9 5 7 7-7 7" />),
  back: glyph(
    <>
      <path d="M20 12H4" />
      <path d="m10 6-6 6 6 6" />
    </>,
  ),
  /** 사이트 밖으로 나가는 링크 — 유튜브·지도 앱 */
  out: glyph(
    <>
      <path d="M8 16 20 4" />
      <path d="M14 4h6v6" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>,
  ),
  /** 지역 — 지도 핀. 구멍 evenodd → 탭 활성 시 내부 채움 */
  pin: glyph(
    <path
      className="ig-body"
      fillRule="evenodd"
      d="M12 21s6.2-5.6 6.2-10.2a6.2 6.2 0 1 0-12.4 0C5.8 15.4 12 21 12 21zm0-8.65a2.15 2.15 0 1 0 0-4.3 2.15 2.15 0 0 0 0 4.3z"
    />,
  ),
  clock: glyph(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </>,
  ),
  play: glyph(<path d="M8 5.5v13l11-6.5-11-6.5Z" />),
  map: glyph(
    <>
      <path d="M9 4 3.6 6.2v13.4L9 17.4l6 2.2 5.4-2.2V4L15 6.2 9 4Z" />
      <path d="M9 4v13.4M15 6.2V19.6" />
    </>,
  ),
  close: glyph(<path d="m6 6 12 12M18 6 6 18" />),
  menu: glyph(<path d="M4 7h16M4 12h16M4 17h16" />),
  /**
   * 홈 — 집. 하단 탭에서 집이 아닌 걸 홈으로 읽는 사람은 없다.
   * 문 구멍 evenodd → 채움 시 배경이 비친다.
   */
  home: glyph(
    <path
      className="ig-body"
      fillRule="evenodd"
      d="M3.5 10.8 12 3.6l8.5 7.2v9.1a.9.9 0 0 1-.9.9H4.4a.9.9 0 0 1-.9-.9v-9.1zm6 3.7h5v6.6h-5z"
    />,
  ),
  /**
   * 종류 — 분류 꼬리표. 햄버거(menu)를 쓰면 하단 탭에서 '더보기'로 읽힌다.
   * 구멍 evenodd.
   */
  tag: glyph(
    <path
      className="ig-body"
      fillRule="evenodd"
      d="M3.6 11V5.1A1.1 1.1 0 0 1 4.7 4h5.5c.3 0 .6.12.82.34l7.35 7.35a1.4 1.4 0 0 1 0 1.98l-5.1 5.1a1.4 1.4 0 0 1-1.98 0L3.94 11.42A1.1 1.1 0 0 1 3.6 11zm4.3-1.65a1.35 1.35 0 1 0 0-2.7 1.35 1.35 0 0 0 0 2.7z"
    />,
  ),
  /**
   * 채널 — 재생 목록(카드 + 재생 삼각). 목록 줄은 evenodd 구멍.
   * 이 서비스에서 채널은 사람 아바타가 아니라 롤(목록)이다.
   */
  channel: glyph(
    <>
      <path
        className="ig-body"
        fillRule="evenodd"
        d="M3.2 5h12v14H3.2zm2.5 3.5h6.8v1.5H5.7zm0 3.1h6.8v1.5H5.7zm0 3.1h4.4v1.5H5.7z"
      />
      <path className="ig-body" d="M16.4 9.4 21 12.3l-4.6 2.9z" />
    </>,
  ),
  globe: glyph(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.2 2.4 3.3 5.4 3.3 8.5s-1.1 6.1-3.3 8.5c-2.2-2.4-3.3-5.4-3.3-8.5S9.8 5.9 12 3.5Z" />
    </>,
  ),
} as const;

export type IconName = keyof typeof Icon;

/* ── 프레임 ──────────────────────────────────────────────────────────── */

/**
 * 썸네일이 앉는 16:9 프레임.
 *
 * ⚠️ 비율을 바꾸지 말 것 — 유튜브 원본이 16:9 라 여기서만 실제 잘림이 없다.
 *    다른 비율을 주는 순간 '썸네일 변형'이 되어 정책 위반이다(LEGAL.md 4.5).
 */
export function Frame({
  waxed = false,
  className = "",
  children,
}: {
  /** 고른 컷 — 왁스 연필로 두른 자국 */
  waxed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <span className={`frame ${waxed ? "waxed" : ""} ${className}`}>{children}</span>;
}

/* ── 채널 표식 ───────────────────────────────────────────────────────── */

/**
 * 채널 표식 — 프로필 사진이 있으면 사진, 없으면 이니셜.
 *
 * 채널 고유색(accent_color)은 **채움이 아니라 테두리 링**이다. DB 에서 오는 임의의
 * hex 라 그 위 글자의 대비를 보장할 수 없어서, 배경으로 쓰면 채널마다 가독성이
 * 달라진다. 링이면 대비는 항상 paper/sheet 가 책임지고 색은 식별만 한다.
 * 사진이 들어와도 링은 남는다 — 어두운 지면에서 원형 사진의 경계를 잡아 준다.
 *
 * 링을 inset box-shadow 가 아니라 border 로 그리는 이유: inset 그림자는 콘텐츠
 * 아래에 깔려서 사진이 덮어 버린다. border 는 콘텐츠 박스 바깥이라 안 가려진다.
 */
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
  /** 채널 프로필 이미지 URL. 없으면 이니셜로 떨어진다 */
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
        background: "var(--sheet)",
        border: `2px solid ${accent}`,
        fontSize: Math.round(size * 0.4),
        lineHeight: 1,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- yt3 CDN 원본을 크기 접미사만 바꿔 쓴다 (Thumb.tsx 와 같은 이유)
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

/* ── 텍스트 요소 ─────────────────────────────────────────────────────── */

/** 인덱스·라벨 — 콘택트 시트의 프레임 번호 문법 */
export function Index({
  children,
  tone = "dim",
  className = "",
  style,
}: {
  children: ReactNode;
  tone?: "dim" | "paper" | "wax";
  className?: string;
  /** 색 위에 얹는 예외. 색은 `tone` 이 정하므로 여기서 다시 주지 마라 */
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

/**
 * 메타 한 줄 — "간 곳 14 · 도쿄 · 4:32".
 *
 * 이전 월드의 DataRow(라벨/값 칸을 나눈 표)를 대체한다. 칸을 나누면 카드마다
 * 같은 표가 반복되어 화면이 표 모음이 되는데, 여기서는 프레임이 주인공이라
 * 메타는 한 줄로 눕혀 조용히 있어야 한다.
 */
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

/* ── 컨트롤 ──────────────────────────────────────────────────────────── */

/**
 * 프레임 인덱스 — 콘택트 시트의 컷 번호. 여기서는 지도 핀 번호와 1:1 이다.
 * 번호가 장식이 아니라 데이터인 유일한 자리라, 이 월드에서 숫자를 각진 칸에 넣는다.
 * 활성은 왁스 링 — "이 컷"이라고 연필로 두른 자국.
 */
export function FrameNo({ n, active = false }: { n: number; active?: boolean }) {
  return (
    <span
      aria-hidden
      className="index tnum grid size-7 shrink-0 place-items-center"
      style={{
        borderRadius: "var(--r-frame)",
        color: active ? "var(--wax)" : "var(--dim)",
        boxShadow: `inset 0 0 0 ${active ? "1.5px var(--wax)" : "1px var(--hairline)"}`,
      }}
    >
      {n}
    </span>
  );
}

/**
 * 액션 — 영상 열기 / 지도 열기 / 담기.
 *
 * 외부로 나가는 링크(http…)는 새 탭으로 연다. 유튜브로 돌아가는 링크를 막거나
 * 가리는 것은 정책 위반이라(LEGAL.md 4.5-(3)) 이 컨트롤은 항상 보이게 둔다.
 * 눌린 상태(담김)는 채움이 아니라 왁스 링으로 말한다.
 */
export function Act({
  icon,
  children,
  href,
  onClick,
  pressed = false,
  title,
}: {
  icon: IconName;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  pressed?: boolean;
  title?: string;
}) {
  const Glyph = Icon[icon];
  const cls = "inline-flex items-center gap-1.5 px-2.5 py-1.5 transition-colors";
  const style: React.CSSProperties = {
    fontSize: "var(--t-meta)",
    fontWeight: 500,
    borderRadius: "var(--r-control)",
    color: pressed ? "var(--paper)" : "var(--dim)",
    boxShadow: `inset 0 0 0 1px ${pressed ? "var(--wax)" : "var(--hairline)"}`,
  };
  const body = (
    <>
      <Glyph className="size-4 shrink-0" />
      <span>{children}</span>
    </>
  );

  if (href) {
    const external = href.startsWith("http");
    return external ? (
      <a
        href={href}
        title={title}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        style={style}
      >
        {body}
      </a>
    ) : (
      <Link href={href} title={title} className={cls} style={style}>
        {body}
      </Link>
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
      {body}
    </button>
  );
}

/**
 * 칩 — 필터·바로가기. href 면 링크, onClick 이면 버튼.
 * 활성은 채움이 아니라 왁스 링이다(왁스가 면적을 먹으면 월드가 무너진다).
 */
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
  const cls = "shrink-0 whitespace-nowrap px-3 py-1.5 transition-colors";
  const style: React.CSSProperties = {
    fontSize: "var(--t-meta)",
    fontWeight: 500,
    borderRadius: "var(--r-control)",
    color: active ? "var(--paper)" : "var(--dim)",
    boxShadow: `inset 0 0 0 1px ${active ? "var(--wax)" : "var(--hairline)"}`,
  };

  if (href) {
    return (
      <Link href={href} scroll={scroll} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${cls} cursor-pointer`} style={style}>
      {children}
    </button>
  );
}
