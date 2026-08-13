import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
import { HomeSkeleton } from "@/shared/ui/Skeleton";

export default async function Loading() {
  const locale = await getLocale();
  return <HomeSkeleton label={getDictionary(locale).common.loading} />;
}
