import { NextResponse } from "next/server";
import { PUBLIC_DATA_TAG } from "@/shared/api/cache";
import { loadMapCanvasIndex } from "@/shared/api/cities";

/**
 * `/map` 첫 HTML 에 1665곳을 싣지 않는다. 캔버스가 마운트된 뒤 이 JSON 을 받는다.
 * 로케일 무관 — `loadMapCanvasIndex` 주석 참조. 그래서 CDN 항목도 하나다.
 *
 * 응답은 `MapIndexPayload` 를 **그대로** 흘려 보낸다 — 도시·종류·채널 사전과
 * 자리번호만 든 행들(cities.ts `MapIndexPayload` 주석). 여기서 재가공하지
 * 마라: 캐시 항목과 회선 페이로드가 같은 객체여야 이 라우트가 8ms 로 끝난다.
 * 푸는 쪽은 받은 자리(HomeCanvas)의 `decodeMapIndex` 하나뿐이다.
 */
/* 빌드 때 굽지 않는다 — 구우면 재배포 전까지 장소가 안 바뀐다.
   신선도는 응답의 s-maxage 로 CDN 이 본다. */
export const dynamic = "force-dynamic";

export async function GET() {
  const index = await loadMapCanvasIndex();
  return NextResponse.json(
    index,
    {
      headers: {
        /* max-age 5분 — 뒤로가기·재방문이 페이로드를 다시 안 받게 브라우저에도 앉힌다 */
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        // 어드민 purge 가 CDN 사본까지 지우게 — place 라우트와 같은 태그
        "Cache-Tag": PUBLIC_DATA_TAG,
      },
    },
  );
}
