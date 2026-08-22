import { permanentRedirect } from "next/navigation";
import type { Locale } from "@/shared/i18n/config";
import { localePath } from "@/shared/i18n/locale";

/**
 * 지역 인덱스는 지도와 같다. 북마크는 `/map` 으로 넘긴다.
 * 도시 상세(`/city/[city]`)는 SEO 페이지로 남는다.
 */
export const revalidate = 3600;

export default async function CityIndexRedirect({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  permanentRedirect(localePath("/map", locale));
}
