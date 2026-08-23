import { NextResponse } from "next/server";
import { PUBLIC_DATA_TAG } from "@/shared/api/cache";
import { NOT_FOUND_CACHE_HEADERS } from "@/shared/api/route-cache";
import { loadCityDetail } from "@/shared/api/cities";
import { toCityPlace } from "@/app/(public)/[lang]/city/[city]/list-payload";

/**
 * 도시 지도 목록의 **꼬리**. `/city/[city]` 문서에는 앞줄 36곳만 실리고
 * (`list-payload.ts` `CITY_HEAD`), 나머지는 캔버스가 마운트된 뒤 이 JSON 을 받는다.
 * `/api/map/index` 와 같은 계약이다 — 후쿠오카 573곳이 HTML+RSC 로 두 번 실려
 * gzip 188KB 이던 문서를 여기로 옮겼다.
 *
 * 로케일 무관 — `toCityPlace` 가 남기는 필드는 전부 원본(`name`·`nameLocal`·주소)
 * 이고 표시 문자열은 클라이언트가 고른다. 그래서 CDN 항목도 도시당 하나다.
 */
/* 빌드 때 굽지 않는다 — 구우면 재배포 전까지 장소가 안 바뀐다.
   신선도는 응답의 s-maxage 로 CDN 이 본다. */
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ city: string }> },
) {
  const { city } = await params;
  const data = await loadCityDetail(city);
  // 404 도 CDN 에 앉힌다 — 없는 slug 마다 오리진이 깨는 걸 막는다(route-cache.ts)
  if (!data)
    return NextResponse.json({ places: [] }, { status: 404, headers: NOT_FOUND_CACHE_HEADERS });
  return NextResponse.json(
    { places: data.places.map(toCityPlace) },
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
