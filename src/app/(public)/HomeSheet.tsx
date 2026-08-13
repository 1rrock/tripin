"use client";

/**
 * 홈 = 영상 콘택트 시트 + 채널 진입 (로케일 UI).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FeedCreator, HomeSheetVideo } from "@/shared/api/home";
import type { PlaceType } from "@/shared/api/database.types";
import { Avatar, Chip, Icon, Index } from "@/shared/ui/frame";
import { VideoSheet } from "@/shared/ui/VideoSheet";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayCityName } from "@/shared/i18n/display";

const DEVELOP_LIMIT = 6;
const PAGE_SIZE = 24;

export function HomeSheet({
  videos,
  creators,
  totals,
}: {
  videos: HomeSheetVideo[];
  creators: FeedCreator[];
  totals: { creators: number; cities: number; places: number; videos: number };
}) {
  const { messages: m, href, t, locale } = useLocale();
  /** `null` 이면 전체. 아니면 `"city:tokyo"` 처럼 축과 값을 한 문자열로 */
  const [filter, setFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /**
   * 도시 칩 — 가나다순이 아니라 **영상 많은 순**.
   * 가나다로 두면 고베(1편)가 맨 앞에 서고 도쿄·후쿠오카가 스크롤 중간에 묻힌다.
   * 칩 줄은 가로 스크롤이라 앞자리가 사실상 유일하게 보이는 자리다.
   */
  const allCities = useMemo(() => {
    const bySlug = new Map<string, { city: (typeof videos)[number]["cities"][number]; n: number }>();
    for (const v of videos) {
      for (const c of v.cities) {
        const hit = bySlug.get(c.slug);
        if (hit) hit.n += 1;
        else bySlug.set(c.slug, { city: c, n: 1 });
      }
    }
    return [...bySlug.values()]
      .sort(
        (a, b) =>
          b.n - a.n ||
          displayCityName(a.city, locale).localeCompare(displayCityName(b.city, locale)),
      )
      .map((x) => x.city);
  }, [videos, locale]);

  /** 피드에 실제로 있는 종류만, 많이 나온 순 */
  const allTypes = useMemo(() => {
    const count = new Map<PlaceType, number>();
    for (const v of videos) for (const pt of v.placeTypes) count.set(pt, (count.get(pt) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([pt]) => pt);
  }, [videos]);

  const shown = useMemo(() => {
    if (!filter) return videos;
    const at = filter.indexOf(":");
    const kind = filter.slice(0, at);
    const value = filter.slice(at + 1);
    return videos.filter((v) =>
      kind === "city"
        ? v.cities.some((c) => c.slug === value)
        : kind === "channel"
          ? v.creatorSlug === value
          : v.placeTypes.includes(value as PlaceType),
    );
  }, [videos, filter]);

  /** 칩은 한 번에 하나만 — 누르면 그 축으로 갈아탄다. 다시 누르면 전체로 */
  const pick = (next: string | null) => {
    setFilter((cur) => (cur === next ? null : next));
    setVisibleCount(PAGE_SIZE);
  };

  const page = shown.slice(0, visibleCount);
  const hasMore = shown.length > visibleCount;
  const [lead, ...rest] = page;
  const filterKey = filter ?? "all";

  return (
    <div className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      {/* 화면에는 안 보이지만 문서에는 남는 제목. 시각적 헤더는 컷이 맡는다. */}
      <h1 className="sr-only">{m.home.srHeading}</h1>
      {/* 필터 한 줄 — 검색창은 헤더로 갔다(SearchBar). 여기 또 두면 둘이 겹친다.
          축이 셋(종류·지역·채널)이지만 줄은 하나다. 줄을 축마다 쌓으면 첫 화면이
          컨트롤로 채워져 정작 썸네일이 접힌 아래로 밀린다 — 이 화면의 주인공은 컷이다.
          한 번에 하나만 켜진다. 영상 60편이라 필터를 겹칠 일이 없다. */}
      <div
        role="group"
        aria-label={m.home.filterAria}
        className="no-scrollbar -mx-(--gutter) flex items-center gap-2 overflow-x-auto px-(--gutter)"
      >
        <Chip active={filter === null} onClick={() => pick(null)}>
          {m.home.allFilters}
        </Chip>

        {allTypes.map((pt) => (
          <Chip key={pt} active={filter === `type:${pt}`} onClick={() => pick(`type:${pt}`)}>
            {m.placeTypes[pt]}
          </Chip>
        ))}

        {allCities.length > 1 ? <ChipRule /> : null}
        {allCities.map((c) => (
          <Chip
            key={c.slug}
            active={filter === `city:${c.slug}`}
            onClick={() => pick(`city:${c.slug}`)}
          >
            {displayCityName(c, locale)}
          </Chip>
        ))}

        {creators.length > 1 ? <ChipRule /> : null}
        {creators.map((c) => (
          <Chip
            key={c.slug}
            active={filter === `channel:${c.slug}`}
            onClick={() => pick(`channel:${c.slug}`)}
          >
            {c.displayName}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p style={{ fontSize: "var(--t-body)" }}>{m.home.empty}</p>
          <Chip onClick={() => pick(null)}>{m.home.showAll}</Chip>
        </div>
      ) : (
        <section aria-labelledby="sheet-h" className="flex flex-col gap-(--stack)">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="sheet-h" className="index" style={{ color: "var(--dim)" }}>
              {filter
                ? t(m.home.foundVideos, { n: shown.length })
                : hasMore
                  ? t(m.home.recentPaged, { shown: visibleCount, total: shown.length })
                  : m.home.recentVideos}
            </h2>
            {filter ? (
              <button
                type="button"
                onClick={() => pick(null)}
                className="cursor-pointer underline underline-offset-4"
                style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
              >
                {m.home.showAll}
              </button>
            ) : null}
          </div>

          <ul key={`lead-${filterKey}`} className="flex flex-col">
            {lead ? (
              <VideoSheet
                video={{ ...lead, cities: lead.cities.map((c) => displayCityName(c, locale)) }}
                href={href(`/c/${lead.creatorSlug}/v/${lead.youtubeId}`)}
                i={0}
                large
                channel={{
                  name: lead.creatorName,
                  initials: lead.initials,
                  accent: lead.accentColor,
                  avatarUrl: lead.avatarUrl,
                }}
              />
            ) : null}
          </ul>
          {rest.length > 0 ? (
            <ul
              key={`rest-${filterKey}`}
              className="mt-(--block) grid grid-cols-1 gap-(--block) md:grid-cols-2 xl:grid-cols-3"
            >
              {rest.map((v, i) => (
                <VideoSheet
                  key={v.youtubeId}
                  video={{ ...v, cities: v.cities.map((c) => displayCityName(c, locale)) }}
                  href={href(`/c/${v.creatorSlug}/v/${v.youtubeId}`)}
                  i={i + 1}
                  animate={i + 1 < DEVELOP_LIMIT}
                  channel={{
                    name: v.creatorName,
                    initials: v.initials,
                    accent: v.accentColor,
                    avatarUrl: v.avatarUrl,
                  }}
                />
              ))}
            </ul>
          ) : null}

          {hasMore ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Chip onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                {m.home.loadMore}
                <span className="tnum ml-1.5 opacity-60">
                  +{Math.min(PAGE_SIZE, shown.length - visibleCount)}
                </span>
              </Chip>
              <p className="index tnum" style={{ color: "var(--dim)" }}>
                {visibleCount} / {shown.length}
              </p>
            </div>
          ) : null}
        </section>
      )}

      {creators.length > 0 ? (
        <section aria-labelledby="ch-h" className="flex flex-col gap-(--stack)">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="ch-h" className="index" style={{ color: "var(--dim)" }}>
              {t(m.home.channels, { n: totals.creators })}
            </h2>
            {creators.length > 6 ? (
              <Link
                href={href("/channels")}
                className="underline-offset-4 hover:underline"
                style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
              >
                {m.home.showAll}
              </Link>
            ) : null}
          </div>
          <ul className="flex flex-col gap-0.5">
            {creators.map((c) => (
              <li key={c.slug}>
                <Link
                  href={href(`/c/${c.slug}`)}
                  className="roll -mx-2.5 flex items-center gap-3 rounded-(--r-control) px-2.5 py-2"
                  aria-label={t(m.home.openChannel, { name: c.displayName })}
                >
                  <Avatar
                    initials={c.initials}
                    accent={c.accentColor}
                    src={c.avatarUrl}
                    size={38}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate font-bold"
                      style={{ fontSize: "var(--t-title)" }}
                    >
                      {c.displayName}
                    </span>
                    <span
                      className="block truncate"
                      style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                    >
                      {c.cities.map((x) => displayCityName(x, locale)).join(" · ")}
                    </span>
                  </span>
                  <Index className="tnum shrink-0">
                    {t(m.home.placesUnit, { n: c.placeCount })}
                  </Index>
                  <Icon.chevron className="roll-go size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** 칩 줄 안의 축 구분 — 종류|지역|채널이 한 줄에 섞여도 경계가 읽히게 */
function ChipRule() {
  return (
    <span
      aria-hidden
      className="mx-1 h-5 w-px shrink-0 self-center"
      style={{ background: "var(--hairline)" }}
    />
  );
}
