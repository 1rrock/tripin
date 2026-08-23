import type { TypeCityGroup } from "@/shared/api/place-types";

/**
 * 종류 페이지의 목록 계약 — 페이지(앞 그룹)와 라우트 핸들러(전체)가 **같은 모양**을
 * 쓴다. 그래야 "더 보기"로 이어붙인 그룹이 서버가 그린 그룹과 똑같이 그려진다.
 *
 * 로케일 무관 — `name`·`nameLocal`·`cityName`·`cityNameEn` 을 원본 그대로 싣고
 * 표시 문자열은 화면에서 고른다(`displayPlaceName`·`displayCityName`).
 * 그래서 `/api/type/[type]/groups` 의 CDN 항목도 종류당 하나다.
 */
export interface TypeListPlace {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  address: string | null;
  /** 대표 컷 — 이 장소를 실은 첫 출처 영상. 제목은 alt 용 원문 그대로 */
  cut: { youtubeId: string; videoTitle: string } | null;
}

export interface TypeListGroup {
  citySlug: string;
  cityName: string;
  cityNameEn: string;
  /** 이 도시의 이 종류 **전체** 수. `places` 는 `VISIBLE_PER_CITY` 로 잘려 있다 */
  count: number;
  places: TypeListPlace[];
}

/** 도시당 펼쳐 보여줄 상한. 나머지는 렌더하지 않고 도시 지도로 넘긴다(무게). */
export const VISIBLE_PER_CITY = 12;

/**
 * 문서에 그리는 **도시 그룹** 상한. 나머지는 도시 칩(실링크)으로만 남기고,
 * 행은 "더 보기"를 누른 뒤 `/api/type/[type]/groups` 로 받아 이어붙인다.
 *
 * 왜 3인가. `VISIBLE_PER_CITY` 가 12인데 **그룹 수에는 상한이 없었다** — 도시 46곳
 * × 12 = 552 ≈ 실측 555곳이라, 캡이 있는데 아무것도 안 자르고 있었다.
 * 3 × 12 = 36 곳이 문서에 남는 최대치이고, 이 36은 `/city/[city]`(`CITY_HEAD`)·
 * `/c/[creator]/[city]`(`PIECE_HEAD`)와 같은 수다 — 행 높이 96px 안팎에 가장 긴
 * 화면이 한 번에 12행이니 세 화면치. 그룹은 장소 수 많은 순으로 정렬돼 있어
 * 앞 3곳이 이 종류의 대표 도시들이고, 메타 설명이 앞세우는 도시들과도 겹친다.
 */
export const VISIBLE_CITY_GROUPS = 3;

export function toTypeListGroup(g: TypeCityGroup): TypeListGroup {
  return {
    citySlug: g.citySlug,
    cityName: g.cityName,
    cityNameEn: g.cityNameEn,
    count: g.places.length,
    places: g.places.slice(0, VISIBLE_PER_CITY).map((p) => {
      const cut = p.sources[0];
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        nameLocal: p.nameLocal,
        address: p.address,
        /* 출처 배열 전체가 아니라 **첫 컷 하나**만 — 행이 그리는 건 그것뿐이다.
           `sources` 를 통째로 실으면 555곳 × 채널·타임코드가 그대로 따라온다. */
        cut: cut ? { youtubeId: cut.youtubeId, videoTitle: cut.videoTitle } : null,
      };
    }),
  };
}

/** "더 보기" 앞에 실링크로 남기는 도시 — 행 없이 이름·개수만이라 무게가 없다. */
export interface TypeRestCity {
  citySlug: string;
  cityName: string;
  cityNameEn: string;
  count: number;
}
