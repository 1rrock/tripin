import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
import { TypeIndexSkeleton } from "@/shared/ui/Skeleton";

export default async function Loading() {
  const locale = await getLocale();
  return <TypeIndexSkeleton label={getDictionary(locale).common.loading} />;
}
