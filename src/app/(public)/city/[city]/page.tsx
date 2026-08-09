import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCityDetail } from "@/shared/api/cities";
import type { PlaceType } from "@/shared/api/database.types";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { Icon } from "@/shared/ui/frame";
import { CityExplorer } from "./CityExplorer";

/**
 * 도시 교차 페이지 (CONCEPT.md 4.5) — `도쿄 유튜버 맛집` 처럼 채널을 모르는 검색을 받는다.
 *
 * 조각(`/c/[creator]/[city]`)과 장소가 겹치지만 색인은 **둘 다 살린다**:
 * 조각은 "곽튜브 도쿄", 여기는 "도쿄"로 서로 다른 질의를 먹기 때문이다.
 * 겹쳐서 서로를 끌어내리는 건 같은 채널의 조각과 영상 페이지 관계였고
 * (그래서 영상 페이지만 noindex), 이 축은 그 경우가 아니다.
 */
export const revalidate = 3600;

interface Params {
  city: string;
}

function parseType(v: string | undefined): PlaceType | null {
  return v && (FILTERABLE_TYPES as string[]).includes(v) ? (v as PlaceType) : null;
}

function parseChannel(
  v: string | undefined,
  creators: { slug: string }[],
): string | null {
  if (!v) return null;
  return creators.some((c) => c.slug === v) ? v : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const data = await loadCityDetail((await params).city);
  if (!data) return { title: "찾을 수 없는 페이지" };
  const names = data.places
    .slice(0, 4)
    .map((p) => p.name)
    .join(", ");
  const who = data.creators.map((c) => c.displayName).join(", ");
  return {
    title: `${data.name} 여행 유튜버 맛집 지도 — ${data.places.length}곳`,
    description: `${who}이(가) ${data.name}에서 다녀간 ${data.places.length}곳: ${names}. 각 장소마다 출처 영상과 지도 링크가 있습니다.`,
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ type?: string; channel?: string }>;
}) {
  const [{ city }, sp] = await Promise.all([params, searchParams]);
  const data = await loadCityDetail(city);
  if (!data) notFound();

  return (
    <main>
      <header className="flex flex-col gap-3 px-(--gutter) pt-2 pb-1 lg:px-(--gutter)">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href="/" className="underline-offset-4 hover:underline">
            홈
          </Link>
          <Icon.chevron className="size-2.5" />
          <Link href="/city" className="underline-offset-4 hover:underline">
            지역
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{data.name}</span>
        </nav>

        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {data.name}에 간 유튜버들
        </h1>

        {/* 집계는 전부 우리 큐레이션 산출물이다 — 조회수·구독자수는 다루지 않는다(LEGAL.md 4.5-(2)) */}
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          채널 {data.creators.length} · 간 곳 {data.places.length}
        </p>
      </header>

      <CityExplorer
        cityName={data.name}
        citySlug={data.slug}
        places={data.places}
        creators={data.creators}
        initialType={parseType(sp.type)}
        initialChannel={parseChannel(sp.channel, data.creators)}
      />
    </main>
  );
}
