"use client";

/**
 * Phosphor 글리프 — 이 파일만 클라이언트로 둔다.
 * 서버 페이지가 frame.tsx 를 읽어도 createContext 가 돌지 않게 분리했다.
 *
 * 🔴 여기서 아이콘을 **객체 한 덩어리로** 내보내지 말 것.
 *    서버 컴포넌트가 "use client" 모듈에서 받는 건 export 하나당 레퍼런스 하나다.
 *    `export const Icon = {...}` 로 묶으면 서버에서 `Icon.chevron` 이 없는 export 를
 *    가리켜 undefined 로 풀린다("Element type is invalid").
 *    그래서 글리프는 낱개 export 로 두고, 묶는 일은 서버에서 되는 ./icons 가 한다.
 */

import Link from "next/link";
import type { ReactNode, SVGProps } from "react";
import {
  ArrowLeft,
  ArrowSquareOut,
  Bed,
  CaretRight,
  Clock,
  Coffee,
  ForkKnife,
  Globe,
  House,
  List,
  MagnifyingGlass,
  MapPin,
  MapTrifold,
  Play,
  Playlist,
  Tag,
  X,
  type Icon as PhosphorIcon,
  type IconWeight,
} from "@phosphor-icons/react";
import { OutboundA } from "@/shared/ui/OutboundA";

type IconProps = SVGProps<SVGSVGElement> & { weight?: IconWeight };

function ph(IconComponent: PhosphorIcon, fallbackWeight: IconWeight = "regular") {
  return function Glyph({ className, style, weight }: IconProps) {
    return (
      <IconComponent
        className={className}
        style={style}
        weight={weight ?? fallbackWeight}
        aria-hidden
      />
    );
  };
}

export const IconSearch = ph(MagnifyingGlass);
export const IconChevron = ph(CaretRight);
export const IconBack = ph(ArrowLeft);
export const IconOut = ph(ArrowSquareOut);
export const IconPin = ph(MapPin);
export const IconClock = ph(Clock);
export const IconPlay = ph(Play);
export const IconMap = ph(MapTrifold);
export const IconClose = ph(X);
export const IconMenu = ph(List);
export const IconHome = ph(House);
export const IconTag = ph(Tag);
export const IconChannel = ph(Playlist);
export const IconGlobe = ph(Globe);
export const IconMeal = ph(ForkKnife);
export const IconCup = ph(Coffee);
export const IconBed = ph(Bed);

/** Act 가 icon 이름으로 글리프를 고를 때만 쓰는 안쪽 표. 밖으로 내보내지 않는다. */
const GLYPH = {
  search: IconSearch,
  chevron: IconChevron,
  back: IconBack,
  out: IconOut,
  pin: IconPin,
  clock: IconClock,
  play: IconPlay,
  map: IconMap,
  close: IconClose,
  menu: IconMenu,
  home: IconHome,
  tag: IconTag,
  channel: IconChannel,
  globe: IconGlobe,
  meal: IconMeal,
  cup: IconCup,
  bed: IconBed,
} as const;

export type IconName = keyof typeof GLYPH;

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
  const Glyph = GLYPH[icon] ?? IconOut;
  const cls =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-transform active:scale-95";
  const style: React.CSSProperties = pressed
    ? { color: "#fff", background: "var(--paper)" }
    : { color: "var(--paper)", background: "var(--hover)" };
  const body = (
    <>
      <Glyph className="size-4 shrink-0" weight={pressed ? "fill" : "regular"} />
      <span>{children}</span>
    </>
  );

  if (href) {
    const external = href.startsWith("http");
    return external ? (
      <OutboundA href={href} title={title} className={cls} style={style}>
        {body}
      </OutboundA>
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
