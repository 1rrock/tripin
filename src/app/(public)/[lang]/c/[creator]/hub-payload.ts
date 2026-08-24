import type { PlaceType } from "@/shared/api/database.types";
import type { CreatorMapPlaceRaw } from "@/shared/api/creator-hub";
import type { VideoSummary } from "@/shared/api/videos";
import type { CreatorPlace } from "./CreatorExplorer";

/**
 * 채널 허브의 목록 계약 — 페이지(앞줄)와 라우트 핸들러(전체)가 **같은 매퍼**를 쓴다.
 * 그래야 이어붙인 뒤가 서버가 그린 것과 어긋나지 않는다.
 *
 * 허브에는 무제한 목록이 **둘** 있었다: 장소(후쿠오카 아저씨 647곳)와 영상
 * (정육왕 414편, 곽튜브 1,094편). 둘 다 클라이언트 컴포넌트 props 라 HTML 마크업
 * 한 벌 + RSC 플라이트 한 벌로 두 번 실렸고, 그게 1.07MB raw / 108.9KB gzip 이었다.
 * `videos.ts` 의 1000편 절단이 고쳐지면서 영상 축은 **더 자랄 수 있다** — 상한이
 * 없으면 이 문서는 채널이 부지런할수록 무거워진다.
 */

/**
 * 문서에 그리는 장소 앞줄. 나머지는 `CreatorExplorer` 가 마운트 뒤
 * `/api/creator/[creator]/places` 로 받아 갈아 끼운다.
 *
 * 36 은 `/city/[city]`(`CITY_HEAD`)·`/c/[creator]/[city]`(`PIECE_HEAD`)와 같은 수다 —
 * 행 높이 96px 안팎에 가장 긴 화면이 한 번에 12행이니 세 화면치. 목록 문법이
 * 같으므로 수도 같게 둔다.
 */
export const HUB_PLACE_HEAD = 36;

/**
 * 문서에 그리는 영상 앞줄, **그리고 마운트 뒤에도 유지되는 렌더 상한**.
 *
 * 왜 24이고 왜 36이 아닌가: 영상 칸(`VideoSheet`)은 썸네일 프레임을 든 카드라
 * 장소 행보다 한 칸이 4배 가까이 무겁다. 그리드가 모바일 1열 · md 2열 · xl 3열이니
 * 24 는 데스크톱 8줄 · 모바일 24줄 — 어느 폭에서도 첫 화면을 훨씬 넘긴다.
 *
 * 장소와 달리 영상은 데이터가 도착해도 **한꺼번에 다 그리지 않는다**. 1,094편
 * 채널에서 그러면 문서만 가벼워지고 DOM·이미지 요청은 그대로다. "더 보기"가
 * 이 수만큼씩 올린다 — 문서에도 DOM 에도 상한이 있다.
 */
export const HUB_VIDEO_HEAD = 24;

/** 목록 행이 읽는 최소 형태 — 왜 이 필드들만인지는 `CreatorExplorer` 의 `CreatorPlace` 주석. */
export function toCreatorPlace(p: CreatorMapPlaceRaw): CreatorPlace {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameLocal: p.nameLocal,
    nameEn: p.nameEn,
    placeType: p.placeType,
    citySlug: p.citySlug,
    cityName: p.cityName,
    cityNameEn: p.cityNameEn,
    firstVideoId: p.sources[0]?.youtubeId ?? null,
  };
}

/**
 * 허브의 영상 칸·검색·필터가 **실제로 읽는** 필드만.
 *
 * `VideoSummary` 의 `publishedAt`·`durationSec`·`lastStopSec` 는 이 화면에서
 * 한 번도 그려지지 않는다(그건 영상 상세의 타임라인 몫이다). 타입에만 있고
 * 화면에 없는 필드는 순수한 낭비다 — 1,094 를 곱해 보면 그렇다.
 * 로케일 무관: 제목은 유튜브 원문 그대로, 도시는 `name`·`nameEn` 을 둘 다 싣고
 * 표시 문자열은 화면이 고른다(`displayCityName`).
 */
export interface HubVideo {
  youtubeId: string;
  title: string;
  stopCount: number;
  cities: { slug: string; name: string; nameEn: string | null }[];
  types: PlaceType[];
  /** 카드 헤드라인이자 검색 대상 — 방문자는 영상 제목이 아니라 가게 이름을 기억한다 */
  placeNames: string[];
}

export function toHubVideo(v: VideoSummary): HubVideo {
  return {
    youtubeId: v.youtubeId,
    title: v.title,
    stopCount: v.stopCount,
    cities: v.cities,
    types: v.types,
    placeNames: v.placeNames,
  };
}
