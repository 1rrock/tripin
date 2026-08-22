import type { Metadata } from "next";
import { loadHomeFeed } from "@/shared/api/home";
import { loadCityIndex } from "@/shared/api/cities";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, linkList } from "@/shared/seo/json-ld";
import { HomeSheet } from "../../HomeSheet";

/** 홈 시트가 실제로 그리는 개수 — 로더는 전체를 주고 여기서 자른다 */
const HOME_VIDEOS = 8;
const HOME_PIECES = 8;
const HOME_CREATORS = 8;
const HOME_CELEB = 8;

export const revalidate = 3600;

/**
 * 홈 = 랜딩. 검색·종류·도시는 `/map` 으로 가서 필터를 고른다.
 * 채널 목록·최근 영상은 홈 미니 피드와 `/channels`.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  return publicMeta({
    locale,
    title: m.meta.homeTitle,
    description: m.meta.homeDescription,
    bare: "/",
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  const [{ videos, creators, pieces, celebritySpots }, cities] = await Promise.all([
    loadHomeFeed(),
    loadCityIndex(),
  ]);
  const homeVideos = videos.slice(0, HOME_VIDEOS);
  const homeCreators = creators.slice(0, HOME_CREATORS);
  const homePieces = pieces.slice(0, HOME_PIECES);
  const homeCeleb = celebritySpots.slice(0, HOME_CELEB);

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
          homeCreators.map((c) => ({
            name: c.displayName,
            url: absoluteUrl(`/c/${c.slug}`, locale),
          })),
        )}
      />
      <HomeSheet
        pieces={homePieces}
        cities={cities}
        videos={homeVideos}
        creators={homeCreators}
        celebritySpots={homeCeleb}
        locale={locale}
      />
    </main>
  );
}
