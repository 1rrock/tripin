import type { Metadata } from "next";
import { preconnect, preload } from "react-dom";
import { loadCityIndex, loadMapCanvasSeed, loadMapCreators } from "@/shared/api/cities";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { thumbSmall } from "@/shared/lib/youtube";
import { publicMeta } from "@/shared/seo/page-meta";
import { HomeCanvas } from "../../HomeCanvas";

/**
 * 전역 지도 — 홈에서 고른 종류·도시·검색이 여기 필터로 열린다.
 * 데스크톱은 맵 위 플로팅 시트, 모바일은 지도 + 목록.
 *
 * ⚠️ 여기서 `searchParams` 를 읽지 마라. 읽는 순간 이 페이지가 ISR 에서 빠져
 *    **매 진입이 람다 SSR**(기본 리전 iad1, 엣지 캐시 0%)이 된다 — "첫 진입이
 *    가끔 수 초" 의 첫째 원인이었다. 필터는 전부 HomeCanvas 가 클라이언트에서
 *    `useSearchParams()` 로 읽고, 씨앗 6곳도 클라이언트 필터를 그대로 통과하므로
 *    필터 유입이라고 씨앗을 비울 이유가 없다.
 */

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  return publicMeta({
    locale,
    title: m.meta.mapTitle,
    description: m.meta.mapDescription,
    bare: "/map",
  });
}

export default async function MapPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  const [creatorChips, cities, seedPlaces] = await Promise.all([
    loadMapCreators(),
    loadCityIndex(),
    loadMapCanvasSeed(),
  ]);
  /* 칩이 안 읽는 필드는 빈 값으로 — 700KB `loadHomeFeed` 캐시 항목을 여기 실을
     이유가 없다(cities.ts loadMapCreators 주석). */
  const creators = creatorChips.map((c) => ({
    ...c,
    bio: null,
    handle: null,
    videoCount: 0,
    recentVideos: [],
    cities: [],
  }));
  const mapCities = cities.map((c) => ({ ...c, recentVideos: [] }));
  const lcpYoutubeId = seedPlaces.find((p) => p.youtubeId)?.youtubeId ?? null;
  if (lcpYoutubeId) {
    preconnect("https://i.ytimg.com");
    preload(thumbSmall(lcpYoutubeId), { as: "image", fetchPriority: "high" });
  }
  return (
    <main>
      <h1 className="sr-only">{m.home.srHeading}</h1>
      <HomeCanvas places={seedPlaces} cities={mapCities} creators={creators} />
    </main>
  );
}
