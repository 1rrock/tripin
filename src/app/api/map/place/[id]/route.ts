import { NextResponse } from "next/server";
import { loadMapPlace } from "@/shared/api/cities";
import { defaultLocale, isLocale } from "@/shared/i18n/config";

/**
 * 지도 드로어 — 첫 페인트 페이로드에 안 실은 요약·출처만 여기서 준다.
 *
 * ⚠️ 로케일은 `?l=` 로 받는다. 헤더로 받으면 CDN 캐시 키에 안 들어가서,
 *    s-maxage 로 캐시하면 KO 응답이 EN 요청에 그대로 나간다.
 *    요약은 로케일마다 다르므로 URL 로 갈라야 한다.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const asked = new URL(req.url).searchParams.get("l");
  const locale = asked && isLocale(asked) ? asked : defaultLocale;
  const place = await loadMapPlace(id, locale);
  if (!place) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(place, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
