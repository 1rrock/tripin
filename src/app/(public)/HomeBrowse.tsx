"use client";

/**
 * 홈 — 공항 사인 시스템 (승인 컴프: .impeccable/mocks/m-home.png)
 *
 * 시안 홈 패턴을 그대로 따른다: 맥락 → 검색 → 퀵액션 → 목록 → 하단 내비.
 * 퀵액션은 **실제 있는 목적지만** 넣는다 — 도시 필터는 이 화면에서 바로 동작하고,
 * 없는 라우트로 가는 버튼은 만들지 않는다.
 *
 * 치수·색은 globals.css 토큰에서만 온다. 여기서 px 를 직접 쓰지 않는다.
 */

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Box, Card, Chip, DataRow, Divider, Icon } from "@/shared/ui/sign";

export interface CreatorCard {
  slug: string;
  displayName: string;
  initials: string;
  accentColor: string;
  placeCount: number;
  videoCount: number;
  cities: { slug: string; name: string }[];
}

export function HomeBrowse({
  creators,
  totals,
}: {
  creators: CreatorCard[];
  /** 규모 증명 — 첫 화면에서 "빈 서비스가 아니다"를 숫자로 말한다 */
  totals: { places: number; cities: number; videos: number };
}) {
  const [q, setQ] = useState("");
  const inputId = useId();

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return creators;
    return creators.filter(
      (c) =>
        c.displayName.toLowerCase().includes(needle) ||
        c.slug.toLowerCase().includes(needle) ||
        c.cities.some((city) => city.name.toLowerCase().includes(needle)),
    );
  }, [creators, q]);

  /** 도시 축 — 채널 하나뿐이던 진입 경로를 늘린다. 장소 수 많은 순으로 4개. */
  const topCities = useMemo(() => {
    const byCity = new Map<string, { name: string; creators: number }>();
    for (const c of creators) {
      for (const city of c.cities) {
        const hit = byCity.get(city.slug);
        if (hit) hit.creators += 1;
        else byCity.set(city.slug, { name: city.name, creators: 1 });
      }
    }
    return [...byCity.values()]
      .sort((a, b) => b.creators - a.creators)
      .slice(0, 4);
  }, [creators]);

  return (
    <>
      {/* 맥락 + 고지 — 고지 뱃지는 장식이 아니라 전 페이지 법적 고지의 일부다 */}
      <header className="flex items-center gap-3 px-(--gutter) pt-2 pb-4">
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: "var(--t-body)" }}>여행 유튜버가 간 곳</p>
          <h1
            className="font-bold"
            style={{
              fontSize: "var(--t-screen)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            어디부터 볼까요
          </h1>
        </div>
        <a href="#notice" aria-label="이 사이트에 대하여">
          <Box icon="person" size="avatar" />
        </a>
      </header>

      <div className="flex flex-col gap-(--stack) px-(--gutter)">
        {/* 규모 증명 — 시안의 GATE / BOARDING / SEAT 문법 */}
        <Card>
          <DataRow
            items={[
              { label: "채널", value: String(creators.length) },
              { label: "도시", value: String(totals.cities) },
              { label: "간 곳", value: String(totals.places) },
              { label: "영상", value: String(totals.videos) },
            ]}
          />
        </Card>

        {/* 검색 */}
        <label
          htmlFor={inputId}
          className="flex items-center gap-3 p-(--card-pad)"
          style={{
            border: "var(--stroke-card) solid var(--hairline)",
            borderRadius: "var(--r-field)",
          }}
        >
          <span className="sr-only">채널·도시 검색</span>
          <Icon.search
            aria-hidden
            style={{
              width: "var(--icon-field)",
              height: "var(--icon-field)",
              fill: "var(--ink)",
              flex: "none",
            }}
          />
          <input
            id={inputId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="채널·도시 검색"
            autoComplete="off"
            enterKeyHint="search"
            className="w-full bg-transparent text-ink outline-none placeholder:opacity-50"
            style={{ fontSize: "var(--t-body)" }}
          />
        </label>

        {/* 퀵액션 = 도시 축. 누르면 이 화면에서 바로 걸러진다 */}
        {topCities.length > 0 ? (
          <nav aria-label="도시로 찾기" className="flex justify-between gap-2">
            {topCities.map((city) => {
              const on = q.trim() === city.name;
              return (
                <button
                  key={city.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setQ(on ? "" : city.name)}
                  className="flex flex-1 cursor-pointer flex-col items-center gap-2"
                >
                  <Box icon="pin" size="quick" />
                  <span
                    className="truncate"
                    style={{ fontSize: "var(--t-meta)", fontWeight: 500 }}
                  >
                    {city.name}
                  </span>
                </button>
              );
            })}
          </nav>
        ) : null}

        {/* 채널 목록 */}
        <section
          aria-labelledby="creators-h"
          className="flex flex-col gap-(--stack)"
        >
          <div className="flex items-center justify-between gap-3 pt-1">
            <h2
              id="creators-h"
              className="font-bold"
              style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em" }}
            >
              채널
            </h2>
            {q.trim() ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="tnum cursor-pointer underline underline-offset-4"
                style={{ fontSize: "var(--t-meta)" }}
              >
                {shown.length}개 · 전체 보기
              </button>
            ) : (
              <span className="tnum" style={{ fontSize: "var(--t-meta)" }}>
                전체 {creators.length}
              </span>
            )}
          </div>

          {shown.length === 0 ? (
            <Card>
              <p style={{ fontSize: "var(--t-body)" }}>
                &lsquo;{q}&rsquo; 에 맞는 채널이 아직 없어요.
              </p>
              <button
                type="button"
                onClick={() => setQ("")}
                className="mt-3 cursor-pointer font-medium underline underline-offset-4"
                style={{ fontSize: "var(--t-meta)" }}
              >
                전체 채널 보기
              </button>
            </Card>
          ) : (
            <ul className="flex flex-col gap-(--stack) md:grid md:grid-cols-2 xl:grid-cols-3">
              {shown.map((creator) => (
                <Card
                  as="li"
                  key={creator.slug}
                  className="flex flex-col gap-(--card-pad)"
                >
                  <Link
                    href={`/c/${creator.slug}`}
                    className="flex items-center gap-4"
                    aria-label={`${creator.displayName} 채널 열기`}
                  >
                    {/* 프로필 사진 자리 — accent_color 로 채널을 구분한다 */}
                    <span
                      aria-hidden
                      className="ds-box ds-box--card grid place-items-center font-bold"
                      style={{
                        background: creator.accentColor,
                        color: "#fff",
                        fontSize: "calc(var(--box-card) * 0.34)",
                      }}
                    >
                      {creator.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate font-bold"
                        style={{
                          fontSize: "var(--t-title)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {creator.displayName}
                      </span>
                      <span
                        className="block truncate"
                        style={{ fontSize: "var(--t-body)" }}
                      >
                        {creator.cities.map((c) => c.name).join(" · ")}
                      </span>
                    </span>
                    <Icon.chevron
                      aria-hidden
                      style={{
                        width: "var(--icon-chevron)",
                        height: "var(--icon-chevron)",
                        fill: "var(--ink)",
                        flex: "none",
                      }}
                    />
                  </Link>

                  <Divider />

                  <DataRow
                    items={[
                      { label: "간 곳", value: String(creator.placeCount) },
                      { label: "도시", value: String(creator.cities.length) },
                      { label: "영상", value: String(creator.videoCount) },
                    ]}
                  />

                  {creator.cities.length > 1 ? (
                    /* 도시 칩은 카드 패딩을 뚫고 가로 스크롤한다 — 잘린 칩이 "더 있다"를 말한다 */
                    <div className="no-scrollbar -mx-(--card-pad) flex gap-2 overflow-x-auto px-(--card-pad)">
                      {creator.cities.map((city) => (
                        <Chip
                          key={city.slug}
                          href={`/c/${creator.slug}/${city.slug}`}
                        >
                          {city.name}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
