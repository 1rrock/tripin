import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadVideoDetail } from "@/shared/api/videos";
import { Box, Card, Chip, DataRow, Icon } from "@/shared/ui/sign";
import { Timeline } from "./Timeline";

/**
 * 영상 타임라인 페이지 — 채널 → 영상 → 시간별 위치의 종착점.
 *
 * 색인 정책: `noindex`. 이 페이지의 장소는 조각 페이지(`/c/[creator]/[city]`)
 * 장소의 부분집합이라 같은 요약문이 두 URL 에 뜬다. 조각 페이지가 이미
 * 롱테일 상호명을 흡수하도록 설계돼 있어(PRODUCT.md) 영상 페이지가 같은
 * 상호명으로 경쟁하면 둘 다 내려간다. 사람은 볼 수 있고 검색엔진은 조각을 본다.
 */
export const revalidate = 3600;

interface Params {
  creator: string;
  videoId: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { creator, videoId } = await params;
  const data = await loadVideoDetail(creator, videoId);
  if (!data) return { title: "찾을 수 없는 페이지", robots: { index: false, follow: false } };
  const names = data.video.stops.slice(0, 3).map((s) => s.name).join(", ");
  return {
    title: `${data.creator.displayName} — ${data.video.title}`,
    description: `이 영상에 나온 곳 ${data.video.stopCount}곳: ${names}. 각 장소마다 영상 타임스탬프와 지도 링크가 있습니다.`,
    robots: { index: false, follow: true },
  };
}

function Crumb() {
  return (
    <Icon.chevron
      aria-hidden
      className="mx-1 inline"
      style={{ width: 9, height: 9, fill: "var(--hairline)" }}
    />
  );
}

export default async function VideoPage({ params }: { params: Promise<Params> }) {
  const { creator, videoId } = await params;
  const data = await loadVideoDetail(creator, videoId);
  if (!data) notFound();

  const { creator: ch, video } = data;

  return (
    <main
      className="flex flex-col gap-(--stack) px-(--gutter) pt-6 pb-16"
      style={{ "--hl": ch.accentColor } as React.CSSProperties}
    >
      <nav className="flex flex-wrap items-center" style={{ fontSize: "var(--t-meta)" }}>
        <Link href="/" className="underline-offset-4 hover:underline">
          홈
        </Link>
        <Crumb />
        <Link href={`/c/${ch.slug}`} className="underline-offset-4 hover:underline">
          {ch.displayName}
        </Link>
        <Crumb />
        <span className="font-medium">영상</span>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Box icon="play" size="card" />
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: "var(--t-body)" }}>{ch.displayName}</p>
            {/* 제목은 유튜브 원본 그대로여야 한다 — 우리가 요약·의역하면 약관 위반이다
                (YouTube API Developer Policies §III.E.3 "title must be unmodified") */}
            <h1
              className="font-bold"
              style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em", lineHeight: 1.28 }}
            >
              {video.title}
            </h1>
          </div>
        </div>

        <Card>
          <DataRow
            items={[
              { label: "나온 곳", value: String(video.stopCount) },
              { label: "도시", value: String(video.cities.length) },
            ]}
          />
        </Card>

        <p style={{ fontSize: "var(--t-meta)", opacity: 0.8 }}>
          영상 제목은 유튜브 원본 표기 그대로입니다.
        </p>
      </header>

      <Timeline video={video} creatorName={ch.displayName} />

      {/* 다음 행동 — 1페이지 이탈을 막는 조각 간 연결 */}
      <section className="flex flex-wrap gap-2">
        <Chip href={`/c/${ch.slug}`}>{ch.displayName}의 다른 영상</Chip>
        {video.cities.length === 1 && video.stops[0]?.citySlug ? (
          <Chip href={`/c/${ch.slug}/${video.stops[0].citySlug}`}>
            {video.cities[0]} 지도로 보기
          </Chip>
        ) : null}
      </section>
    </main>
  );
}
