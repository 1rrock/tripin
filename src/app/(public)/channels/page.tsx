import { permanentRedirect } from "next/navigation";
import { getLocale, localePath } from "@/shared/i18n/locale";

/**
 * 채널 인덱스는 지도와 같다. 북마크는 `/map` 으로 넘긴다.
 * 채널 허브(`/c/[creator]`)는 SEO 페이지로 남는다.
 */
export default async function ChannelsRedirect() {
  const locale = await getLocale();
  permanentRedirect(localePath("/map", locale));
}
