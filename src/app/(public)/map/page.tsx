import type { Metadata } from "next";
import { loadHomeFeed } from "@/shared/api/home";
import { loadCityIndex, loadHomeMap, toMapCanvasPlace } from "@/shared/api/cities";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale } from "@/shared/i18n/locale";
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

export default async function MapPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const [{ creators: feedCreators }, cities, rawPlaces] = await Promise.all([
    loadHomeFeed(),
    loadCityIndex(),
    loadHomeMap(locale),
  ]);
  const places = rawPlaces.map(toMapCanvasPlace);
  const creators = feedCreators.map((c) => ({
    ...c,
    bio: null,
    handle: null,
    videoCount: 0,
    recentVideos: [],
    cities: [],
  }));

  if (places.length === 0) {
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
      <h1 className="sr-only">{m.home.srHeading}</h1>
      <HomeCanvas places={places} cities={cities} creators={creators} />
    </main>
  );
}
