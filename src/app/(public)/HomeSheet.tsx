"use client";

/**
 * 홈 랜딩 — 히어로는 시안 4 「지면 위의 카드」.
 *
 * 흐린 지도가 바닥이고, 그 위에 문장·검색·도시 칩이 뜬다.
 * 검색 알약은 바로 지도로 보내지 않는다 — 통합 검색을 연다.
 * 컷 위에 글자를 얹지 않는다.
 */

import Link from "next/link";
import { MagnifyingGlassIcon as MagnifyingGlass, MapPinIcon as MapPin } from "@phosphor-icons/react";
import type { FeedCreator, FeedPiece, FeedVideo } from "@/shared/api/home";
import type { CityRow } from "@/shared/api/cities";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName } from "@/shared/i18n/display";
import { CategoryGrid } from "@/shared/ui/CategoryGrid";
import { DestinationGrid, DestinationRail } from "@/shared/ui/DestinationRail";
import { ChannelFeed, PieceFeed, VideoFeed } from "./HomeFeeds";

const RAIL = 8;
const GRID = 12;

function openSearch() {
  window.dispatchEvent(new Event("tripin:open-search"));
}

export function HomeSheet({
  pieces,
  cities,
  videos,
  creators,
}: {
  pieces: FeedPiece[];
  cities: CityRow[];
  videos: FeedVideo[];
  creators: FeedCreator[];
}) {
  const rail = cities.slice(0, RAIL);
  const grid = cities.slice(0, GRID);

  return (
    <div>
      <FieldHero cities={cities} />

      <div className="mx-auto w-full max-w-lg lg:max-w-5xl">
        <div className="lg:hidden">
          <CategoryGrid />
          <hr className="rule mx-(--gutter)" />
          <DestinationRail cities={rail} />
        </div>

        <div className="hidden lg:block">
          <DestinationGrid cities={grid} />
        </div>

        <VideoFeed videos={videos} />
        <ChannelFeed creators={creators} />
        <PieceFeed pieces={pieces} />
      </div>
    </div>
  );
}

/**
 * 시안 4 — 지면 위의 카드.
 * 지도 타일은 정적 이미지(회색·반투명). 라이브 지도를 홈에 또 올리지 않는다.
 */
function FieldHero({ cities }: { cities: CityRow[] }) {
  const { messages: m, href, locale } = useLocale();
  const chips = cities.slice(0, 4);

  return (
    <section className="relative overflow-hidden px-(--gutter) pt-7 pb-[68px] lg:min-h-[420px] lg:px-14 lg:pt-[60px] lg:pb-14">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* 장식 지면. 본문 LCP 가 아니라 next/image 를 쓰지 않는다. */}
        <img
          src="/hero/field-map.webp"
          alt=""
          width={1280}
          height={1280}
          fetchPriority="high"
          className="size-full object-cover opacity-45 grayscale contrast-[0.85] lg:opacity-50"
        />
        {/* 모바일 — 문구 뒤에도 지면이 아주 옅게 비친다. 아래로 갈수록 걷히다
            맨 밑은 흰색으로 끝나야 바로 밑 카테고리 칸과 이어진다. */}
        <span
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.88) 13%, rgba(255,255,255,0.8) 46%, rgba(255,255,255,0.62) 74%, rgba(255,255,255,0.85) 93%, #fff 100%)",
          }}
        />
        <span
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              "linear-gradient(100deg, #fff 34%, rgba(255,255,255,0.6) 62%, rgba(255,255,255,0.25))",
          }}
        />
        <MapPin
          weight="fill"
          className="absolute right-[15%] bottom-[16%] size-[22px] text-(--wax) lg:right-[16%] lg:top-[24%] lg:bottom-auto lg:size-[30px]"
        />
        <MapPin
          weight="fill"
          className="absolute bottom-[8%] left-[22%] size-[16px] text-(--wax) lg:top-[56%] lg:right-[29%] lg:bottom-auto lg:left-auto lg:size-[22px]"
        />
        <MapPin
          weight="fill"
          className="absolute top-[64%] right-[9%] hidden size-[18px] text-(--wax) lg:block"
        />
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

        <button
          type="button"
          id="home-hero-search"
          onClick={openSearch}
          aria-label={m.home.searchAria}
          className="mt-5 flex h-[52px] w-full items-center gap-2.5 rounded-full bg-white pr-2 pl-4 text-left lg:mt-7 lg:h-14 lg:pr-2 lg:pl-5"
          style={{ boxShadow: "0 6px 24px rgba(0,0,0,0.09), 0 0 0 1px var(--hairline)" }}
        >
          <MagnifyingGlass aria-hidden className="size-[17px] shrink-0 text-(--dim) lg:size-[19px]" />
          <span className="min-w-0 flex-1 truncate text-[15px] text-(--dim) lg:text-base">
            <span className="lg:hidden">{m.home.fieldSearchMob}</span>
            <span className="hidden lg:inline">{m.home.fieldSearch}</span>
          </span>
          <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-(--wax) text-white lg:size-[42px]">
            <MagnifyingGlass className="size-4 lg:size-[18px]" weight="bold" />
          </span>
        </button>

        {/* 칩 줄은 모바일에서 화면 끝까지 흘려보낸다 — 거터 안에서 끊기면
            마지막 칩이 잘린 것처럼 보인다. */}
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
                  href={href(`/map?city=${city.slug}`)}
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


