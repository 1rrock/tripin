"use client";

/**
 * 홈 디렉터리 클라이언트 셸 — 검색 상태를 히어로 검색창과 목록이 공유한다.
 * 서버 페이지가 히어로·티커·3단계 사이에 검색창을 끼울 수 있게 분리했다.
 */

import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { isDarkHex } from "@/shared/lib/color";
import type { CreatorCard } from "./CreatorSearch";

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

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
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

function SearchField({
  id,
  q,
  setQ,
  size = "lg",
}: {
  id: string;
  q: string;
  setQ: (v: string) => void;
  size?: "lg" | "md";
}) {
  const large = size === "lg";
  return (
    <label htmlFor={id} className="relative block w-full max-w-xl">
      <span className="sr-only">채널 검색</span>
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft ${
          large ? "left-4" : "left-3.5"
        }`}
      >
        <SearchIcon size={large ? 18 : 16} />
      </span>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="채널 이름이나 도시로 찾기"
        autoComplete="off"
        enterKeyHint="search"
        className={`w-full rounded-full border border-line bg-card text-ink outline-none transition placeholder:text-ink-soft focus:border-ink ${
          large ? "h-14 pr-5 pl-12 text-[16px]" : "h-12 pr-5 pl-11 text-[15px]"
        }`}
      />
    </label>
  );
}

export function HomeBrowse({
  creators,
  middle,
}: {
  creators: CreatorCard[];
  /** 검색창과 목록 사이 — 티커·3단계 등 서버 HTML 을 그대로 끼운다 */
  middle?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const heroId = useId();
  const listId = useId();

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
    <>
      {/* 히어로 검색 — 첫 화면의 주 행동. 페이지 히어로와 같은 max-w·패딩 정렬 */}
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 md:px-8">
        <div className="mt-7">
          <SearchField id={heroId} q={q} setQ={setQ} size="lg" />
          {q.trim() ? (
            <p className="tnum mt-3 text-[13px] text-ink-soft">
              <a href="#creators" className="font-bold text-ink underline-offset-4 hover:underline">
                결과 {shown.length}개 보기
              </a>
            </p>
          ) : (
            <p className="mt-3 text-[13px] text-ink-soft">
              등록된 채널·도시 이름만 검색됩니다. 유튜브 전체가 아닙니다.
            </p>
          )}
        </div>
      </div>

      {middle}

      <div className="mx-auto w-full max-w-6xl px-6 md:px-8">
        <section id="creators" className="pt-14 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight">채널로 시작하세요</h2>
              <p className="mt-2 text-[15px] text-ink-soft">
                구독하는 그 사람의 발자국이 곧 지도가 됩니다
              </p>
            </div>
            {/* 목록 구간에서도 같은 검색 상태 — 스크롤 후 다시 찾을 수 있다 */}
            <div className="w-full max-w-sm sm:w-auto sm:min-w-[16rem]">
              <SearchField id={listId} q={q} setQ={setQ} size="md" />
            </div>
          </div>

          {q.trim() ? (
            <p className="tnum mt-5 text-[13px] text-ink-soft">
              검색 결과 <b className="font-bold text-ink">{shown.length}</b>
              {shown.length !== creators.length ? ` / ${creators.length}` : ""}
            </p>
          ) : null}

          {shown.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-line py-16 text-center">
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
                q.trim() ? "mt-5" : "mt-8"
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
        </section>
      </div>
    </>
  );
}
