import type { PlaceType } from "@/shared/api/database.types";
import { textMatchesQuery } from "@/shared/lib/search";
import { homeRegionForCountry, type HomeRegionId } from "@/shared/lib/geo-regions";

export type MapFilterAxes = {
  city: string | null;
  region: HomeRegionId | null;
  channel: string | null;
  type: PlaceType | null;
  q: string;
  savedOnly: boolean;
  listId: string | null;
};

export type MapFilterPlace = {
  id: string;
  citySlug: string;
  countryCode: string;
  placeType: PlaceType;
  searchText: string;
  sources: { creatorSlug: string }[];
};

export type MapSavedLookup = {
  isSaved: (id: string) => boolean;
  listsOf: (id: string) => Set<string>;
};

export function matchesMapQuery(hay: string, q: string) {
  return textMatchesQuery(hay, q);
}

export function placeMatchesMapFilter(
  place: MapFilterPlace,
  axes: MapFilterAxes,
  saved: MapSavedLookup,
): boolean {
  if (axes.listId && !saved.listsOf(place.id).has(axes.listId)) return false;
  if (axes.savedOnly && !saved.isSaved(place.id)) return false;
  if (axes.city && place.citySlug !== axes.city) return false;
  if (!axes.city && axes.region && homeRegionForCountry(place.countryCode) !== axes.region) {
    return false;
  }
  if (axes.channel && !place.sources.some((s) => s.creatorSlug === axes.channel)) return false;
  if (axes.type && place.placeType !== axes.type) return false;
  if (axes.q && !matchesMapQuery(place.searchText, axes.q)) return false;
  return true;
}

export function countMatchingPlaces(
  places: MapFilterPlace[],
  axes: MapFilterAxes,
  saved: MapSavedLookup,
) {
  let n = 0;
  for (const place of places) {
    if (placeMatchesMapFilter(place, axes, saved)) n += 1;
  }
  return n;
}

type DroppableAxis = "type" | "channel" | "city" | "region";

/**
 * 교집합이 0이면 방금 고른 축(keep)은 두고 상대 축을 풀어 장소가 남게 한다.
 * q·saved·list 는 검색/저장 의도라 여기서 풀지 않는다.
 */
export function reconcileMapFilter<T extends MapFilterPlace>(
  places: T[],
  next: MapFilterAxes,
  keep: DroppableAxis[],
  saved: MapSavedLookup,
): MapFilterAxes {
  if (countMatchingPlaces(places, next, saved) > 0) return next;

  const dropOrder: DroppableAxis[] = ["type", "channel", "city", "region"];
  let cur = { ...next };
  for (const key of dropOrder) {
    if (keep.includes(key) || !cur[key]) continue;
    const trial = { ...cur, [key]: null };
    if (countMatchingPlaces(places, trial, saved) > 0) return trial;
    cur = trial;
  }
  return cur;
}

export function keepAxesForApply(
  prev: Pick<MapFilterAxes, "city" | "region" | "channel" | "type">,
  next: Pick<MapFilterAxes, "city" | "region" | "channel" | "type">,
): DroppableAxis[] {
  if (prev.city !== next.city || prev.region !== next.region) return ["city", "region"];
  if (prev.channel !== next.channel) return ["channel"];
  if (prev.type !== next.type) return ["type"];
  return [];
}
