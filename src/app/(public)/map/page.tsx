import type { Metadata } from "next";
import { preconnect, preload } from "react-dom";
import { loadHomeFeed } from "@/shared/api/home";
import { loadCityIndex, loadMapCanvasSeed } from "@/shared/api/cities";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
import { thumbSmall } from "@/shared/lib/youtube";
import { publicMeta } from "@/shared/seo/page-meta";
import { HomeCanvas } from "../HomeCanvas";

/**
 * 전역 지도 — 홈에서 고른 종류·도시·검색이 여기 필터로 열린다.
 * 데스크톱은 맵 위 플로팅 시트, 모바일은 지도 + 목록.
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return publicMeta({
    locale,
    title: m.meta.mapTitle,
    description: m.meta.mapDescription,
    bare: "/map",
  });
}

function firstQuery(v: string | string[] | undefined): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return null;
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const sp = await searchParams;
  const inboundFilter = Boolean(
    firstQuery(sp.city) ||
      firstQuery(sp.region) ||
      firstQuery(sp.channel) ||
      firstQuery(sp.type) ||
      firstQuery(sp.q) ||
      firstQuery(sp.saved) ||
      firstQuery(sp.list),
  );
  const [{ creators: feedCreators }, cities, seedPlaces] = await Promise.all([
    loadHomeFeed(),
    loadCityIndex(),
    inboundFilter ? Promise.resolve([]) : loadMapCanvasSeed(locale),
  ]);
  const creators = feedCreators.map((c) => ({
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
