import { NextResponse } from "next/server";
import { loadHomeMap, toMapCanvasPlace } from "@/shared/api/cities";
import { getLocale } from "@/shared/i18n/locale";

/** `/map` 첫 HTML 에 1665곳을 싣지 않는다. 캔버스가 마운트된 뒤 이 JSON 을 받는다. */
export async function GET() {
  const locale = await getLocale();
  const places = (await loadHomeMap(locale)).map(toMapCanvasPlace);
  return NextResponse.json(
    { places },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
