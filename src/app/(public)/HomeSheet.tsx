/**
 * 홈 랜딩 — 히어로는 시안 4 「지면 위의 카드」.
 *
 * 서버 컴포넌트. 검색 알약만 클라이언트다. 예전에 통째로 "use client" 라
 * 제목·지면 사진이 JS 뒤에 왔고, Lighthouse LCP 가 그 사진을 17초 기다렸다.
 */

import type { FeedCelebritySpot, FeedCreator, FeedPiece, FeedVideo } from "@/shared/api/home";
import type { CityRow } from "@/shared/api/cities";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import { displayCityName } from "@/shared/i18n/display";
import { Chip } from "@/shared/ui/frame";
import { CategoryGrid } from "@/shared/ui/CategoryGrid";
import { loadTypeIndex } from "@/shared/api/place-types";
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

  /* 종류별 장소 수 — `CategoryGrid` 가 0건인 종류의 타일을 안 깔게 하려고 넘긴다.
     예전엔 개수를 안 봐서 `viewpoint`(DB 0행) 타일이 늘 서 있었고, 누르면 결과가
     0건이었다(`/map` 필터는 이미 `n === 0` 을 걸러내던 터라 두 화면 규칙이 갈렸다).
     `loadTypeIndex` 는 `cachePublic` 이라 새 쿼리가 아니고, `searchParams` 도
     안 읽으므로 이 페이지의 ISR 은 그대로다. */
  const typeCounts = Object.fromEntries(
    (await loadTypeIndex()).map((t) => [t.type, t.placeCount]),
  );

  return (
    <div>
      <FieldHero cities={cities} locale={locale} />

      <div className="mx-auto w-full max-w-lg lg:max-w-5xl">
        <div className="lg:hidden">
          <CategoryGrid counts={typeCounts} />
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
            {/* 네 칩은 전부 같은 꼴이다. 예전엔 첫 칩만 채워 그렸는데(i === 0),
                아무 필터도 안 걸린 홈에서 "선택됨"으로 읽히고 눌러도 나머지와
                똑같이 동작했다 — 활성 표시는 실제 상태가 있을 때만 쓴다.
                규격은 손으로 적지 않는다(globals.css `.chip`) — 여기 있던
                px-3/py-1.5/13px 사본은 계산 높이가 28px 로 같았을 뿐 한 벌이
                더 있던 것이다. ⚠️ `prefetch={false}` 는 Chip 에 그 prop 이
                없어 함께 사라졌다 — /map 프리페치가 다시 켜진다. */}
            {chips.map((city) => (
              <Chip key={city.slug} href={localePath(`/map?city=${city.slug}`, locale)}>
                {displayCityName(city, locale)} {city.placeCount}
              </Chip>
            ))}
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
