import type { PlaceType } from "@/shared/api/database.types";
import type { MapCanvasPin, MapCanvasPlace, MapIndexPayload, MapIndexRow } from "@/shared/api/cities";
import { choseong, isChoseongQuery, queryVariants } from "@/shared/lib/search";
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

/**
 * 훑기 직전에 한 번 준비한 필터. `q` 의 변이(접미 정규화)를 미리 들고 있다.
 *
 * 왜 타입을 따로 두는가: 예전엔 `placeMatchesMapFilter` 가 장소마다
 * `textMatchesQuery` 를 불렀고, 그 안의 `queryVariants` 가 장소마다
 * `trim().toLowerCase()` + 정규식 두 개를 다시 돌렸다. `/map` 은 같은 축으로
 * 1,845곳을 네 번(filtered·typeCounts·channelCounts·modalCities) 훑으므로
 * 검색어가 걸린 상태에서 필터를 한 번 건드릴 때마다 7,400번이었다.
 * 질의는 훑는 동안 안 바뀌니 축에서 한 번 계산해 들고 다닌다.
 *
 * 준비되지 않은 축을 넘길 수 없게 **타입으로** 막는다 — 옵셔널 필드로 두면
 * 빠뜨린 자리가 조용히 옛 비용으로 돌아간다.
 */
export type PreparedMapFilter = MapFilterAxes & {
  /** 빈 배열 = 질의 없음(전부 통과). `queryVariants` 의 결과 그대로. */
  qVariants: string[];
};

export function prepareMapFilter(axes: MapFilterAxes): PreparedMapFilter {
  return { ...axes, qVariants: axes.q ? queryVariants(axes.q) : [] };
}

/**
 * `textMatchesQuery` 와 같은 규칙 — 변이를 **밖에서 받는다**는 것만 다르다.
 * (`search.ts` 는 다른 소유자라 그쪽 시그니처를 못 바꾼다.)
 */
function hayMatchesVariants(hay: string, variants: string[]): boolean {
  if (variants.length === 0) return true;
  const h = hay.toLowerCase();
  for (const v of variants) {
    if (h.includes(v)) return true;
    if (isChoseongQuery(v) && choseong(hay).includes(v)) return true;
  }
  return false;
}

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

/* ─────────────────────────────────────────────────────────────────────────
   인덱스 전송 형태 — 사전 참조 + 검색어 조립
   ───────────────────────────────────────────────────────────────────────── */

/**
 * 위 필터가 읽는 `searchText` 를 만드는 **유일한** 자리.
 *
 * 서버가 항목마다 이 문자열을 실어 보내던 것을 그만뒀다(`/api/map/index` 가
 * 727KB → 절반). 재료가 전부 같은 응답 안에 이미 있었기 때문이다 — 이름·현지
 * 이름은 행에, 도시 두 이름과 종류는 사전에, 채널 이름은 채널 사전에.
 * 같은 것을 두 번 실어 보낸 셈이었다.
 *
 * ⚠️ **검색 결과가 예전과 한 글자도 달라지면 안 된다.** 그래서 규칙을 여기
 *    한 곳에만 둔다 — 서버가 조립하든(옛 `toMapCanvasPlace`) 클라이언트가
 *    조립하든(`decodeMapIndex`·드로어 대체 행) 전부 이 함수를 부른다.
 *    순서(이름 → 현지이름 → 도시 → 도시EN → 종류 → 채널명), 구분자(공백 하나),
 *    `filter(Boolean)`(빈 문자열·null 탈락), `toLowerCase()` 는 옛 구현 그대로다.
 *
 * `creatorNames` 는 **중복 포함**으로 넘겨도 된다 — 여기서 `Set` 으로 첫 등장
 * 순서만 남긴다. 옛 구현은 장소의 원본 출처 목록(같은 채널의 여러 영상이 들어
 * 있다)에서 이름을 뽑아 dedup 했는데, 전송 형태는 이미 채널 슬러그로 dedup 된
 * 목록만 싣는다. 슬러그 → 이름은 함수이므로 "슬러그로 먼저 줄이고 이름으로
 * 다시 줄인 것" 과 "이름으로 한 번에 줄인 것" 은 같은 배열이 된다(같은 슬러그는
 * 반드시 같은 이름 → 이름 쪽에서 어차피 지워졌을 항목만 미리 지워진 것).
 */
