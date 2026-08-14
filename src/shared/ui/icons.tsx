/**
 * 아이콘 한 벌 — 서버 컴포넌트에서도 `<Icon.chevron />` 이 그대로 된다.
 *
 * 이 파일에는 "use client" 가 없다. 그래야 서버 그래프에서도 실행되면서
 * ./icons.client 의 낱개 export 를 진짜 클라이언트 레퍼런스로 받아 표에 담는다.
 * (표 자체를 클라이언트 모듈에서 내보내면 서버에서는 속성이 undefined 로 풀린다.)
 */

import {
  IconBack,
  IconBed,
  IconChannel,
  IconCheck,
  IconChevron,
  IconClock,
  IconClose,
  IconCup,
  IconGlobe,
  IconHeart,
  IconHome,
  IconMap,
  IconMeal,
  IconMenu,
  IconOut,
  IconPin,
  IconPlay,
  IconSearch,
  IconSignOut,
  IconTag,
  IconTrash,
  IconUser,
} from "@/shared/ui/icons.client";

export { Act } from "@/shared/ui/icons.client";
export type { IconName } from "@/shared/ui/icons.client";

export const Icon = {
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
  user: IconUser,
  signOut: IconSignOut,
  trash: IconTrash,
} as const;
