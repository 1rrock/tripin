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

/**
 * 필터 칩에 노출하는 타입 (사용 빈도순). unknown 은 필터로 안 보여줌.
 *
 * ⚠️ 이 배열은 필터 목록이 아니라 **라우팅의 문지기**이기도 하다 —
 * `shared/api/place-types.ts` 의 `parsePlaceType()` 이 여기 없는 값을 null 로
 * 돌려서 `/type/<그것>` 이 404 가 된다. enum 에 종류를 더하면(migration) 여기도
 * 같이 더할 것. `fishing` 이 정확히 그 구멍이었다: `0012_place_type_fishing.sql`
 * 이 enum 에 넣고 인제스트에도 `defaultType:"fishing"` 채널이 셋 있는데 이 배열에만
 * 없어서, 첫 낚시 장소가 들어오는 순간 갈 곳 없는 라벨이 될 참이었다.
 *
 * 🔴 `HOME_TYPES`(type-icons.tsx)와 같은 목록이 아니다. 그쪽은 홈 그리드에 타일로
 *    깔리는 것이라 0건인 종류를 넣으면 빈 화면으로 보내는 타일이 된다.
 */
export const FILTERABLE_TYPES: PlaceType[] = [
  "restaurant",
  "cafe",
  "attraction",
  "viewpoint",
  "hotel",
  "bar",
  "shop",
  "fishing",
  "other",
];
