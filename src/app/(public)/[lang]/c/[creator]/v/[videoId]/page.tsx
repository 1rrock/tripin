import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadVideoDetail } from "@/shared/api/videos";
import { loadCelebritiesFor } from "@/shared/api/celebs";
import { celebAnchor } from "@/shared/lib/celeb-anchor";
import { Avatar, Chip, Frame } from "@/shared/ui/frame"
import { Act, Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { ShareButton } from "@/shared/ui/ShareButton";
import { Thumb } from "@/shared/ui/Thumb";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import type { Locale } from "@/shared/i18n/config";
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
 * 색인 정책: **조각 페이지로 canonical**. 이 페이지의 장소는 조각 페이지
 * (`/c/[creator]/[city]`) 장소의 부분집합이라 같은 요약문이 두 URL 에 뜬다 —
 * 영상 페이지가 같은 상호명으로 경쟁하면 둘 다 내려간다. 예전에는 noindex 로
 * 눌렀는데, 그러면 "곽튜브 후쿠오카 맛집" 류 영상 단위 롱테일에 이 페이지로
 * 들어오는 링크 신호까지 통째로 버린다. canonical 은 신호를 조각에 몰아주면서
 * 잠식은 그대로 막는다(AUDIT-2026-08-18 2-3의 전환 실험).
 * 도시가 여럿이거나 없는 영상은 몰아줄 조각이 하나가 아니므로 noindex 를 유지한다.
 */

interface Params {
  creator: string;
  videoId: string;
}

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params & { lang: Locale }>;
}): Promise<Metadata> {
  const { lang: locale, creator, videoId } = await params;
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
  const soleCity = data.video.cities.length === 1 ? data.video.cities[0] : null;
  return publicMeta({
    locale,
    title,
    description,
    bare,
    ...(soleCity
      ? { canonicalBare: `/c/${creator}/${soleCity.slug}` }
      : { robots: { index: false, follow: true } }),
  });
}

export default async function VideoPage({
  params,
}: {
  params: Promise<Params & { lang: Locale }>;
}) {
  const { lang: locale, creator, videoId } = await params;
  const m = getDictionary(locale);
  const data = await loadVideoDetail(creator, videoId);
  if (!data) notFound();

  const { creator: ch, video } = data;
  // 이 영상의 정거장을 다녀간 연예인 — 아래 "다음 행동" 칩 줄에 선다.
  // 채널 본인이 연예인이거나(성시경 영상), 정거장에 승인된 언급이 붙은 경우.
  const celebrities = await loadCelebritiesFor(
    [...new Set(video.stops.map((s) => s.placeId))],
    [ch.slug],
  );

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
            {/* 제목은 유튜브 원본 그대로여야 한다 — 요약·의역은 §III.E.3 위반.
                크기는 클래스로 가른다. `lg:hidden` / `hidden lg:block` 두 span 에
                같은 제목을 넣으면 **문서에 제목이 두 번 실린다** — 평균 41자짜리
                문자열이 매 영상 페이지마다 두 벌씩 나가고, 보조기기·복사 붙여넣기
                에서도 어색하다. */}
            <h1 className="font-black text-[length:var(--t-title)] leading-[1.3] tracking-[-0.035em] lg:text-[length:var(--t-display)] lg:leading-[1.15] lg:tracking-[-0.04em]">
              {video.title}
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
              <ShareButton title={video.title} />
            </div>
          </div>
        </div>
        {/* 머리 아래 한 줄. 136px 칸 옆에 두면 모바일에서 제목을 밀어내고,
            두 벌로 나눠 두면 문서에 같은 문장이 두 번 실린다. */}
        <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.6 }}>
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
        {celebrities.map((c) => (
          <Chip key={c.name} href={localePath(`/celebs#${celebAnchor(c.name)}`, locale)}>
            {t(m.placeDetail.celebMore, {
              person: locale === "ko" ? c.name : (c.nameEn ?? c.name),
            })}
          </Chip>
        ))}
      </section>
    </main>
  );
}
