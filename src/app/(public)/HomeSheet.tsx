"use client";

/**
 * 홈 = 영상 콘택트 시트.
 *
 * 프레임(썸네일)이 화면의 유일한 광원이고, 그 아래 캡션 세 줄이 붙는다:
 *   채널 · 도시 · 간 곳 수  /  영상 제목(원본 그대로)  /  실제 상호명
 * 마지막 줄이 이 화면의 존재 이유다 — "간 곳 14"는 주장이고 상호명은 증명이다.
 *
 * 왁스(--wax)는 **우리가 찾아낸 것**에만 쓴다. 여기서는 장소 개수 하나뿐이다.
 * 칩 배경이나 버튼으로 번지기 시작하면 "다크 + 네온 액센트"로 떨어진다.
 *
 * 필터는 전부 클라이언트다 — 16편 규모에서 왕복할 이유가 없다.
 */

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import type { FeedCreator, FeedVideo } from "@/shared/api/home";
import { Avatar, Chip, Frame, Icon, Index } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

/** 현상 애니메이션을 거는 프레임 수. 아래쪽까지 걸면 스크롤이 계속 흔들린다 */
const DEVELOP_LIMIT = 6;

/**
 * 프레임 아래 캡션 — 위계가 이 화면의 승부처다.
 *
 * 처음에는 영상 제목을 헤드라인으로 놓았는데, 실데이터를 띄워 보니 틀렸다.
 * 방문자의 질문은 "그 가게 어디야"이고 답은 **상호명**이다. 영상 제목은 그 답의
 * 출처다. 게다가 썸네일에 이미 큰 글자로 제목류가 박혀 있어 제목을 크게 쓰면
 * 같은 말이 두 번 나온다.
 *
 * 영상 제목은 유튜브 원본 그대로 전문을 표시한다 — 크기가 작아도 "visible"
 * 요건은 충족하고, 요약·의역했다면 그때 §III.E.3 위반이다(LEGAL.md 4.5-(3)).
 */
function Caption({ video, large }: { video: FeedVideo; large: boolean }) {
  const [first, ...more] = video.placeNames;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Avatar initials={video.initials} accent={video.accentColor} size={22} />
        <span className="index truncate" style={{ color: "var(--dim)" }}>
          {video.creatorName}
          {video.cities[0] ? ` · ${video.cities[0]}` : ""}
        </span>
      </div>

      {/* 이 화면의 답. 왁스 핀은 "우리가 찾아내 지도에 찍은 것"이라는 표시다 */}
      <h3
        className="flex items-start gap-1.5 font-bold"
        style={{
          fontSize: large ? "var(--t-screen)" : "var(--t-title)",
          letterSpacing: "-0.03em",
          lineHeight: 1.3,
        }}
      >
        <Icon.pin
          className="mt-[0.18em] size-[0.82em] shrink-0"
          style={{ color: "var(--wax)" }}
        />
        <span>
          {first}
          {more.length > 0 ? (
            <span className="tnum font-medium" style={{ color: "var(--dim)" }}>
              {" "}
              +{more.length}곳
            </span>
          ) : null}
        </span>
      </h3>

      <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.55 }}>
        {video.title}
      </p>
    </div>
  );
}

/**
 * 시트 한 칸.
 *
 * 리드(첫 프레임)만 데스크톱에서 좌우 2단이 된다. 세로로 쌓으면 16:9 프레임이
 * 컨테이너 폭 전체를 먹어 600px 높이가 되고, 그 아래가 전부 접힌다. 가로로
 * 눕히면 같은 프레임이 리듬을 만들면서 첫 화면 안에 캡션까지 들어온다.
 */
function Sheet({ video, i, large = false }: { video: FeedVideo; i: number; large?: boolean }) {
  return (
    <li
      className={i < DEVELOP_LIMIT ? "develop" : undefined}
      style={{ "--i": i } as React.CSSProperties}
    >
      <Link
        href={`/c/${video.creatorSlug}/v/${video.youtubeId}`}
        className={
          large
            ? "group grid gap-3.5 md:grid-cols-[3fr_2fr] md:items-center md:gap-7"
            : "group grid gap-3.5"
        }
        aria-label={`${video.placeNames[0] ?? video.title} 외 ${video.stopCount - 1}곳 — ${video.title}`}
      >
        <Frame className="transition-[box-shadow] duration-200 group-hover:shadow-[inset_0_0_0_1px_var(--edge)]">
          <Thumb youtubeId={video.youtubeId} alt={video.title} eager={large} />
        </Frame>
        <Caption video={video} large={large} />
      </Link>
    </li>
  );
}

