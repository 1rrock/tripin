import type { Metadata } from "next";
import { loadHomeFeed } from "@/shared/api/home";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
import { HomeSheet } from "./HomeSheet";

/**
 * 홈 = 영상 콘택트 시트 + 채널 진입 (멀티채널 전제).
 */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return {
    title: m.meta.homeTitle,
    description: m.meta.homeDescription,
    openGraph: {
      locale: locale === "en" ? "en_US" : "ko_KR",
      title: m.meta.homeTitle,
      description: m.meta.homeDescription,
    },
    alternates: {
      languages: {
        ko: "/",
        en: "/en",
      },
    },
  };
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

  return (
    <main>
      <HomeSheet videos={videos} creators={creators} totals={totals} />
    </main>
  );
}
