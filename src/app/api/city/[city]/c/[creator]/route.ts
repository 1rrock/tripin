import { NextResponse } from "next/server";
import { PUBLIC_DATA_TAG } from "@/shared/api/cache";
import { loadPiece, toPublicPlace } from "@/app/(public)/[lang]/c/[creator]/[city]/loader";

/**
 * 조각(채널×도시) 목록의 **꼬리**. `/c/[creator]/[city]` 문서에는 앞줄 36곳만
 * 실리고(`loader.ts` `PIECE_HEAD`), 나머지는 Explorer 가 마운트된 뒤 이 JSON 을 받는다.
 * `/api/map/index`·`/api/city/[city]/places` 와 같은 계약이다.
 *
 * 로케일 무관 — `toPublicPlace` 가 남기는 필드는 전부 원본이고 표시 문자열은
 * 클라이언트가 고른다. 그래서 CDN 항목도 조각당 하나다.
 *
 * 도시가 앞 세그먼트인 이유: 이 라우트는 도시 목록(`/api/city/[city]/places`)의
 * "한 채널만" 변주다. 둘이 같은 가지에 있어야 캐시 태그·수명도 한 자리에서 읽힌다.
 */
/* 빌드 때 굽지 않는다 — 구우면 재배포 전까지 장소가 안 바뀐다.
   신선도는 응답의 s-maxage 로 CDN 이 본다. */
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ city: string; creator: string }> },
) {
  const { city, creator } = await params;
  const data = await loadPiece({ creator, city });
  if (!data) return NextResponse.json({ places: [] }, { status: 404 });
  return NextResponse.json(
    { places: data.places.map(toPublicPlace) },
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
