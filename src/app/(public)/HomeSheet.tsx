"use client";

/**
 * 홈 = 영상 콘택트 시트 + 채널 진입 (로케일 UI).
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { FeedCreator, HomeSheetVideo } from "@/shared/api/home";
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
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchId = useId();

  const allCities = useMemo(() => {
    const bySlug = new Map(videos.flatMap((v) => v.cities).map((c) => [c.slug, c]));
    return [...bySlug.values()].sort((a, b) =>
      displayCityName(a, locale).localeCompare(displayCityName(b, locale)),
    );
  }, [videos, locale]);

  const needle = q.trim().toLowerCase();

  const matchesNeedle = useCallback(
    (v: HomeSheetVideo) =>
      v.title.toLowerCase().includes(needle) ||
      v.creatorName.toLowerCase().includes(needle) ||
      v.cities.some((c) => displayCityName(c, locale).toLowerCase().includes(needle)) ||
      v.placeNames.some((n) => n.toLowerCase().includes(needle)) ||
      // 음식 종류 — "라멘"은 상호명이 아니라 요약 불릿(search)에 산다
      v.search.toLowerCase().includes(needle) ||
      // 굵은 유형 — "카페"/"cafe" 같은 분류어. 라벨(로케일)과 enum 값 양쪽을 본다
      v.placeTypes.some(
        (pt) => m.placeTypes[pt].toLowerCase().includes(needle) || pt.includes(needle),
      ),
    [needle, locale, m],
  );

  const shown = useMemo(() => {
    return videos.filter((v) => {
      if (city && !v.cities.some((c) => c.slug === city)) return false;
      if (channel && v.creatorSlug !== channel) return false;
      if (!needle) return true;
      return matchesNeedle(v);
    });
  }, [videos, needle, city, channel, matchesNeedle]);

  // 검색어 자체가 0건인가 — 칩(도시·채널) 필터와 무관하게 판단해야
  // "말이 빗나갔다"는 신호가 된다. 1.2초 머문 검색어만, 마운트당 한 번씩 기록.
  const queryMissed = needle.length > 0 && !videos.some(matchesNeedle);
  const reportedMisses = useRef(new Set<string>());
  useEffect(() => {
    if (!queryMissed || reportedMisses.current.has(needle)) return;
    const timer = setTimeout(() => {
      reportedMisses.current.add(needle);
      void fetch("/api/search-miss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: needle }),
        keepalive: true,
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [queryMissed, needle]);

  const resetPage = () => setVisibleCount(PAGE_SIZE);

  const onQuery = (value: string) => {
    setQ(value);
    resetPage();
  };
  const onCity = (next: string | null) => {
    setCity(next);
    resetPage();
  };
  const onChannel = (next: string | null) => {
    setChannel(next);
    resetPage();
  };

  const filtered = Boolean(q.trim() || city || channel);
  const clearAll = () => {
    setQ("");
    setCity(null);
    setChannel(null);
    resetPage();
  };

  const page = shown.slice(0, visibleCount);
  const hasMore = shown.length > visibleCount;
  const [lead, ...rest] = page;
  const filterKey = `${q}|${city ?? ""}|${channel ?? ""}`;

  return (
    <div className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <section className="flex flex-col gap-(--stack)">
        <label
          htmlFor={searchId}
          className="flex items-center gap-2.5 px-3.5 py-3"
          style={{
            borderRadius: "var(--r-control)",
            background: "var(--sheet)",
            boxShadow: "inset 0 0 0 1px var(--hairline)",
          }}
        >
          <span className="sr-only">{m.home.searchAria}</span>
          <Icon.search className="size-[18px] shrink-0" style={{ color: "var(--dim)" }} />
          <input
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={m.home.searchPlaceholder}
            autoComplete="off"
            enterKeyHint="search"
            className="w-full bg-transparent outline-none placeholder:text-[color:var(--dim)]"
            style={{ fontSize: "var(--t-body)" }}
          />
        </label>

        {allCities.length > 1 ? (
          <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter)">
            <Chip active={city === null} onClick={() => onCity(null)}>
              {m.home.allCities}
            </Chip>
            {allCities.map((c) => (
              <Chip
                key={c.slug}
                active={city === c.slug}
                onClick={() => onCity(city === c.slug ? null : c.slug)}
              >
                {displayCityName(c, locale)}
              </Chip>
            ))}
          </div>
        ) : null}

        {creators.length > 1 ? (
          <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter)">
            <Chip active={channel === null} onClick={() => onChannel(null)}>
              {m.home.allChannels}
            </Chip>
            {creators.map((c) => (
              <Chip
                key={c.slug}
                active={channel === c.slug}
                onClick={() => onChannel(channel === c.slug ? null : c.slug)}
              >
                {c.displayName}
                <span className="tnum ml-1.5 opacity-60">{c.placeCount}</span>
              </Chip>
            ))}
          </div>
        ) : null}
      </section>

      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p style={{ fontSize: "var(--t-body)" }}>{m.home.empty}</p>
          <Chip onClick={clearAll}>{m.home.showAll}</Chip>
        </div>
      ) : (
        <section aria-labelledby="sheet-h" className="flex flex-col gap-(--stack)">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="sheet-h" className="index" style={{ color: "var(--dim)" }}>
              {filtered
                ? t(m.home.foundVideos, { n: shown.length })
                : hasMore
                  ? t(m.home.recentPaged, { shown: visibleCount, total: shown.length })
                  : m.home.recentVideos}
            </h2>
            {filtered ? (
              <button
                type="button"
                onClick={clearAll}
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
          <ul className="flex flex-col gap-(--stack)">
            {creators.map((c) => (
              <li key={c.slug}>
                <Link
                  href={href(`/c/${c.slug}`)}
                  className="roll -mx-2.5 flex items-center gap-3 rounded-(--r-control) px-2.5 py-1.5"
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
                  <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
