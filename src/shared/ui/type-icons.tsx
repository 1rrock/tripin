"use client";

/**
 * 장소 종류 아이콘·색 — 앱의 모든 화면이 이 한 벌을 쓴다.
 *
 * Phosphor. Lucide 기본 선은 AI 기본값으로 읽혀서 쓰지 않는다.
 * weight(duotone/fill)와 색은 맵이 아니라 **그리는 쪽**이 정한다.
 * 홈 그리드(10칸)는 무채 duotone, 카드에 하나만 붙는 라벨은 고유색.
 */

import {
  Bed,
  Binoculars,
  BowlFood,
  CirclesThreePlus,
  CoffeeBean,
  Buildings,
  MapPinSimple,
  MapTrifold,
  Playlist,
  Storefront,
  Wine,
  type Icon,
} from "@phosphor-icons/react";
import type { PlaceType } from "@/shared/api/database.types";

export function typeIcon(type: PlaceType | string | null | undefined): Icon {
  if (type && type in TYPE_ICON) return TYPE_ICON[type as PlaceType];
  return TYPE_ICON.other;
}

export const TYPE_ICON: Record<PlaceType, Icon> = {
  restaurant: BowlFood,
  cafe: CoffeeBean,
  hotel: Bed,
  attraction: Buildings,
  bar: Wine,
  shop: Storefront,
  viewpoint: Binoculars,
  other: MapPinSimple,
  unknown: MapPinSimple,
};

/** 홈 그리드에 깔리는 종류 — 5열 × 이 7칸 + 도구 3칸 = 10 */
export const HOME_TYPES: PlaceType[] = [
  "restaurant",
  "cafe",
  "hotel",
  "attraction",
  "bar",
  "shop",
  "viewpoint",
];

export const TYPE_COLOR: Record<PlaceType, { fg: string; softBg: string; solid: string }> = {
  restaurant: { fg: "text-red-600", softBg: "bg-red-500/10", solid: "bg-red-600" },
  cafe: { fg: "text-amber-700", softBg: "bg-amber-600/10", solid: "bg-amber-700" },
  hotel: { fg: "text-indigo-600", softBg: "bg-indigo-500/10", solid: "bg-indigo-500" },
  attraction: { fg: "text-teal-700", softBg: "bg-teal-500/10", solid: "bg-teal-600" },
  bar: { fg: "text-violet-700", softBg: "bg-violet-500/10", solid: "bg-violet-600" },
  shop: { fg: "text-yellow-700", softBg: "bg-yellow-500/10", solid: "bg-yellow-600" },
  viewpoint: { fg: "text-purple-700", softBg: "bg-purple-500/10", solid: "bg-purple-600" },
  other: { fg: "text-slate-500", softBg: "bg-slate-500/10", solid: "bg-slate-500" },
  unknown: { fg: "text-slate-500", softBg: "bg-slate-500/10", solid: "bg-slate-500" },
};

export const TOOL_ICON = {
  region: MapTrifold,
  channel: Playlist,
  more: CirclesThreePlus,
} as const;
