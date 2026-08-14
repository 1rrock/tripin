import { permanentRedirect } from "next/navigation";
import { getLocale, localePath } from "@/shared/i18n/locale";

/**
 * 종류 인덱스는 홈과 같다 — 홈 카테고리 그리드가 이미 종류 전부를 깔고 있어서
 * 이 화면은 같은 걸 한 번 더 보여주는 자리였다. 북마크는 홈으로 넘긴다.
 * 종류 상세(`/type/[type]`)는 SEO 페이지로 남는다.
 */
export default async function TypeIndexRedirect() {
  const locale = await getLocale();
  permanentRedirect(localePath("/", locale));
}
