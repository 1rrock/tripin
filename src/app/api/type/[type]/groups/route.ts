import { NextResponse } from "next/server";
import { PUBLIC_DATA_TAG } from "@/shared/api/cache";
import { loadTypeDetail, parsePlaceType } from "@/shared/api/place-types";
import { toTypeListGroup } from "@/app/(public)/[lang]/type/[type]/list-payload";

/**
 * 종류 페이지의 **꼬리 도시들**. `/type/[type]` 문서에는 앞 3개 도시만 행으로
 * 실리고(`list-payload.ts` `VISIBLE_CITY_GROUPS`), 나머지는 "더 보기"를 누른 뒤
 * 이 JSON 을 받는다. `/api/map/index` 와 같은 계약이다 — 도시 46곳 × 12곳 = 552행이
 * HTML+RSC 로 두 번 실려 gzip 244KB 이던 문서를 여기로 옮겼다.
 *
 * 전체 그룹을 준다(앞 3개 포함). 호출부가 `slice(VISIBLE_CITY_GROUPS)` 로 자른다 —
 * 응답이 문서의 앞줄 개수와 무관해야 CDN 항목이 종류당 하나로 유지된다.
 * 로케일도 무관하다(`toTypeListGroup` 주석).
 */
/* 빌드 때 굽지 않는다 — 구우면 재배포 전까지 장소가 안 바뀐다.
   신선도는 응답의 s-maxage 로 CDN 이 본다. */
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type: typeParam } = await params;
  const type = parsePlaceType(typeParam);
  if (!type) return NextResponse.json({ groups: [] }, { status: 404 });
  const data = await loadTypeDetail(type);
  if (!data) return NextResponse.json({ groups: [] }, { status: 404 });
  return NextResponse.json(
    { groups: data.groups.map(toTypeListGroup) },
    {
      headers: {
        /* max-age 5분 — 뒤로가기·재방문이 같은 목록을 다시 안 받게 브라우저에도 앉힌다 */
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        // 어드민 purge 가 CDN 사본까지 지우게 — map 라우트들과 같은 태그
        "Cache-Tag": PUBLIC_DATA_TAG,
      },
    },
  );
}
