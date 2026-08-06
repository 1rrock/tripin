import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadVideoDetail } from "@/shared/api/videos";
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
    <svg
      aria-hidden
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-1 inline text-line"
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}

export default async function VideoPage({ params }: { params: Promise<Params> }) {
  const { creator, videoId } = await params;
  const data = await loadVideoDetail(creator, videoId);
  if (!data) notFound();

  const { creator: ch, video } = data;

  return (
    <main
      className="mx-auto w-full max-w-3xl px-6 pt-8 pb-16 md:px-8"
      style={{ "--hl": ch.accentColor } as React.CSSProperties}
    >
      <nav className="flex flex-wrap items-center text-xs text-ink-soft">
        <Link href="/" className="font-medium transition hover:text-ink">
          홈
        </Link>
        <Crumb />
        <Link href={`/c/${ch.slug}`} className="font-medium transition hover:text-ink">
          {ch.displayName}
        </Link>
        <Crumb />
        <span className="text-ink">영상</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-2xl leading-snug font-black tracking-tight sm:text-3xl">
          {video.title}
        </h1>
        {/* 제목은 유튜브 원본 그대로여야 한다 — 우리가 요약·의역하면 약관 위반이다
            (YouTube API Developer Policies §III.E.3 "title must be unmodified") */}
        <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-soft">
          <span>{ch.displayName}</span>
          <span aria-hidden>·</span>
          <span className="tnum">
            나온 곳 <b className="font-bold text-ink">{video.stopCount}</b>곳
          </span>
          {video.cities.length ? (
            <>
              <span aria-hidden>·</span>
              <span>{video.cities.join(", ")}</span>
            </>
          ) : null}
        </p>
        <p className="mt-1 text-[12px] text-ink-soft">영상 제목은 유튜브 원본 표기 그대로입니다.</p>
      </header>

      <div className="mt-7">
        <Timeline video={video} creatorName={ch.displayName} />
      </div>

      <section className="mt-10 border-t border-line pt-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/c/${ch.slug}`}
            className="inline-flex items-center rounded-full bg-fill px-4 py-2.5 text-[13px] font-bold transition hover:bg-line active:scale-[0.97]"
          >
            {ch.displayName}의 다른 영상
          </Link>
          {video.cities.length === 1 && video.stops[0]?.citySlug ? (
            <Link
              href={`/c/${ch.slug}/${video.stops[0].citySlug}`}
              className="inline-flex items-center rounded-full bg-lemon px-4 py-2.5 text-[13px] font-extrabold text-on-lemon transition hover:bg-on-lemon hover:text-lemon active:scale-[0.97]"
            >
              {video.cities[0]} 지도로 보기
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
