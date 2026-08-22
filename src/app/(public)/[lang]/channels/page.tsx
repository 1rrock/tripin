import type { Metadata } from "next";
import Link from "next/link";
import { loadHomeFeed } from "@/shared/api/home";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import { displayCityName } from "@/shared/i18n/display";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, linkList } from "@/shared/seo/json-ld";
import { Avatar, Rule } from "@/shared/ui/frame";
import { Icon } from "@/shared/ui/icons";
import { SubscribeButton } from "@/shared/ui/SaveButton";

/**
 * 채널 인덱스 — 구독 목록 문법.
 *
 * 큰 원형 프로필 + 이름 + `@핸들 · 지표` + 소개 줄. 유튜브 "모든 구독 채널"이
 * 그 문법이고, 이 화면이 답해야 하는 질문("누구를 따라갈까")과 정확히 같은
 * 질문을 푸는 화면이라 그대로 가져왔다.
 *
 * 컷 4장짜리 필름 롤을 걷어냈다 — 롤은 "이 채널이 뭘 찍나"를 보여주지만
 * 목록에서 필요한 건 채널을 **서로 구분**하는 일이고, 그건 프로필 사진과
 * 이름·소개가 더 빨리 한다. 컷이 깔리면 한 줄이 200px 을 먹어 한 화면에
 * 서너 채널밖에 안 들어왔다.
 *
 * 🔴 지도를 얹지 않는다. 답이 장소가 아니라 사람이라 핀을 뿌려 봐야 채널이
 *    구분되지 않는다. 지도는 `/map` 의 것이다.
 */

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  const { totals, creators } = await loadHomeFeed();
  /* description 에 화면용 통계 줄("채널 6 · 간 곳 272 · 도시 26")을 그대로 쓰면
     스니펫에 숫자만 나가서 이 페이지가 무엇인지도, 왜 누를지도 읽히지 않는다.
     사람들이 실제로 치는 말은 채널명이므로 이름을 앞에 세운다. */
  const names = creators
    .slice(0, 3)
    .map((c) => c.displayName)
    .join(", ");
  const description =
    locale === "en"
      ? `${totals.creators} travel YouTube channels — ${names} and more. ${totals.places} places across ${totals.cities} cities, each linking back to its source video.`
      : `여행 유튜버 ${totals.creators}개 채널 — ${names} 등이 다녀간 맛집·명소 ${totals.places}곳을 도시 ${totals.cities}곳 지도에 모았습니다.`;
  return publicMeta({
    locale,
    title: m.channels.srHeading,
    description,
    bare: "/channels",
  });
}

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  const { creators } = await loadHomeFeed();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col px-(--gutter) pt-5 lg:max-w-3xl">
      <JsonLd
        data={[
          breadcrumbList([
            { name: m.common.home, url: absoluteUrl("/", locale) },
            { name: m.channels.srHeading, url: absoluteUrl("/channels", locale) },
          ]),
          linkList(
            m.channels.srHeading,
            creators.map((c) => ({
              name: c.displayName,
              url: absoluteUrl(`/c/${c.slug}`, locale),
            })),
          ),
        ]}
      />
      {/* `title`("누구 따라갈까요?")은 훅이라 제목 자리에 쓰지 않는다.
          화면에는 짧은 이름만 세우고, 설명형 `srHeading` 은 문서에 남긴다. */}
      <header className="pb-2">
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {m.nav.channel}
        </h1>
        <p className="sr-only">{m.channels.srHeading}</p>
      </header>

      {creators.length === 0 ? (
        <p className="pt-2" style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
          {m.channels.empty}
        </p>
      ) : (
        <ul className="flex flex-col">
          {creators.map((c, i) => {
            /* 소개가 비면 다녀간 도시가 그 자리를 받는다 — 이 앱에서 채널을
               가르는 진짜 신호는 "어디를 다녔나"라 빈 줄로 두는 것보다 낫다 */
            const cityLine = c.cities.map((x) => displayCityName(x, locale)).join(" · ");
            const blurb = c.bio?.trim() || cityLine;

            return (
              <li key={c.slug}>
                {i > 0 ? <Rule /> : null}
                {/* 구독 버튼은 행 링크 **밖에** 선다. <a> 안에 <button> 을 넣으면
                    HTML 상 무효라 하이드레이션이 어긋난다 — 버튼 쪽에서
                    stopPropagation 을 불러도 못 막는 층위의 문제다. */}
                <div className="flex items-start gap-2">
                  <Link
                    href={localePath(`/c/${c.slug}`, locale)}
                    className="roll -mx-2.5 flex min-w-0 flex-1 items-start gap-4 rounded-(--r-control) px-2.5 py-5"
                    aria-label={t(m.channels.openChannel, {
                      name: c.displayName,
                      places: c.placeCount,
                    })}
                  >
                    <Avatar
                      initials={c.initials}
                      accent={c.accentColor}
                      src={c.avatarUrl}
                      size={64}
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold tracking-[-0.02em] lg:text-lg">
                        {c.displayName}
                      </span>

                      {/* 핸들과 지표는 한 줄 — 구독자 수 자리에 우리 단위(영상·곳)를 넣는다 */}
                      <span
                        className="mt-1 block truncate"
                        style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                      >
                        {[
                          c.handle,
                          t(m.channels.rollMeta, {
                            videos: c.videoCount,
                            places: c.placeCount,
                          }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>

                      {blurb ? (
                        <span
                          className="mt-1.5 line-clamp-2 block"
                          style={{
                            fontSize: "var(--t-meta)",
                            color: "var(--dim)",
                            lineHeight: 1.6,
                          }}
                        >
                          {blurb}
                        </span>
                      ) : null}
                    </span>
                  </Link>

                  <span className="shrink-0 self-center">
                    <SubscribeButton creatorId={c.id} creatorName={c.displayName} />
                  </span>
                </div>
              </li>
            );
          })}
          <Rule />
        </ul>
      )}

      {/* 크리에이터가 들어오는 문 — 채널 목록을 보는 사람 중에 채널 주인이 섞여 있다 */}
      <p className="mt-6">
        <Link
          href={localePath("/apply", locale)}
          className="index inline-flex items-center gap-0.5 underline-offset-4 hover:underline"
          style={{ color: "var(--dim)" }}
        >
          {m.channels.applyCta}
          <Icon.chevron className="size-2.5" />
        </Link>
      </p>
    </main>
  );
}
