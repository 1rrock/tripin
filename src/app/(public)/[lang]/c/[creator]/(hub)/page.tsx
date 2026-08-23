import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCreatorVideos } from "@/shared/api/videos";
import { loadCreatorMap } from "@/shared/api/creator-hub";
import { VideoList } from "../VideoList";
import { CreatorExplorer } from "../CreatorExplorer";
import {
  HUB_PLACE_HEAD,
  HUB_VIDEO_HEAD,
  toCreatorPlace,
  toHubVideo,
  type HubVideo,
} from "../hub-payload";
import { Avatar } from "@/shared/ui/frame"
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { Act, Icon } from "@/shared/ui/icons";
import { SubscribeButton } from "@/shared/ui/SaveButton";
import { ShareButton } from "@/shared/ui/ShareButton";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import type { Locale } from "@/shared/i18n/config";
import { displayCityName } from "@/shared/i18n/display";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, linkList } from "@/shared/seo/json-ld";

/**
 * 채널 허브 — 콘택트 시트의 "롤" 한 통.
 *
 * 지도가 본체: 이 유튜버가 간 모든 장소를 한 지도에 올리고,
 * 지역·종류 칩으로 걸러 본다(도시 교차 화면의 대칭).
 * 영상 목록은 그 아래 2차 축.
 *
 * ⚠️ 여기서 `searchParams` 를 읽지 마라 — `map/page.tsx:14` 와 같은 규율이다.
 *    읽는 순간 이 페이지가 ISR 에서 빠져 **매 진입이 람다 SSR** 이 된다
 *    (실측 TTFB 20~35ms vs ISR 2~3ms). `?type=`·`?city=` 는 이미 클라이언트인
 *    `CreatorExplorer` 가 하이드레이션 뒤에 읽어 그대로 건다.
 *
 * 존재 판정은 `(hub)/layout.tsx` 가 맡는다 — `loading.tsx` 의 Suspense 경계
 * **위** 라야 404 가 제대로 나간다(그 파일 주석).
 */

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale; creator: string }>;
}): Promise<Metadata> {
  const { lang: locale, creator: creatorSlug } = await params;
  const data = await loadCreatorMap(creatorSlug);
  /* 여기까지 오는 일은 없다 — 존재 판정은 `layout.tsx` 가 경계 위에서 끝낸다.
     라우트마다 제각각이던 not-found 제목은 `m.notFound.metaTitle` 하나로 모았다. */
  if (!data) return { title: getDictionary(locale).notFound.metaTitle };
  /* 제목·설명 모두 검색결과에서 잘린다(제목 ~60자, 설명은 한글 ~80자).
     비밀이야는 도시가 13곳이라 전부 나열하면 제목은 브랜드 접미사(`| Eatripin`)가,
     설명은 끝의 가치 문구("출처 영상 링크")가 통째로 밀려 나갔다. 둘 다 상한을 둔다. */
  const cityLabel = (n: number) =>
    data.cities.slice(0, n).map((g) => displayCityName(g, locale)).join(", ");
  const titleCities = cityLabel(3);
  const more = data.cities.length - 3;
  const descCities = cityLabel(6);
  const descMore = data.cities.length - 6;
  const bare = `/c/${creatorSlug}`;
  const title =
    locale === "en"
      ? `${data.creator.display_name} travel map — ${titleCities}${more > 0 ? ` +${more}` : ""}`
      : `${data.creator.display_name} 여행 지도 — ${titleCities}${more > 0 ? ` 외 ${more}곳` : ""}`;
  const description =
    locale === "en"
      ? `${data.creator.display_name} visited ${data.cities.length} cities — ${descCities}${descMore > 0 ? ` and ${descMore} more` : ""}. Places to eat and see, each linking back to its source video.`
      : /* 조사 폴백 「이(가)」 금지 — 스니펫에 그대로 나간다. `의`로 받침을 피한다 */
        `${data.creator.display_name}의 여행 도시 ${data.cities.length}곳 — ${descCities}${descMore > 0 ? ` 외 ${descMore}곳` : ""}. 맛집·명소마다 출처 영상 링크가 있습니다.`;
  return publicMeta({ locale, title, description, bare });
}

