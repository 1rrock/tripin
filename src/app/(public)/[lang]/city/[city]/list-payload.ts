import type { CityPlaceRaw } from "@/shared/api/cities";
import type { CityPlace } from "./CityExplorer";

/**
 * 문서에 그리는 **앞줄** 개수. 나머지는 `CityExplorer` 가 마운트 뒤
 * `/api/city/[city]/places` 로 한 번에 받아 갈아 끼운다 — `/map` 이 씨앗 6곳으로
 * 이미 푼 처방(`map/page.tsx`·`api/map/index/route.ts`)을 그대로 옮긴 것이다.
 *
 * 왜 36인가. 이 목록의 행은 96px 안팎이고, 가장 긴 화면(데스크톱 패널 ~1100px)이
 * 한 번에 12행을 보여준다. 36 = **세 화면치** — 스크롤을 시작한 사람이 인덱스
 * 응답을 기다리는 일이 사실상 없는 최소값이다. `/map` 의 6은 지도가 본체인
 * 화면에서나 되는 수고, 목록이 본체인 여기서는 첫 화면도 못 채운다.
 * 위로는 48을 안 넘긴다 — 후쿠오카 573곳이 gzip 188KB 였으니 한 행이 0.3KB
 * 안팎이고, 48행부터는 문서가 다시 40KB 를 넘본다.
 * `/type/[type]` 의 3그룹 × 12곳(`VISIBLE_PER_CITY`)과 같은 수로 맞췄다.
 */
export const CITY_HEAD = 36;

/**
 * 목록·핀이 읽는 최소 형태로 줄인다 — 왜 이 필드들만인지는 `CityExplorer` 의
 * `CityPlace` 주석에 있다. 페이지(앞줄)와 라우트 핸들러(전체)가 **같은 함수**를
 * 써야 이어붙일 때 모양이 어긋나지 않는다.
 */
export function toCityPlace(p: CityPlaceRaw): CityPlace {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameLocal: p.nameLocal,
    nameEn: p.nameEn,
    placeType: p.placeType,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    creatorSlugs: [...new Set(p.sources.map((s) => s.creatorSlug))],
    youtubeId: p.sources[0]?.youtubeId ?? null,
  };
}
