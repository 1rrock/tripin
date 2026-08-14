import { permanentRedirect } from "next/navigation";
import { getLocale, localePath } from "@/shared/i18n/locale";

/**
 * 지역 인덱스는 지도와 같다. 북마크는 `/map` 으로 넘긴다.
 * 도시 상세(`/city/[city]`)는 SEO 페이지로 남는다.
 */
export default async function CityIndexRedirect() {
  const locale = await getLocale();
  permanentRedirect(localePath("/map", locale));
}
