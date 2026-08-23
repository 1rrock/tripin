import { NextResponse } from "next/server";
import { loadSearchIndex, pickLocale } from "@/shared/api/search";
import { isLocale } from "@/shared/i18n/config";

/**
 * 통합 검색 색인 — 검색을 처음 열 때 한 번만 받아 간다.
 *
 * 왜 레이아웃에 실어 보내지 않나: 유입이 SEO 중심이라 대부분의 방문자는 깊은
 * 페이지에 들어왔다가 검색을 열지 않고 나간다. 모든 페이지에 색인을 얹으면
 * 안 쓰는 사람에게 세금을 매기는 셈이다. 여는 사람만 받아 간다.
 *
 * ⚠️ `/api/*` 는 proxy 가 로케일 헤더를 붙이지 않는다(docs/I18N.md §1).
 *    그래서 로케일을 쿼리로 받는다. 로케일을 아는 이 층에서 한쪽만 골라
 *    내보낸다 — 둘 다 보내면 EN 응답에 한국어 원문이 실린다(HANDOFF §3-2).
 *
 * 본문은 문서 배열이 아니라 **압축 형식**(`PackedIndex`)이다 — 왜 그런지는
 * `shared/lib/search.ts` 의 "전선 형식" 주석에. 부르는 쪽(`SearchBar`)이
 * `unpackIndex` 로 되돌린다. 형식이 또 바뀌면 그쪽 `v=` 를 올려서 캐시를 가른다.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const raw = new URL(req.url).searchParams.get("locale") ?? "";
  const locale = isLocale(raw) ? raw : "ko";

  const packed = pickLocale(await loadSearchIndex(), locale);

  return NextResponse.json(packed, {
    headers: {
      // 색인은 조각을 공개할 때만 바뀐다 — 몇 분 묵어도 무해하다
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
