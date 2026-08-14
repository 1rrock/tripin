"use client";

/**
 * 홈 허브 — 눌러서 좁혀가는 화면.
 *
 * 검색 → 종류 그리드 → 도시 레일 → 미니 피드.
 * 히든스팟 홈과 같은 문법: 그리드가 주인공, 레일은 가로, 피드는 행 카드.
 *
 * 세로 리듬은 두 단이다 — 덩어리 **안**은 16px 이하, 덩어리 **사이**는 28px 이상.
 * 🔴 섹션 경계를 요소 간격과 같은 값으로 두지 말 것. 20px 굵은 섹션 제목이
 *    격자에 끼어 위계가 사라진다.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import type { FeedCreator, FeedPiece, FeedVideo } from "@/shared/api/home";
import type { CityRow, HomeMapPlace } from "@/shared/api/cities";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName } from "@/shared/i18n/display";
import { CategoryGrid } from "@/shared/ui/CategoryGrid";
import { DestinationRail } from "@/shared/ui/DestinationRail";
import { TabBar } from "@/shared/ui/TabBar";
import { ResultRow } from "@/shared/ui/ResultRow";
import { EmptyState } from "@/shared/ui/EmptyState";
import { HomeCanvas } from "./HomeCanvas";

const MINI = 5;
const RAIL = 8;

type Tab = "recommend" | "recent";

function openSearch() {
  window.dispatchEvent(new Event("tripin:open-search"));
}

export function HomeSheet({
  pieces,
  cities,
  videos,
  creators,
  places,
}: {
  pieces: FeedPiece[];
  cities: CityRow[];
  videos: FeedVideo[];
  creators: FeedCreator[];
  places: HomeMapPlace[];
}) {
  const { messages: m, href, t, locale } = useLocale();
  const [tab, setTab] = useState<Tab>("recommend");
  const rail = cities.slice(0, RAIL);

  const recommend = useMemo(() => pieces.slice(0, MINI), [pieces]);
  const recent = useMemo(() => videos.slice(0, MINI), [videos]);

  return (
    <>
    <HomeCanvas places={places} cities={cities} creators={creators} />
    <div className="mx-auto w-full max-w-lg lg:hidden">
      <h1 className="sr-only">{m.home.srHeading}</h1>

      <div className="px-(--gutter) pt-4 pb-5">
        <button
          type="button"
          onClick={openSearch}
          className="relative flex h-10 w-full cursor-pointer items-center rounded-xl bg-(--hover) pr-3 pl-9 text-left active:bg-[#ededed]"
        >
          <MagnifyingGlass
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--dim)"
          />
          <span className="text-base text-(--dim)">{m.home.goWhere}</span>
        </button>
      </div>

      <CategoryGrid />

      <hr className="rule mx-(--gutter)" />

      <DestinationRail cities={rail} />

      <section className="mt-7">
        <TabBar
          ariaLabel={m.home.feedTabsAria}
          activeId={tab}
          onSelect={(id) => setTab(id as Tab)}
          items={[
            { id: "recommend", label: m.home.tabRecommend },
            { id: "recent", label: m.home.tabRecent },
          ]}
        />

        {tab === "recommend" ? (
          recommend.length === 0 ? (
            <EmptyState message={m.home.empty} />
          ) : (
            <ul>
              {recommend.map((p, i) => (
                <li key={`${p.creatorSlug}:${p.city.slug}`} className="border-b border-(--hairline)">
                  <ResultRow
                    href={href(`/c/${p.creatorSlug}/${p.city.slug}`)}
                    youtubeId={p.cut?.youtubeId ?? null}
                    thumbAlt={p.cut?.title ?? p.creatorName}
                    title={displayCityName(p.city, locale)}
                    meta={`${p.creatorName} · ${t(m.home.placesUnit, { n: p.placeCount })}`}
                    eager={i === 0}
                  />
                </li>
              ))}
            </ul>
          )
        ) : recent.length === 0 ? (
          <EmptyState message={m.home.empty} />
        ) : (
          <ul>
            {recent.map((v, i) => {
              const place = v.placeNames[0];
              const city = v.cities[0];
              const type = v.placeTypes[0];
              return (
                <li key={v.youtubeId} className="border-b border-(--hairline)">
                  <ResultRow
                    href={href(`/c/${v.creatorSlug}/v/${v.youtubeId}`)}
                    youtubeId={v.youtubeId}
                    thumbAlt={v.title}
                    eyebrow={type ? m.placeTypes[type] : undefined}
                    eyebrowType={type}
                    title={place ?? v.title}
                    meta={[v.creatorName, city ? displayCityName(city, locale) : null]
                      .filter(Boolean)
                      .join(" · ")}
                    eager={i === 0}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="px-(--gutter) pt-4 pb-2">
          <Link
            href={href(tab === "recommend" ? "/city" : "/channels")}
            className="flex h-10 items-center justify-center rounded-full bg-(--hover) text-[13px] font-semibold active:scale-95"
          >
            {m.home.moreFeed}
          </Link>
        </div>
      </section>
    </div>
    </>
  );
}