export function HomeSheet({
  videos,
  creators,
  totals,
}: {
  videos: FeedVideo[];
  creators: FeedCreator[];
  totals: { creators: number; cities: number; places: number; videos: number };
}) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const searchId = useId();

  const allCities = useMemo(
    () => [...new Set(videos.flatMap((v) => v.cities))].sort(),
    [videos],
  );

  /** 제목뿐 아니라 상호명·도시로도 찾는다 — "이치란 어디 나왔지"가 실제 질문이다 */
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return videos.filter((v) => {
      if (city && !v.cities.includes(city)) return false;
      if (!needle) return true;
      return (
        v.title.toLowerCase().includes(needle) ||
        v.creatorName.toLowerCase().includes(needle) ||
        v.cities.some((c) => c.toLowerCase().includes(needle)) ||
        v.placeNames.some((n) => n.toLowerCase().includes(needle))
      );
    });
  }, [videos, q, city]);

  const filtered = Boolean(q.trim() || city);
  const [lead, ...rest] = shown;

  return (
    <div className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <header className="flex flex-col gap-4">
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-display)", letterSpacing: "-0.045em", lineHeight: 1.12 }}
        >
          유튜브에서 본
          <br />그 가게, 지도로.
        </h1>
        {/* 규모 — 장소·도시는 우리 큐레이션 산출물이고, 영상 수는 API 유래라
            "검수한"을 붙여 성격을 분명히 한다 (LEGAL.md 4.5-(2)) */}
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          간 곳 {totals.places} · 도시 {totals.cities} · 검수한 영상 {totals.videos}
        </p>
      </header>

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
          <span className="sr-only">가게 이름·영상·도시 검색</span>
          <Icon.search className="size-[18px] shrink-0" style={{ color: "var(--dim)" }} />
          <input
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="가게 이름으로 찾기"
            autoComplete="off"
            enterKeyHint="search"
            className="w-full bg-transparent outline-none placeholder:text-[color:var(--dim)]"
            style={{ fontSize: "var(--t-body)" }}
          />
        </label>

        {allCities.length > 1 ? (
          <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter)">
            <Chip active={city === null} onClick={() => setCity(null)}>
              전체
            </Chip>
            {allCities.map((c) => (
              <Chip key={c} active={city === c} onClick={() => setCity(city === c ? null : c)}>
                {c}
              </Chip>
            ))}
          </div>
        ) : null}
      </section>

      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p style={{ fontSize: "var(--t-body)" }}>
            찾는 곳이 아직 시트에 없어요.
          </p>
          <Chip
            onClick={() => {
              setQ("");
              setCity(null);
            }}
          >
            전체 보기
          </Chip>
        </div>
      ) : (
        <section aria-labelledby="sheet-h" className="flex flex-col gap-(--stack)">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="sheet-h" className="index" style={{ color: "var(--dim)" }}>
              {filtered ? `찾은 영상 ${shown.length}` : "최근 영상"}
            </h2>
            {filtered ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setCity(null);
                }}
                className="cursor-pointer underline underline-offset-4"
                style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
              >
                전체 보기
              </button>
            ) : null}
          </div>

          {/* 첫 프레임은 전폭 — 시트에도 리듬이 있어야 한다.
              key 에 필터를 물려 필터가 바뀔 때마다 현상 연출을 다시 태운다 */}
          <ul key={`${q}|${city}`} className="flex flex-col gap-(--block)">
            {lead ? <Sheet video={lead} i={0} large /> : null}
          </ul>
          {rest.length > 0 ? (
            <ul
              key={`rest-${q}|${city}`}
              className="mt-(--block) grid grid-cols-1 gap-(--block) md:grid-cols-2 xl:grid-cols-3"
            >
              {rest.map((v, i) => (
                <Sheet key={v.youtubeId} video={v} i={i + 1} />
              ))}
            </ul>
          ) : null}
        </section>
      )}

      {/* 채널 — 지금은 1개지만 늘어나면 여기가 두 번째 진입축이 된다 */}
      {creators.length > 0 ? (
        <section aria-labelledby="ch-h" className="flex flex-col gap-(--stack)">
          <h2 id="ch-h" className="index" style={{ color: "var(--dim)" }}>
            채널 {totals.creators}
          </h2>
          <ul className="flex flex-col gap-(--stack)">
            {creators.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/c/${c.slug}`}
                  className="flex items-center gap-3 py-1"
                  aria-label={`${c.displayName} 채널 열기`}
                >
                  <Avatar initials={c.initials} accent={c.accentColor} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold" style={{ fontSize: "var(--t-title)" }}>
                      {c.displayName}
                    </span>
                    <span
                      className="block truncate"
                      style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                    >
                      {c.cities.map((x) => x.name).join(" · ")}
                    </span>
                  </span>
                  <Index className="tnum shrink-0">{c.placeCount}곳</Index>
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
