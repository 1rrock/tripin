import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
import { AccountSkeleton } from "@/shared/ui/Skeleton";

export default async function Loading() {
  const locale = await getLocale();
  return <AccountSkeleton label={getDictionary(locale).common.loading} />;
}
