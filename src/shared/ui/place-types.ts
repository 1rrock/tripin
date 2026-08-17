import type { PlaceType } from "@/shared/api/database.types";

/** 장소 타입 한글 라벨 — 유저 화면·어드민 공용. */
export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  restaurant: "맛집",
  cafe: "카페",
  attraction: "명소",
  hotel: "숙소",
  bar: "바",
  shop: "상점",
  viewpoint: "뷰포인트",
  fishing: "낚시",
  other: "기타",
  unknown: "미분류",
};

/** 필터 칩에 노출하는 타입 (사용 빈도순). unknown 은 필터로 안 보여줌. */
export const FILTERABLE_TYPES: PlaceType[] = [
  "restaurant",
  "cafe",
  "attraction",
  "viewpoint",
  "fishing",
  "hotel",
  "bar",
  "shop",
  "other",
];
