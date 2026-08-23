import { NextResponse } from "next/server";
import { PUBLIC_DATA_TAG } from "@/shared/api/cache";
import { NOT_FOUND_CACHE_HEADERS } from "@/shared/api/route-cache";
import { loadCreatorMap } from "@/shared/api/creator-hub";
import { toCreatorPlace } from "@/app/(public)/[lang]/c/[creator]/hub-payload";

/**
 * 채널 허브 장소 목록의 **꼬리**. `/c/[creator]` 문서에는 앞줄 36곳만 실리고
 * (`hub-payload.ts` `HUB_PLACE_HEAD`), 나머지는 `CreatorExplorer` 가 마운트된 뒤
 * 이 JSON 을 받는다. `/api/map/index`·`/api/city/[city]/places` 와 같은 계약이다.
 *
 * 로케일 무관 — `toCreatorPlace` 가 남기는 필드는 전부 원본이고 표시 문자열은
 * 클라이언트가 고른다. 그래서 CDN 항목도 채널당 하나다.
 */
/* 빌드 때 굽지 않는다 — 구우면 재배포 전까지 장소가 안 바뀐다.
   신선도는 응답의 s-maxage 로 CDN 이 본다. */
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ creator: string }> },
) {
  const { creator } = await params;
  const data = await loadCreatorMap(creator);
  // 404 도 CDN 에 앉힌다 — 없는 slug 마다 오리진이 깨는 걸 막는다(route-cache.ts)
  if (!data)
    return NextResponse.json({ places: [] }, { status: 404, headers: NOT_FOUND_CACHE_HEADERS });
  return NextResponse.json(
    { places: data.places.map(toCreatorPlace) },
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
