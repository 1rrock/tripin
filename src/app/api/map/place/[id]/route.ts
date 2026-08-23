import { NextResponse } from "next/server";
import { PUBLIC_DATA_TAG } from "@/shared/api/cache";
import { NOT_FOUND_CACHE_HEADERS } from "@/shared/api/route-cache";
import { loadMapCanvasPlace, loadMapPlace } from "@/shared/api/cities";
import { loadPlaceCelebrities } from "@/shared/api/celebs";
import { defaultLocale, isLocale } from "@/shared/i18n/config";

/**
 * 지도 드로어 — 첫 페인트 페이로드에 안 실은 요약·출처만 여기서 준다.
 *
 * ⚠️ 로케일은 `?l=` 로 받는다. 헤더로 받으면 CDN 캐시 키에 안 들어가서,
 *    s-maxage 로 캐시하면 KO 응답이 EN 요청에 그대로 나간다.
 *    요약은 로케일마다 다르므로 URL 로 갈라야 한다.
 *
 * 핀 필드(이름·좌표·종류)도 같이 싣는다 — `?place=` 딥링크가 1,845곳 캔버스
 * 인덱스를 기다리지 않고 이 응답 하나로 드로어를 세울 수 있게. 캐시 항목이
 * 커지는 게 아니라(캔버스 인덱스는 이미 있는 항목) 응답에서 합칠 뿐이다.
 *
 * 검색어(`searchText`)는 여기 없다 — 드로어는 필터를 안 돌린다. 필요하면
 * 받는 쪽이 `mapSearchText` 로 조립한다(HomeCanvas `fallbackDetailPlace`).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const asked = new URL(req.url).searchParams.get("l");
  const locale = asked && isLocale(asked) ? asked : defaultLocale;
  const [place, pin] = await Promise.all([loadMapPlace(id, locale), loadMapCanvasPlace(id)]);
  // 404 도 CDN 에 앉힌다 — 없는 id 마다 오리진이 깨는 걸 막는다(route-cache.ts)
  if (!place) return NextResponse.json(null, { status: 404, headers: NOT_FOUND_CACHE_HEADERS });
  // 연예인 배지는 캐시된 인덱스에 안 실린다(cities.ts MapPlaceDetail 주석 —
  // 2MB 상한). 여기서 따로 조회해 붙인다 — CDN s-maxage 가 이 비용을 흡수한다.
  const celebrities = await loadPlaceCelebrities(
    id,
    [...new Set(place.sources.map((s) => s.creatorSlug))],
  );
  return NextResponse.json(
    { ...pin, ...place, celebrities },
    {
      headers: {
        /* max-age 가 핵심이다 — s-maxage 만 있으면 브라우저가 캐시를 못 해
           같은 장소를 다시 열 때마다 CDN 까지 나갔다. 장소×로케일로 흩어진
           CDN 키는 미스가 잦으니 브라우저 5분이 재열람을 0ms 로 만든다. */
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        /* 어드민 purge(`vercel cache invalidate --tag public-data`)가 페이지와
           같이 이 CDN 사본도 지우게 한다. */
        "Cache-Tag": PUBLIC_DATA_TAG,
      },
    },
  );
}
