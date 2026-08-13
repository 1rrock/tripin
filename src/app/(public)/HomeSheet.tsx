"use client";

/**
 * 홈 — 고르는 순서는 둘뿐이다: **어느 도시 · 누구의 지도**.
 *
 *   검색 → 규모 → 도시 시트 → 조각 롤
 *
 * 두 섹션을 같은 2열 히어로로 깔면 아래 컷이 위 도시의 다음 장으로 읽힌다.
 * 도시는 동급 타일(이름 먼저), 조각은 채널 얼굴이 프레임 위에 있는 롤.
 * 16:9 만 — 썸네일 변형 금지.
 */

import type { CSSProperties } from "react";
import Link from "next/link";
import type { FeedPiece } from "@/shared/api/home";
import type { CityRow } from "@/shared/api/cities";
import { Avatar, Frame, Icon } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName } from "@/shared/i18n/display";

const CITY_TILES = 6;

function openSearch() {
  window.dispatchEvent(new Event("tripin:open-search"));
}

export function HomeSheet({
  pieces,
  totals,
  cities,
}: {
  pieces: FeedPiece[];
  totals: { creators: number; cities: number; places: number; videos: number };
  cities: CityRow[];
}) {
  const { messages: m, href, t, locale } = useLocale();
  const tiles = cities.slice(0, CITY_TILES);

  return (
    <div className="pb-20">
      <h1 className="sr-only">{m.home.srHeading}</h1>

      <div className="px-(--gutter) pt-3 pb-1 md:hidden">
        <button
          type="button"
          onClick={openSearch}
          className="field flex h-12 w-full cursor-pointer items-center gap-2.5 px-3.5 text-left"
        >
          <Icon.search className="size-[18px] shrink-0" style={{ color: "var(--dim)" }} />
          <span style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.home.goWhere}</span>
        </button>
      </div>

      <p className="index tnum px-(--gutter) pt-3 md:pt-5" style={{ color: "var(--dim)" }}>
        {t(m.home.stats, {
          places: totals.places,
          cities: totals.cities,
          creators: totals.creators,
        })}
      </p>

      {tiles.length > 0 ? (
        <section className="px-(--gutter) pt-(--block)" aria-labelledby="cities-h">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="cities-h"
              className="font-bold"
              style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.03em", lineHeight: 1.2 }}
            >
              {m.home.popular}
            </h2>
            <Link
              href={href("/city")}
              className="index inline-flex shrink-0 items-center gap-0.5 hover:underline"
              style={{ color: "var(--dim)" }}
            >
              {m.home.allRegions}
              <Icon.chevron className="size-3" />
            </Link>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-2.5 gap-y-6 md:grid-cols-3 md:gap-x-3 md:gap-y-7">
            {tiles.map((c, i) => {
              const cut = c.recentVideos[0];
              return (
                <li
                  key={c.slug}
                  className={`min-w-0${i < 2 ? " develop" : ""}`}
                  style={i < 2 ? ({ "--i": i } as CSSProperties) : undefined}
                >
                  <Link
                    href={href(`/city/${c.slug}`)}
                    className="block"
                    aria-label={t(m.cityIndex.openMap, {
                      name: displayCityName(c, locale),
                      places: c.placeCount,
                      creators: c.creatorCount,
                    })}
                  >
                    {/* 이름을 프레임 앞에 — 컷을 보고 도시를 추측하지 않게 */}
                    <span className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span
                        className="min-w-0 truncate font-bold"
                        style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em" }}
                      >
                        {displayCityName(c, locale)}
                      </span>
                      <span className="index tnum shrink-0" style={{ color: "var(--dim)" }}>
                        {t(m.home.placesUnit, { n: c.placeCount })}
                      </span>
                    </span>
                    <Frame className="block w-full">
                      {cut ? (
                        <Thumb youtubeId={cut.youtubeId} alt={cut.title} eager={i === 0} />
                      ) : null}
                    </Frame>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {pieces.length > 0 ? (
        <section
          className="mt-(--block) border-t px-(--gutter) pt-(--block)"
          style={{ borderColor: "var(--hairline)" }}
          aria-labelledby="pieces-h"
        >
          <h2
            id="pieces-h"
            className="font-bold"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.03em", lineHeight: 1.2 }}
          >
            {m.home.piecesHeading}
          </h2>
          <ul className="mt-4 flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-7">
            {pieces.map((p, i) => (
              <li key={`${p.creatorSlug}:${p.city.slug}`} className="min-w-0">
                <Link
                  href={href(`/c/${p.creatorSlug}/${p.city.slug}`)}
                  className="block"
                  aria-label={t(m.piece.title, {
                    creator: p.creatorName,
                    city: displayCityName(p.city, locale),
                  })}
                >
                  <span className="mb-2 flex items-center gap-2.5">
                    <Avatar
                      initials={p.initials}
                      accent={p.accentColor}
                      src={p.avatarUrl}
                      size={36}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate font-bold"
                        style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em" }}
                      >
                        {p.creatorName}
                      </span>
                      <span
                        className="mt-0.5 block truncate"
                        style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                      >
                        {displayCityName(p.city, locale)}
                        <span className="index tnum">
                          {" "}
                          {t(m.home.placesUnit, { n: p.placeCount })}
                        </span>
                      </span>
                    </span>
                  </span>
                  <Frame className="block w-full">
                    {p.cut ? (
                      <Thumb
                        youtubeId={p.cut.youtubeId}
                        alt={p.cut.title}
                        eager={tiles.length === 0 && i === 0}
                      />
                    ) : null}
                  </Frame>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
