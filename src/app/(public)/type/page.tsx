import type { Metadata } from "next";
import { loadTypeIndex } from "@/shared/api/place-types";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, linkList } from "@/shared/seo/json-ld";
import { TypeIndex } from "./TypeIndex";

/**
 * 종류 인덱스 — 홈 그리드와 같은 타일 + 결과 행.
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return publicMeta({
    locale,
    title: m.typeIndex.srHeading,
    description: m.typeIndex.blurb,
    bare: "/type",
  });
}

export default async function TypeIndexPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const types = await loadTypeIndex();

  return (
    <main className="mx-auto w-full max-w-lg">
      <JsonLd
        data={[
          breadcrumbList([
            { name: m.common.home, url: absoluteUrl("/", locale) },
            { name: m.typeIndex.srHeading, url: absoluteUrl("/type", locale) },
          ]),
          linkList(
            m.typeIndex.srHeading,
            types.map((row) => ({
              name: m.placeTypes[row.type],
              url: absoluteUrl(`/type/${row.type}`, locale),
            })),
          ),
        ]}
      />
      <TypeIndex types={types} />
    </main>
  );
}
