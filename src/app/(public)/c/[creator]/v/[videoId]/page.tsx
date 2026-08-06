import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadVideoDetail } from "@/shared/api/videos";
import { Chip, Frame, Icon } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { Timeline } from "./Timeline";

/**
 * 영상 타임라인 페이지 — 채널 → 영상 → 시간별 위치의 종착점.
 *
 * 이 화면에서는 **영상 제목이 헤드라인**이다. 목록에서는 방문자의 질문이
 * "그 가게 어디야"라 상호명이 제목 자리를 가져가지만, 여기는 그 영상 자신의
 * 페이지이므로 제목이 주인공인 게 맞다. 어느 쪽이든 유튜브 원본 그대로 쓴다.
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
  const names = data.video.stops
    .slice(0, 3)
    .map((s) => s.name)
    .join(", ");
  return {
    title: `${data.creator.displayName} — ${data.video.title}`,
    description: `이 영상에 나온 곳 ${data.video.stopCount}곳: ${names}. 각 장소마다 영상 타임스탬프와 지도 링크가 있습니다.`,
    robots: { index: false, follow: true },
  };
}

export default async function VideoPage({ params }: { params: Promise<Params> }) {
  const { creator, videoId } = await params;
  const data = await loadVideoDetail(creator, videoId);
  if (!data) notFound();

  const { creator: ch, video } = data;

  return (
    <main
      className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20"
      style={{ "--hl": ch.accentColor } as React.CSSProperties}
    >
      <nav className="index flex flex-wrap items-center gap-1.5" style={{ color: "var(--dim)" }}>
        <Link href="/" className="underline-offset-4 hover:underline">
          홈
        </Link>
        <Icon.chevron className="size-2.5" />
        <Link href={`/c/${ch.slug}`} className="underline-offset-4 hover:underline">
          {ch.displayName}
        </Link>
        <Icon.chevron className="size-2.5" />
        <span style={{ color: "var(--paper)" }}>영상</span>
      </nav>

      <header className="grid gap-4 md:grid-cols-[3fr_2fr] md:items-center md:gap-7">
        <Frame>
          <Thumb youtubeId={video.youtubeId} alt={video.title} eager />
        </Frame>

        <div className="flex flex-col gap-2">
          <p className="index" style={{ color: "var(--dim)" }}>
            {ch.displayName}
            {video.cities[0] ? ` · ${video.cities[0]}` : ""}
          </p>
          {/* 제목은 유튜브 원본 그대로여야 한다 — 요약·의역은 §III.E.3 위반 */}
          <h1
            className="font-black"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.2 }}
          >
            {video.title}
          </h1>
          <p className="index tnum" style={{ color: "var(--dim)" }}>
            나온 곳 {video.stopCount} · 도시 {video.cities.length}
          </p>
          <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.6 }}>
            썸네일과 제목은 YouTube 원본 표기 그대로입니다.
          </p>
        </div>
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
