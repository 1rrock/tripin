import { NextResponse } from "next/server";
import { PUBLIC_DATA_TAG } from "@/shared/api/cache";
import { loadCreatorVideos } from "@/shared/api/videos";
import { toHubVideo } from "@/app/(public)/[lang]/c/[creator]/hub-payload";

/**
 * 채널 허브 영상 목록의 **꼬리**. `/c/[creator]` 문서에는 앞줄 24편만 실리고
 * (`hub-payload.ts` `HUB_VIDEO_HEAD`), 나머지는 `VideoList` 가 마운트된 뒤 이 JSON 을
 * 받는다 — 검색·필터가 24편이 아니라 전편을 훑어야 하기 때문이다.
 *
 * `toHubVideo` 로 화면이 실제로 읽는 필드만 남긴다. `videos.ts` 의 1000편 절단이
 * 고쳐지면서 이 배열은 앞으로 더 길어질 수 있으니, 필드를 늘리기 전에 1,094 를
 * 곱해 볼 것.
 *
 * 로케일 무관 — 제목은 유튜브 원문, 도시는 `name`·`nameEn` 을 둘 다 싣는다.
 * 그래서 CDN 항목도 채널당 하나다.
 */
/* 빌드 때 굽지 않는다 — 구우면 재배포 전까지 영상이 안 바뀐다.
   신선도는 응답의 s-maxage 로 CDN 이 본다. */
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ creator: string }> },
) {
  const { creator } = await params;
  const data = await loadCreatorVideos(creator);
  if (!data) return NextResponse.json({ videos: [] }, { status: 404 });
  return NextResponse.json(
    { videos: data.videos.map(toHubVideo) },
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
