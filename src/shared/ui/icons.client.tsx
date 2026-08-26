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

import type { ReactNode, SVGProps } from "react";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowSquareOutIcon as ArrowSquareOut,
  BedIcon as Bed,
  CaretRightIcon as CaretRight,
  CheckIcon as Check,
  ClockIcon as Clock,
  CoffeeIcon as Coffee,
  ForkKnifeIcon as ForkKnife,
  GlobeIcon as Globe,
  ListIcon as List,
  MagnifyingGlassIcon as MagnifyingGlass,
  MapPinIcon as MapPin,
  PlayIcon as Play,
  PlaylistIcon as Playlist,
  ShareNetworkIcon as ShareNetwork,
  SignOutIcon as SignOut,
  TagIcon as Tag,
  TrashIcon as Trash,
  XIcon as X,
  type Icon as PhosphorIcon,
  type IconWeight,
} from "@phosphor-icons/react";
/* 홈·지도·하트·유저는 브랜드 글리프(라운드 키라인) — 탭독과 같은 손 */
import { GlyphHeart, GlyphHome, GlyphMap, GlyphUser } from "@/shared/ui/glyphs";
import { Chip } from "@/shared/ui/frame";

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
export const IconMap = ph(GlyphMap);
export const IconClose = ph(X);
export const IconMenu = ph(List);
export const IconHome = ph(GlyphHome);
export const IconTag = ph(Tag);
export const IconChannel = ph(Playlist);
export const IconGlobe = ph(Globe);
export const IconMeal = ph(ForkKnife);
export const IconCup = ph(Coffee);
export const IconBed = ph(Bed);
export const IconHeart = ph(GlyphHeart);
export const IconCheck = ph(Check);
export const IconShare = ph(ShareNetwork);
export const IconUser = ph(GlyphUser);
export const IconSignOut = ph(SignOut);
export const IconTrash = ph(Trash);

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
  heart: IconHeart,
  check: IconCheck,
  share: IconShare,
  user: IconUser,
  signOut: IconSignOut,
  trash: IconTrash,
} as const;

export type IconName = keyof typeof GLYPH;

/**
 * 글리프가 앞에 붙는 행동 알약 — 봉인된 `Chip` 의 얼굴 하나다.
 *
 * 🔴 여기서 크기·색을 다시 정하지 말 것. Act 는 "글리프를 고르는 일"만 하고,
 *    규격은 `Chip`(→ `globals.css` 의 `.chip*`) 이 전부 든다. 예전에는 이 파일이
 *    px-3/py-1.5/13px/w500 을 손으로 적어 아홉 벌 중 한 벌이었고, 휴지 상태만
 *    혼자 회색 **채움**이라 다른 칩들과 반전돼 보였다 — 그 어긋남은 `tone="soft"`
 *    라는 이름을 얻어 규격 안으로 들어왔다.
 */
export function Act({
  icon,
  children,
  href,
  onClick,
  pressed = false,
  size,
  title,
}: {
  icon: IconName;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  pressed?: boolean;
  /** `Chip` 의 단을 그대로 넘긴다 — 36px 짜리(`ShareButton`·`SubscribeButton`)와
      한 `flex-wrap` 에 설 때 `"md"` 를 준다. 기본은 28px. */
  size?: "sm" | "md";
  title?: string;
}) {
  const Glyph = GLYPH[icon] ?? IconOut;
  return (
    <Chip tone="soft" size={size} active={pressed} href={href} onClick={onClick} title={title}>
      <Glyph className="size-4 shrink-0" weight={pressed ? "fill" : "regular"} />
      <span>{children}</span>
    </Chip>
  );
}
