import type { Metadata } from "next";
import Link from "next/link";
import { loadCityIndex } from "@/shared/api/cities";
import { Icon } from "@/shared/ui/frame";
import { WorldMap } from "./WorldMap";

/**
 * 전체 지도 — "어디에 뭐가 있는지부터" 보고 싶은 사람용 진입점.
 *
 * 홈에는 지도를 깔지 않는다(PRODUCT.md P1: 빈 지도는 아무것도 없는 서비스로 읽힌다).
 * 그 원칙은 첫인상에 대한 것이고, 지도를 보러 눌러 들어온 화면은 다르다.
 * 다만 여기서도 전 세계를 한 번에 담지는 않는다 — WorldMap 주석 참조.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "지도에서 찾기 — 여행 유튜버 맛집",
  description:
    "지도에서 도시를 골라 그 도시에 다녀간 여행 유튜버들의 맛집·명소를 봅니다. 모든 장소에 출처 영상 링크가 있습니다.",
};

export default async function MapPage() {
  const cities = await loadCityIndex();
  const totalPlaces = cities.reduce((sum, c) => sum + c.placeCount, 0);

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <header className="flex flex-col gap-3">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href="/" className="underline-offset-4 hover:underline">
            홈
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>지도</span>
        </nav>
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-display)", letterSpacing: "-0.045em", lineHeight: 1.12 }}
        >
          지도에서 찾기
        </h1>
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          도시 {cities.length} · 간 곳 {totalPlaces}
        </p>
      </header>

      {cities.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
          아직 지도에 올릴 도시가 없어요.
        </p>
      ) : (
        <WorldMap cities={cities} />
      )}
    </main>
  );
}
