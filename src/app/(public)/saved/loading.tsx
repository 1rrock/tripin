import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
import { SavedSkeleton } from "@/shared/ui/Skeleton";

export default async function Loading() {
  const locale = await getLocale();
  return <SavedSkeleton label={getDictionary(locale).common.loading} />;
}