export default async function CreatorHubPage({
  params,
}: {
  params: Promise<{ lang: Locale; creator: string }>;
}) {
  const { lang: locale, creator: creatorSlug } = await params;
  const m = getDictionary(locale);
  const [data, videoData] = await Promise.all([
    loadCreatorMap(creatorSlug),
    loadCreatorVideos(creatorSlug),
  ]);
  /* 존재 판정은 layout 이 이미 끝냈다. 남긴 건 타입 좁히기용. */
  if (!data) notFound();

  const { creator, cities } = data;
  const videos = videoData?.videos ?? [];
  const channelUrl = creator.youtube_handle
    ? `https://www.youtube.com/${creator.youtube_handle}`
    : `https://www.youtube.com/channel/${creator.youtube_channel_id}`;

  /* 이 화면에는 무제한 목록이 **둘** 있었다 — 장소(후쿠오카 아저씨 647곳)와
     영상(정육왕 414편, 곽튜브 1,094편). 둘 다 클라이언트 컴포넌트 props 라 HTML
     마크업 한 벌 + RSC 플라이트 한 벌로 두 번 실렸고, 그게 1.07MB raw /
     108.9KB gzip 이었다. `/map` 이 씨앗 6곳으로 푼 처방을 그대로 옮긴다 —
     문서에는 앞줄만, 나머지는 마운트 뒤 `/api/creator/[creator]/…` 로 받는다.

     `videos.ts` 의 1000편 절단이 고쳐졌으니 영상 축은 앞으로 **더 자란다**.
     상한 없이 두면 이 문서는 채널이 부지런할수록 무거워진다. */
  const headPlaces = data.places.slice(0, HUB_PLACE_HEAD).map(toCreatorPlace);
  const headVideos: HubVideo[] = videos.slice(0, HUB_VIDEO_HEAD).map(toHubVideo);

  /* 필터 칩은 **전체** 기준으로 서버가 미리 센다. 앞줄에서 뽑으면 꼬리가 도착할 때
     칩 줄이 늘어나 필터가 튄다 — 무엇을 몇 개 그리느냐만 바꾸는 게 이 작업의
     규율이라, 필터의 모양은 자르기 전과 같아야 한다. */
  const presentTypes = FILTERABLE_TYPES.filter((pt) =>
    data.places.some((p) => p.placeType === pt),
  );
  const videoCities = [
    ...new Map(videos.flatMap((v) => v.cities).map((c) => [c.slug, c])).values(),
  ];
  const videoTypes = [...new Set(videos.flatMap((v) => v.types))];

  return (
    <main className="flex flex-col gap-(--stack)">
      <JsonLd
        data={[
          breadcrumbList([
            { name: m.common.home, url: absoluteUrl("/", locale) },
            { name: m.nav.map, url: absoluteUrl("/map", locale) },
            {
              name: creator.display_name,
              url: absoluteUrl(`/c/${creatorSlug}`, locale),
            },
          ]),
          linkList(
            creator.display_name,
            cities.map((c) => ({
              name: displayCityName(c, locale),
              url: absoluteUrl(`/c/${creatorSlug}/${c.slug}`, locale),
            })),
          ),
        ]}
      />
      {/* 데스크톱에서도 보인다. 예전엔 지도 패널 안에 별도 h1 이 있어서 여기를
          lg:hidden 으로 접었는데, 지도를 걷어내며 그 h1 도 같이 사라졌다. */}
      <header className="mx-auto flex w-full max-w-lg flex-col gap-2.5 px-(--gutter) pt-4 pb-0 lg:max-w-3xl">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
            {m.common.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <Link
            href={localePath("/map", locale)}
            className="underline-offset-4 hover:underline"
          >
            {m.nav.map}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{creator.display_name}</span>
        </nav>

        <div className="flex items-center gap-4">
          <Avatar
            initials={creator.initials}
            accent={creator.accent_color}
            src={creator.avatar_url}
            size={54}
          />
          <div className="min-w-0 flex-1">
            <h1
              className="font-black"
              style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
            >
              {creator.display_name}
            </h1>
            <p className="index tnum mt-1.5" style={{ color: "var(--dim)" }}>
              {/* 통계는 전체 수 그대로다 — 잘랐다고 페이지가 스스로를 작게 말하지 않는다 */}
              {t(m.hub.stats, {
                places: data.places.length,
                cities: cities.length,
                videos: videos.length,
              })}
            </p>
            {/* 구독은 이 서비스 안의 구독이다. 유튜브로 나가는 링크를 밀어내지 않는다 —
                "나가는 길이 본업"(PRODUCT.md 원칙 4) 이라 둘을 나란히 둔다. */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Act icon="out" href={channelUrl}>
                {m.hub.channelLink}
              </Act>
              <SubscribeButton creatorId={creator.id} creatorName={creator.display_name} />
              <ShareButton title={creator.display_name} />
            </div>
          </div>
        </div>
      </header>

      <CreatorExplorer
        creatorSlug={creatorSlug}
        places={headPlaces}
        total={data.places.length}
        presentTypes={presentTypes}
        cities={cities}
      />

      {videos.length > 0 ? (
        <section
          aria-labelledby="video-h"
          className="mx-auto flex w-full max-w-lg flex-col gap-(--stack) px-(--gutter) lg:max-w-3xl"
        >
          <h2 id="video-h" className="index" style={{ color: "var(--dim)" }}>
            {t(m.hub.videosHeading, { n: videos.length })}
          </h2>
          <VideoList
            videos={headVideos}
            total={videos.length}
            cityOptions={videoCities}
            typeOptions={videoTypes}
            creatorSlug={creatorSlug}
          />
        </section>
      ) : null}
    </main>
  );
}
