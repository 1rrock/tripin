import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadVideoDetail } from "@/shared/api/videos";
import { Avatar, Chip, Frame } from "@/shared/ui/frame"
import { Act, Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { Thumb } from "@/shared/ui/Thumb";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { displayCityName } from "@/shared/i18n/display";
import { publicMeta } from "@/shared/seo/page-meta";
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

interface Params {
  creator: string;
  videoId: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { creator, videoId } = await params;
  const data = await loadVideoDetail(creator, videoId);
  if (!data)
    return {
      title: locale === "en" ? "Not found" : "찾을 수 없는 페이지",
      robots: { index: false, follow: false },
    };
  const names = data.video.stops
    .slice(0, 3)
    .map((s) => s.name)
    .join(", ");
  const bare = `/c/${creator}/v/${videoId}`;
  const title = `${data.creator.displayName} — ${data.video.title}`;
  const description =
    locale === "en"
      ? `${data.video.stopCount} places in this video: ${names}. Each place has a video timestamp and map link.`
      : `이 영상에 나온 곳 ${data.video.stopCount}곳: ${names}. 각 장소마다 영상 타임스탬프와 지도 링크가 있습니다.`;
  return publicMeta({
    locale,
    title,
    description,
    bare,
    robots: { index: false, follow: true },
  });
}

export default async function VideoPage({ params }: { params: Promise<Params> }) {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const { creator, videoId } = await params;
  const data = await loadVideoDetail(creator, videoId);
  if (!data) notFound();

  const { creator: ch, video } = data;

  return (
    <main
      className="flex flex-col gap-(--block) px-(--gutter) pt-4"
      style={{ "--hl": ch.accentColor } as React.CSSProperties}
    >
      <nav className="index flex flex-wrap items-center gap-1.5" style={{ color: "var(--dim)" }}>
        <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
          {m.common.home}
        </Link>
        <Icon.chevron className="size-2.5" />
        <Link
          href={localePath(`/c/${ch.slug}`, locale)}
          className="underline-offset-4 hover:underline"
        >
          {ch.displayName}
        </Link>
        <Icon.chevron className="size-2.5" />
        <span style={{ color: "var(--paper)" }}>{m.video.breadcrumbLabel}</span>
      </nav>

      {/**
       * 출처 머리 — 영상은 **머리글이지 본문이 아니다.**
       *
       * 예전에는 maxres(1280×720) 썸네일이 `3fr` 칸을 통째로 먹었다. 그런데 이 화면의
       * 본문인 장소는 영상 1편당 1곳뿐인 경우가 69%(755/1094)라, 첫 화면을 다 쓰고도
       * 정작 내용에 닿으려면 스크롤을 한 번 해야 했다.
       *
       * 그래서 썸네일을 mqdefault 카드로 내리고 폭을 단계별로 묶는다. 16:9 원본
       * 비율은 그대로라 크롭 금지(§III.E.3)에 걸리지 않는다.
       *
       * 데스크톱은 같은 배치를 키우기만 하지 않는다 — 폭이 남는 만큼 썸네일이 커지고
       * 제목이 display 급으로 올라가 머리 자체가 한 줄의 띠가 된다. 모바일에서는
       * 썸네일 136px 옆에 제목이 서는 조밀한 두 칸이다.
       */}
      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-3.5 sm:gap-5 lg:gap-7">
          <OutboundA
            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
            title={video.title}
            className="w-[136px] shrink-0 sm:w-[220px] lg:w-[320px]"
          >
            <Frame className="block w-full">
              <Thumb youtubeId={video.youtubeId} alt={video.title} eager />
            </Frame>
          </OutboundA>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:gap-2.5">
            <Link
              href={localePath(`/c/${ch.slug}`, locale)}
              className="flex min-w-0 items-center gap-2"
            >
              <Avatar
                initials={ch.initials}
                accent={ch.accentColor}
                src={ch.avatarUrl}
                size={22}
              />
              <span className="index truncate">{ch.displayName}</span>
              <Icon.chevron className="size-2.5 shrink-0" style={{ color: "var(--dim)" }} />
            </Link>
            {/* 제목은 유튜브 원본 그대로여야 한다 — 요약·의역은 §III.E.3 위반 */}
            <h1
              className="font-black"
              style={{
                fontSize: "var(--t-title)",
                letterSpacing: "-0.035em",
                lineHeight: 1.3,
              }}
            >
              <span className="lg:hidden">{video.title}</span>
              <span
                className="hidden lg:block"
                style={{ fontSize: "var(--t-display)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
              >
                {video.title}
              </span>
            </h1>
            {/* 도시가 하나면 이름을 앞에 세우고 "도시 1" 은 지운다 — 바로 옆에서
                같은 사실을 두 번 말하던 자리다. 여러 도시면 원래의 두 값을 쓴다. */}
            <p className="index tnum" style={{ color: "var(--dim)" }}>
              {video.cities.length === 1 && video.cities[0]
                ? `${displayCityName(video.cities[0], locale)} · ${t(m.video.statsStops, { n: video.stopCount })}`
                : t(m.video.stats, { stops: video.stopCount, cities: video.cities.length })}
            </p>
            {/* 유튜브로 바로 나갈 사람의 길 — 예전엔 정거장 행 안에만 있어서, 영상
                자체를 보러 온 사람이 목록을 지나야 했다 */}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Act icon="play" href={`https://www.youtube.com/watch?v=${video.youtubeId}`}>
                {m.common.watchOnYoutube}
              </Act>
            </div>
            <p
              className="hidden lg:block"
              style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.6 }}
            >
              {m.video.thumbnailNotice}
            </p>
          </div>
        </div>
        {/* 모바일은 머리 아래로 내린다 — 136px 칸 옆에서는 이 문장이 제목을 밀어낸다 */}
        <p
          className="lg:hidden"
          style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.6 }}
        >
          {m.video.thumbnailNotice}
        </p>
      </header>

      <Timeline video={video} creatorName={ch.displayName} />

      {/* 다음 행동 — 1페이지 이탈을 막는 조각 간 연결 */}
      <section className="flex flex-wrap gap-2">
        <Chip href={localePath(`/c/${ch.slug}`, locale)}>
          {t(m.video.otherVideos, { creator: ch.displayName })}
        </Chip>
        {video.cities.length === 1 && video.stops[0]?.citySlug ? (
          <Chip href={localePath(`/c/${ch.slug}/${video.stops[0].citySlug}`, locale)}>
            {t(m.video.viewCityMap, { city: displayCityName(video.cities[0], locale) })}
          </Chip>
        ) : null}
      </section>
    </main>
  );
}
