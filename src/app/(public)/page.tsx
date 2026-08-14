import type { Metadata } from "next";
import { loadHomeFeed } from "@/shared/api/home";
import { loadCityIndex, loadHomeMap } from "@/shared/api/cities";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, linkList } from "@/shared/seo/json-ld";
import { HomeSheet } from "./HomeSheet";

/**
 * 홈 = 문장 → 검색 → 도시 시트 → 조각 시트.
 * 채널 목록·최근 영상·유형은 홈에 없다. `/channels` · 조각 안 · `/type`.
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return publicMeta({
    locale,
    title: m.meta.homeTitle,
    description: m.meta.homeDescription,
    bare: "/",
  });
}

export default async function HomePage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const [{ videos, creators, pieces }, cities, places] = await Promise.all([
    loadHomeFeed(),
    loadCityIndex(),
    loadHomeMap(locale),
  ]);

  if (videos.length === 0) {
    return (
      <main className="px-(--gutter) pt-4">
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-display)", letterSpacing: "-0.045em", lineHeight: 1.12 }}
        >
          {m.home.comingTitle}
        </h1>
        <p className="mt-4 max-w-[46ch]" style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
          {m.home.comingBody}
        </p>
      </main>
    );
  }

  return (
    <main>
      <JsonLd
        data={linkList(
          m.home.srHeading,
          creators.map((c) => ({
            name: c.displayName,
            url: absoluteUrl(`/c/${c.slug}`, locale),
          })),
        )}
      />
      <HomeSheet
        pieces={pieces}
        cities={cities}
        videos={videos}
        creators={creators}
        places={places}
      />
    </main>
  );
}