export function mapSearchText(
  p: {
    name: string;
    nameLocal: string | null;
    cityName: string;
    cityNameEn: string | null;
    placeType: PlaceType;
  },
  creatorNames: string[],
): string {
  return [
    p.name,
    p.nameLocal,
    p.cityName,
    p.cityNameEn,
    p.placeType,
    ...new Set(creatorNames),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * 인덱스 행 하나 → 핀. 검색어는 안 만든다 — 드로어(`/api/map/place/[id]`)는
 * 필터를 안 돌리므로 그 응답에서는 이 조립 비용도, 바이트도 없어야 한다.
 */
export function decodeMapPin(payload: MapIndexPayload, row: MapIndexRow): MapCanvasPin {
  const [id, name, slug, nameLocal, typeIdx, lat, lng, cityIdx, youtubeId, creatorIdxs] = row;
  const [citySlug, cityName, cityNameEn, countryCode] = payload.cities[cityIdx]!;
  return {
    id,
    name,
    slug,
    nameLocal,
    placeType: payload.types[typeIdx]!,
    lat,
    lng,
    citySlug,
    cityName,
    cityNameEn,
    countryCode,
    youtubeId,
    sources: creatorIdxs.map((i) => ({ creatorSlug: payload.creators[i]![0] })),
  };
}

/**
 * 전송 형태 → 캔버스가 쓰는 행. 사전 참조를 풀고 검색어를 조립한다.
 *
 * 1,845곳이면 문자열 이어붙이기가 1,845번이지만, 같은 응답에서 덜어낸 JSON
 * (검색어 113KB + 사전화된 도시·종류·채널)의 파싱 비용이 그보다 크다 —
 * 순수하게 뺀 쪽이 이득이다. 서버가 매 요청 다시 만들던 것도 아니었다
 * (`map:canvas-index` 캐시 항목이었다) — 옮겨 온 것은 캐시 항목의 무게가 아니라
 * **회선으로 나가던 무게**다.
 */
export function decodeMapIndex(payload: MapIndexPayload): MapCanvasPlace[] {
  return payload.places.map((row) => {
    const pin = decodeMapPin(payload, row);
    return {
      ...pin,
      searchText: mapSearchText(
        pin,
        row[9].map((i) => payload.creators[i]![1]),
      ),
    };
  });
}

export function placeMatchesMapFilter(
  place: MapFilterPlace,
  axes: PreparedMapFilter,
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
  if (!hayMatchesVariants(place.searchText, axes.qVariants)) return false;
  return true;
}

export function countMatchingPlaces(
  places: MapFilterPlace[],
  axes: MapFilterAxes,
  saved: MapSavedLookup,
) {
  return countPrepared(places, prepareMapFilter(axes), saved);
}

function countPrepared(
  places: MapFilterPlace[],
  prepared: PreparedMapFilter,
  saved: MapSavedLookup,
) {
  let n = 0;
  for (const place of places) {
    if (placeMatchesMapFilter(place, prepared, saved)) n += 1;
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
  /* 질의는 여기서 안 푼다(위 주석) — 시도 다섯 번이 같은 변이를 쓰므로 한 번만 만든다 */
  const qVariants = next.q ? queryVariants(next.q) : [];
  if (countPrepared(places, { ...next, qVariants }, saved) > 0) return next;

  const dropOrder: DroppableAxis[] = ["type", "channel", "city", "region"];
  let cur = { ...next };
  for (const key of dropOrder) {
    if (keep.includes(key) || !cur[key]) continue;
    const trial = { ...cur, [key]: null };
    if (countPrepared(places, { ...trial, qVariants }, saved) > 0) return trial;
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
