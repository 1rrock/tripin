import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
import { LoginSkeleton } from "@/shared/ui/Skeleton";

export default async function Loading() {
  const locale = await getLocale();
  return <LoginSkeleton label={getDictionary(locale).common.loading} />;
}
