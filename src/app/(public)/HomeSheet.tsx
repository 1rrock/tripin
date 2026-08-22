/**
 * 홈 랜딩 — 히어로는 시안 4 「지면 위의 카드」.
 *
 * 서버 컴포넌트. 검색 알약만 클라이언트다. 예전에 통째로 "use client" 라
 * 제목·지면 사진이 JS 뒤에 왔고, Lighthouse LCP 가 그 사진을 17초 기다렸다.
 */

import Link from "next/link";
import type { FeedCelebritySpot, FeedCreator, FeedPiece, FeedVideo } from "@/shared/api/home";
import type { CityRow } from "@/shared/api/cities";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import { displayCityName } from "@/shared/i18n/display";
import { CategoryGrid } from "@/shared/ui/CategoryGrid";
import { DestinationGrid, DestinationRail } from "@/shared/ui/DestinationRail";
import { CelebrityFeed, ChannelFeed, PieceFeed, VideoFeed } from "./HomeFeeds";
import { HomeSearchButton } from "./HomeSearchButton";

const RAIL = 8;
const GRID = 12;

export async function HomeSheet({
  pieces,
  cities,
  videos,
  creators,
  celebritySpots,
  locale,
}: {
  pieces: FeedPiece[];
  cities: CityRow[];
  videos: FeedVideo[];
  creators: FeedCreator[];
  celebritySpots: FeedCelebritySpot[];
  locale: Locale;
}) {
  const m = getDictionary(locale);
  const rail = cities.slice(0, RAIL);
  const grid = cities.slice(0, GRID);

  return (
    <div>
      <FieldHero cities={cities} locale={locale} />

      <div className="mx-auto w-full max-w-lg lg:max-w-5xl">
        <div className="lg:hidden">
          <CategoryGrid />
          <hr className="rule mx-(--gutter)" />
          <DestinationRail cities={rail} locale={locale} messages={m} />
        </div>

        <div className="hidden lg:block">
          <DestinationGrid cities={grid} locale={locale} messages={m} />
        </div>

        <CelebrityFeed spots={celebritySpots} locale={locale} messages={m} />
        <VideoFeed videos={videos} locale={locale} messages={m} />
        <ChannelFeed creators={creators} locale={locale} messages={m} />
        <PieceFeed pieces={pieces} locale={locale} messages={m} />
      </div>
    </div>
  );
}

/**
 * 시안 4 — 지면 위의 카드.
 * 지도 타일은 정적 이미지(회색·반투명). 라이브 지도를 홈에 또 올리지 않는다.
 *
 * 모바일에서 `<img>` 지면은 쓰지 않는다. 412×345 로 뷰포트를 채워 LCP 가 되고,
 * fetchpriority=high 인데도 클라이언트 트리 뒤에 있어 로드 지연이 수 초였다.
 * 대신 `.hero-field` 의 CSS 배경으로 깐다 — 모바일은 440px 흑백 13KB 판.
 */
async function FieldHero({ cities, locale }: { cities: CityRow[]; locale: Locale }) {
  const m = getDictionary(locale);
  const chips = cities.slice(0, 4);

  return (
    <section className="relative overflow-hidden px-(--gutter) pt-7 pb-[68px] lg:min-h-[420px] lg:px-14 lg:pt-[60px] lg:pb-14">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="hero-field absolute inset-0" />
        <span
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.9) 12%, rgba(255,255,255,0.74) 44%, rgba(255,255,255,0.48) 76%, rgba(255,255,255,0.78) 93%, #fff 100%)",
          }}
        />
        <span
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              "linear-gradient(100deg, #fff 34%, rgba(255,255,255,0.6) 62%, rgba(255,255,255,0.25))",
          }}
        />
        <Pin className="absolute right-[15%] bottom-[16%] size-[22px] text-(--wax) lg:right-[16%] lg:top-[24%] lg:bottom-auto lg:size-[30px]" />
        <Pin className="absolute bottom-[8%] left-[22%] size-[16px] text-(--wax) lg:top-[56%] lg:right-[29%] lg:bottom-auto lg:left-auto lg:size-[22px]" />
        <Pin className="absolute top-[64%] right-[9%] hidden size-[18px] text-(--wax) lg:block" />
      </div>

      <div className="relative max-w-[40rem]">
        <h1 className="text-[32px] leading-[1.08] font-black tracking-[-0.048em] lg:text-[52px]">
          <Hot text={m.home.title} hot={m.home.titleHot} />
        </h1>
        {m.home.blurb ? (
          <p className="mt-3 max-w-[34rem] text-[15px] leading-relaxed text-(--dim) lg:text-base">
            {m.home.blurb}
          </p>
        ) : null}

        <HomeSearchButton mobile={m.home.fieldSearchMob} desktop={m.home.fieldSearch} />

        {chips.length > 0 ? (
          <nav
            aria-label={m.home.citiesAria}
            className="no-scrollbar mt-3.5 -mr-(--gutter) flex gap-1.5 overflow-x-auto pr-(--gutter) pb-0.5 lg:mt-[18px] lg:mr-0 lg:flex-wrap lg:pr-0"
          >
            {chips.map((city, i) => {
              const name = displayCityName(city, locale);
              const on = i === 0;
              return (
                <Link
                  key={city.slug}
                  href={localePath(`/map?city=${city.slug}`, locale)}
                  prefetch={false}
                  className="inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[13px] font-medium"
                  style={
                    on
                      ? { background: "var(--paper)", color: "#fff" }
                      : {
                          background: "var(--ground)",
                          color: "#383838",
                          boxShadow: "inset 0 0 0 1px var(--hairline)",
                        }
                  }
                >
                  {name} {city.placeCount}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

function Pin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

function Hot({ text, hot }: { text: string; hot: string }) {
  if (!hot || !text.includes(hot)) return text;
  const i = text.indexOf(hot);
  const before = text.slice(0, i).trimEnd();
  const after = text.slice(i + hot.length);
  return (
    <>
      {before ? (
        <>
          {before}
          <br />
        </>
      ) : null}
      <span style={{ color: "var(--wax)" }}>{hot}</span>
      {after}
    </>
  );
}
