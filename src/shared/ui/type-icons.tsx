"use client";

/**
 * 장소 종류 아이콘·색 — 앱의 모든 화면이 이 한 벌을 쓴다.
 *
 * Phosphor. Lucide 기본 선은 AI 기본값으로 읽혀서 쓰지 않는다.
 * weight(duotone/fill)와 색은 맵이 아니라 **그리는 쪽**이 정한다.
 * 홈 그리드(10칸)는 무채 duotone, 카드에 하나만 붙는 라벨은 고유색.
 */

import type { Icon } from "@phosphor-icons/react";
import {
  GlyphBed,
  GlyphCafe,
  GlyphChannel,
  GlyphLandmark,
  GlyphMap,
  GlyphMeal,
  GlyphMore,
  GlyphPin,
  GlyphShop,
  GlyphView,
  GlyphWine,
  GlyphFish,
} from "@/shared/ui/glyphs";
import type { PlaceType } from "@/shared/api/database.types";

export function typeIcon(type: PlaceType | string | null | undefined): Icon {
  if (type && type in TYPE_ICON) return TYPE_ICON[type as PlaceType];
  return TYPE_ICON.other;
}

export const TYPE_ICON: Record<PlaceType, Icon> = {
  restaurant: GlyphMeal,
  cafe: GlyphCafe,
  hotel: GlyphBed,
  attraction: GlyphLandmark,
  bar: GlyphWine,
  shop: GlyphShop,
  viewpoint: GlyphView,
  fishing: GlyphFish,
  other: GlyphPin,
  unknown: GlyphPin,
};

/** 홈 그리드에 깔리는 종류. 도구 3칸과 같이 5열로 깔린다. */
export const HOME_TYPES: PlaceType[] = [
  "restaurant",
  "cafe",
  "hotel",
  "attraction",
  "bar",
  "shop",
  "viewpoint",
];

/* 🔴 종류별 색표(`TYPE_COLOR`, Tailwind 10색)를 되살리지 말 것.
   `globals.css` 의 "한 화면에 3개 이상 동시에 깔리는 칸에 제각각 색을 주지
   않는다(무지개)" 가 정확히 이것이다. 종류 목록은 한 화면에 열 종류가
   동시에 깔리는 자리라, 색표가 붙는 순간 목록 전체가 무지개가 된다.
   삭제 시점(2026-08-23)에 이미 참조처는 `ResultRow` 하나였고 그 prop 을
   넘기는 호출자는 0개였다 — 보이지 않는 채로 장전만 돼 있던 총이다.
   종류는 **글리프**로 가른다. 색이 아니라. */

export const TOOL_ICON = {
  region: GlyphMap,
  channel: GlyphChannel,
  more: GlyphMore,
} as const;
