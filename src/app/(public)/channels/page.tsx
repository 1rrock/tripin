import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { loadHomeFeed } from "@/shared/api/home";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { displayCityName } from "@/shared/i18n/display";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, linkList } from "@/shared/seo/json-ld";
import { Avatar, Frame, Index, Rule } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

/**
 * 채널 인덱스 — 필름 롤 (채널 하나가 롤 하나).
 *
 * 이름·숫자만으로는 채널이 구분되지 않는다 — 곽튜브와 성시경의 차이는
 * 컷 4장이 이름보다 빨리 말해 준다. 이 월드에서 롤 = 채널이라는 정의
 * (globals.css 방향 계약)를 목록 문법으로 그대로 옮긴 화면이다.
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const { totals, creators } = await loadHomeFeed();
  /* description 에 화면용 통계 줄(`m.channels.stats` = "채널 6 · 간 곳 272 · 도시 26")을
     그대로 쓰고 있었다. 스니펫에 숫자만 나가면 이 페이지가 무엇인지도, 왜 누를지도
     읽히지 않는다. 사람들이 실제로 치는 말은 채널명이므로 이름을 앞에 세운다. */
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

export default async function ChannelsPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const { creators } = await loadHomeFeed();

  return (
    <main className="flex flex-col px-(--gutter) pt-2 pb-20">
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
      {/* 화면에는 안 보이지만 문서에는 남는 제목. 시각적 헤더는 걷어냈어도
          스크린리더의 목차와 검색엔진의 주제 신호는 있어야 한다.
          `title` 은 훅("어디 가세요?")이라 여기 쓰지 않는다 — `srHeading` 은 설명형이다. */}
      <h1 className="sr-only">{m.channels.srHeading}</h1>

      {creators.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.channels.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {creators.map((c, i) => (
            <li key={c.slug} className="develop" style={{ "--i": i } as CSSProperties}>
              <Rule />
              <Link
                href={localePath(`/c/${c.slug}`, locale)}
                className="roll -mx-2.5 block rounded-(--r-control) px-2.5 py-(--stack)"
                aria-label={t(m.channels.openChannel, {
                  name: c.displayName,
                  places: c.placeCount,
                })}
              >
                {/* 이름+핸들 묶음을 타이트하게 두고 아바타와 세로 중앙.
                    핸들 간격이 넓으면 블록이 아래로 처져 프로필과 어긋난다.
                    영상/곳 수는 이름과 같은 줄. */}
                <span className="flex items-center gap-3.5">
                  <Avatar
                    initials={c.initials}
                    accent={c.accentColor}
                    src={c.avatarUrl}
                    size={42}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span
                        className="min-w-0 truncate font-bold"
                        style={{
                          fontSize: "var(--t-title)",
                          letterSpacing: "-0.025em",
                          lineHeight: 1.15,
                        }}
                      >
                        {c.displayName}
                      </span>
                      <Index className="tnum shrink-0">
                        {t(m.channels.rollMeta, {
                          videos: c.videoCount,
                          places: c.placeCount,
                        })}
                      </Index>
                    </span>
                    <span className="mt-0.5 block truncate leading-none">
                      <Index>
                        {[c.handle, ...c.cities.map((x) => displayCityName(x, locale))]
                          .filter(Boolean)
                          .join(" · ")}
                      </Index>
                    </span>
                  </span>
                </span>

                <span className="no-scrollbar -mx-(--gutter) mt-3 flex gap-2 overflow-x-auto px-(--gutter) sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
                  {/* 첫 채널의 첫 컷만 eager — 이 페이지의 LCP 후보 (city/page.tsx 와 같은 규칙) */}
                  {c.recentVideos.map((v, vi) => (
                    <Frame key={v.youtubeId} className="w-[46%] shrink-0 sm:w-auto">
                      <Thumb youtubeId={v.youtubeId} alt={v.title} eager={i === 0 && vi === 0} />
                    </Frame>
                  ))}
                </span>
              </Link>
            </li>
          ))}
          <Rule />
        </ul>
      )}
    </main>
  );
}
