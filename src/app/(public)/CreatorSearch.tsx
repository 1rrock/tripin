"use client";

/**
 * 채널 검색 + 카드 그리드 (홈·다른 표면 재사용용).
 *
 * 검색 대상은 **우리 DB 에 등록된 채널**이다. 유튜브 전체 채널 검색이 아니다.
 * 홈 랜딩은 `HomeBrowse` 가 검색 상태를 히어로·목록에 공유하므로 그쪽을 쓴다.
 * 이 컴포넌트는 목록만 필요한 표면용.
 */

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { isDarkHex } from "@/shared/lib/color";

export interface CreatorCard {
  slug: string;
  displayName: string;
  initials: string;
  accentColor: string;
  placeCount: number;
  videoCount: number;
  cities: { slug: string; name: string }[];
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M12.5 12.5 16 16" />
    </svg>
  );
}

export function CreatorSearch({ creators }: { creators: CreatorCard[] }) {
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

  return (
    <div>
      <label htmlFor={inputId} className="relative mt-7 block w-full max-w-md">
        <span className="sr-only">채널 검색</span>
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft"
        >
          <SearchIcon />
        </span>
        <input
          id={inputId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="채널 이름이나 도시로 찾기"
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 w-full rounded-full border border-line bg-card pr-5 pl-11 text-[15px] text-ink outline-none transition placeholder:text-ink-soft focus:border-ink"
        />
      </label>

      {q.trim() ? (
        <p className="tnum mt-4 text-[13px] text-ink-soft">
          검색 결과 <b className="font-bold text-ink">{shown.length}</b>
          {shown.length !== creators.length ? ` / ${creators.length}` : ""}
        </p>
      ) : null}

      {shown.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-soft">
            &lsquo;{q}&rsquo; 에 맞는 채널이 아직 없어요.
          </p>
          <button
            type="button"
            onClick={() => setQ("")}
            className="mt-3 cursor-pointer text-[13px] font-bold text-ink underline underline-offset-4"
          >
            전체 채널 보기
          </button>
        </div>
      ) : (
        <div
          className={`grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 ${
            q.trim() ? "mt-4" : "mt-8"
          }`}
        >
          {shown.map((creator) => {
            const single = creator.cities.length === 1;
            const card = (
              <article className="relative h-full rounded-2xl border border-line bg-card p-6 transition group-hover:bg-fill">
                {single ? (
                  <span
                    aria-hidden
                    className="absolute top-6 right-6 grid h-11 w-11 place-items-center rounded-full bg-brand text-on-brand"
                  >
                    <ArrowIcon />
                  </span>
                ) : (
                  <Link
                    href={`/c/${creator.slug}`}
                    aria-label={`${creator.displayName} 채널 열기`}
                    className="absolute top-6 right-6 grid h-11 w-11 place-items-center rounded-full bg-brand text-on-brand transition hover:opacity-85 active:scale-[0.97]"
                  >
                    <ArrowIcon />
                  </Link>
                )}
                <span
                  aria-hidden
                  className="grid h-16 w-16 place-items-center rounded-full border border-line text-2xl font-black"
                  style={{
                    backgroundColor: creator.accentColor,
                    color: isDarkHex(creator.accentColor) ? "#ffffff" : "var(--ink-fixed)",
                  }}
                >
                  {creator.initials}
                </span>
                <h3 className="mt-4 pr-12 text-xl font-bold">{creator.displayName}</h3>
                <p className="tnum mt-1.5 text-[13px] text-ink-soft">
                  간 곳 {creator.placeCount} · 도시 {creator.cities.length} · 영상{" "}
                  {creator.videoCount}
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {creator.cities.map((city) =>
                    single ? (
                      <span
                        key={city.slug}
                        className="rounded-full bg-lemon px-4 py-2.5 text-[13px] font-extrabold text-on-lemon"
                      >
                        {city.name}
                      </span>
                    ) : (
                      <Link
                        key={city.slug}
                        href={`/c/${creator.slug}/${city.slug}`}
                        className="rounded-full bg-lemon px-4 py-2.5 text-[13px] font-extrabold text-on-lemon transition hover:bg-on-lemon hover:text-lemon active:scale-[0.97]"
                      >
                        {city.name}
                      </Link>
                    ),
                  )}
                </div>
              </article>
            );
            return single ? (
              <Link key={creator.slug} href={`/c/${creator.slug}`} className="group">
                {card}
              </Link>
            ) : (
              <div key={creator.slug} className="group">
                {card}
              </div>
            );
          })}

          {creators.length < 4 && !q ? (
            <article className="rounded-2xl border border-dashed border-line bg-fill p-6 opacity-90">
              <span className="grid h-16 w-16 place-items-center rounded-full border border-line bg-card text-2xl font-black text-ink-soft">
                ?
              </span>
              <h3 className="mt-4 text-xl font-bold text-ink-soft">다음 채널</h3>
              <p className="mt-1.5 text-[13px] text-ink-soft">
                준비 중이에요. 영상에서 장소를 확인하는 대로 열립니다.
              </p>
              <div className="mt-5">
                <span className="rounded-full bg-card px-4 py-2.5 text-[13px] font-extrabold text-ink-soft">
                  Coming soon
                </span>
              </div>
            </article>
          ) : null}
        </div>
      )}
    </div>
  );
}
