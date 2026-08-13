import type { Metadata } from "next";
import { loadHomeFeed } from "@/shared/api/home";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, linkList } from "@/shared/seo/json-ld";
import { HomeSheet } from "./HomeSheet";

/**
 * 홈 = 영상 콘택트 시트 + 채널 진입 (멀티채널 전제).
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
  const { videos, creators, totals } = await loadHomeFeed();

  if (videos.length === 0) {
    return (
      <main className="px-(--gutter) pt-6 pb-20">
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

  // 검색 건초더미는 로케일에 맞는 한쪽만 남긴다 — 둘 다 넘기면 RSC 직렬화로
  // EN HTML 에 한국어 원문이 통째로 샌다(§3-2). 여기가 그 층이다.
  const sheetVideos = videos.map(({ searchKo, searchEn, ...v }) => ({
    ...v,
    search: locale === "en" ? searchEn : searchKo,
  }));

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
      <HomeSheet videos={sheetVideos} creators={creators} totals={totals} />
    </main>
  );
}
