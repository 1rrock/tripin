import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";

/**
 * 클라이언트 이동용 즉시 크롬. 클릭 직후 홈이 1~2초 얼어 보이지 않게 한다.
 * 카드 뼈는 넣지 않는다 — 하드 내비게이션에서 그게 LCP 가 됐었다.
 */
export default async function Loading() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return (
    <main>
      <div className="canvas-page canvas-root" aria-busy="true" aria-label={m.common.loading}>
        <div className="canvas-map" />
        <div className="canvas-sheet-clip">
          <section className="canvas-panel" />
        </div>
      </div>
    </main>
  );
}
