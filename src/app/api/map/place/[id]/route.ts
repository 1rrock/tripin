import { NextResponse } from "next/server";
import { loadMapPlace } from "@/shared/api/cities";
import { getLocale } from "@/shared/i18n/locale";

/** 지도 드로어 — 첫 페인트 페이로드에 안 실은 요약·출처만 여기서 준다. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const locale = await getLocale();
  const place = await loadMapPlace(id, locale);
  if (!place) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(place, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
