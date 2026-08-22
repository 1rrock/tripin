"use client";

/**
 * 홈 히어로 시안 6 + 현재안.
 *
 * 가운데 굵은 훅 두 줄이 에어비앤비 랜딩처럼 읽혀서 버렸다.
 * 각 안은 같은 검색 알약을 두고, 글이 서는 자리만 가른다.
 */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon as MagnifyingGlass } from "@phosphor-icons/react";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { HOME_TYPES, typeIcon } from "@/shared/ui/type-icons";

type Id = "now" | "A" | "B" | "C" | "D" | "E" | "F";

type Copy = { title: string; line2?: string; sub?: string; search?: string; hint?: string };

type Concept = {
  id: Id;
  name: { ko: string; en: string };
  why: { ko: string; en: string };
  ko: Copy;
  en: Copy;
};

const CONCEPTS: Concept[] = [
  {
    id: "now",
    name: { ko: "현재", en: "Current" },
    why: {
      ko: "1차에서 버린 안. 비교용으로만 남긴다.",
      en: "The rejected first pass. Kept only to compare.",
    },
    ko: {
      title: "유튜브에서 본",
      line2: "그 가게, 지도로.",
      sub: "여행 유튜버가 영상에서 간 맛집·명소를 채널·도시별로 지도에 모았습니다.",
    },
    en: {
      title: "Places you saw",
      line2: "on YouTube, on a map.",
      sub: "Places travel YouTubers visited in their videos, mapped by channel and city.",
    },
  },
  {
    id: "A",
    name: { ko: "질문 한 줄", en: "The question" },
    why: {
      ko: "1차 A 문구 + B 서는 자리. 오는 사람의 말.",
      en: "Round-1 A copy in B’s stance. The visitor’s own words.",
    },
    ko: { title: "그 가게 어디였지" },
    en: { title: "That shop — where was it" },
  },
  {
    id: "B",
    name: { ko: "검색이 질문", en: "Search asks" },
    why: {
      ko: "1차 D + A. 제목 없이 검색 칸이 질문을 한다.",
      en: "Round-1 D + A. No headline; the field asks the question.",
    },
    ko: {
      title: "그 가게 어디였지",
      search: "그 가게 어디였지",
      hint: "상호 · 채널 · 도시",
    },
    en: {
      title: "That shop — where was it",
      search: "That shop from the video",
      hint: "Name, channel, city",
    },
  },
  {
    id: "C",
    name: { ko: "다녀간 곳 분할", en: "Went · split" },
    why: {
      ko: "1차 E 문구 + C 자리. 왼쪽이 입장, 오른쪽이 찾기.",
      en: "Round-1 E copy in C’s split. Stance left, find right.",
    },
    ko: {
      title: "다녀간 곳",
      sub: "추천이 아니라, 그 채널이 간 곳.",
    },
    en: {
      title: "Places they went",
      sub: "Not a rec — where that channel actually went.",
    },
  },
  {
    id: "D",
    name: { ko: "한 문장", en: "One sentence" },
    why: {
      ko: "1차 F를 한 줄로. 슬로건 없이 하는 일만.",
      en: "Round-1 F cut to one line. What it does, no slogan.",
    },
    ko: { title: "영상에서 본 상호를, 지도에서 찾습니다." },
    en: { title: "The name from the video, found on a map." },
  },
  {
    id: "E",
    name: { ko: "상호로", en: "By name" },
    why: {
      ko: "1차 B 문구를 더 짧게. 산호 마침표.",
      en: "Round-1 B, shorter. Coral full stop.",
    },
    ko: { title: "영상 속 가게를, 상호로" },
    en: { title: "The shop from the video, by name" },
  },
  {
    id: "F",
    name: { ko: "한 칸 검색", en: "One field" },
    why: {
      ko: "종류 칸을 빼고 검색 하나만. 질문 + 본문 한 줄.",
      en: "Drop the type field. One search, one sentence.",
    },
    ko: {
      title: "영상에서 본 상호를 지도에서 찾습니다.",
      search: "그 가게 어디였지",
      hint: "상호 · 채널 · 도시",
    },
    en: {
      title: "The name from the video, found on a map.",
      search: "That shop from the video",
      hint: "Name, channel, city",
    },
  },
];

function SearchMock({
  label,
  hint,
  compact,
  align = "center",
  single,
}: {
  label: string;
  hint: string;
  compact?: boolean;
  align?: "center" | "start";
  single?: boolean;
}) {
  const { messages: m } = useLocale();
  return (
    <div
      className={
        compact
          ? "w-full"
          : align === "start"
            ? "w-full max-w-3xl"
            : "mx-auto w-full max-w-3xl"
      }
    >
      <div className="relative flex h-12 w-full items-center rounded-full bg-(--hover) pr-3 pl-11 lg:hidden">
        <MagnifyingGlass
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-(--dim)"
        />
        <span className="truncate text-base text-(--dim)">{label}</span>
      </div>

      <div
        className="relative hidden items-center rounded-full bg-white lg:flex"
        style={{ boxShadow: "0 6px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--hairline)" }}
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center rounded-l-full py-3.5 pr-4 pl-6 text-left">
          <span className="text-[12px] font-bold">{label}</span>
          <span className="mt-0.5 truncate text-[14px] text-(--dim)">{hint}</span>
        </div>
        {single ? null : (
          <>
            <span aria-hidden className="h-8 w-px shrink-0 bg-(--hairline)" />
            <div className="flex min-w-0 flex-1 items-center py-3.5 pr-3 pl-5">
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold">{m.home.whatToSee}</span>
                <span className="mt-0.5 block truncate text-[14px] text-(--dim)">
                  {m.home.whatToSeeHint}
                </span>
              </span>
            </div>
          </>
        )}
        <span className="m-2 grid size-12 shrink-0 place-items-center rounded-full bg-(--wax) text-white">
          <MagnifyingGlass className="size-5" weight="bold" />
        </span>
      </div>
    </div>
  );
}

function TypeRow() {
  const { messages: m } = useLocale();
  return (
    <div className="mt-6 hidden justify-center gap-1 lg:flex">
      {HOME_TYPES.map((type) => {
        const Glyph = typeIcon(type);
        return (
          <span
            key={type}
            className="flex min-w-[4.5rem] flex-col items-center gap-1.5 px-3 py-2 text-(--paper)"
          >
            <Glyph size={22} weight="duotone" />
            <span className="text-[12px] font-medium">{m.placeTypes[type]}</span>
          </span>
        );
      })}
    </div>
  );
}

function Hero({ id, copy }: { id: Id; copy: Copy }) {
  const { messages: m } = useLocale();
  const search = copy.search ?? m.home.goWhere;
  const hint = copy.hint ?? m.home.goWhereHint;

  if (id === "now") {
    return (
      <section className="px-(--gutter) pt-4 pb-4 lg:pt-8 lg:pb-6">
        <header className="mx-auto mb-5 max-w-xl text-center lg:mb-7">
          <p
            className="font-black"
            style={{ fontSize: "var(--t-display)", letterSpacing: "-0.045em", lineHeight: 1.12 }}
          >
            <span className="block">{copy.title}</span>
            <span className="block">{copy.line2}</span>
          </p>
          <p
            className="mx-auto mt-3 max-w-[36rem]"
            style={{ fontSize: "var(--t-body)", lineHeight: 1.55, color: "var(--dim)" }}
          >
            {copy.sub}
          </p>
        </header>
        <SearchMock label={search} hint={hint} />
        <TypeRow />
      </section>
    );
  }

  if (id === "A" || id === "E") {
    return (
      <section className="px-(--gutter) pt-5 pb-5 lg:pt-9 lg:pb-7">
        <div className="mx-auto w-full max-w-3xl">
          <p
            className="mb-5 font-bold lg:mb-6"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.03em", lineHeight: 1.25 }}
          >
            {copy.title}
            <span aria-hidden style={{ color: "var(--wax)" }}>
              .
            </span>
          </p>
          <SearchMock label={search} hint={hint} align="start" />
        </div>
        <TypeRow />
      </section>
    );
  }

  if (id === "B") {
    return (
      <section className="px-(--gutter) pt-7 pb-5 lg:pt-12 lg:pb-7">
        <h2 className="sr-only">{copy.title}</h2>
        <SearchMock label={search} hint={hint} />
        <TypeRow />
      </section>
    );
  }

  if (id === "C") {
    return (
      <section className="px-(--gutter) pt-5 pb-5 lg:pt-9 lg:pb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <header className="max-w-sm shrink-0">
            <p
              className="font-black"
              style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
            >
              {copy.title}
              <span aria-hidden style={{ color: "var(--wax)" }}>
                .
              </span>
            </p>
            <p className="mt-2" style={{ fontSize: "var(--t-body)", color: "var(--dim)", lineHeight: 1.5 }}>
              {copy.sub}
            </p>
          </header>
          <div className="min-w-0 flex-1 lg:max-w-xl">
            <SearchMock label={search} hint={hint} compact />
          </div>
        </div>
        <TypeRow />
      </section>
    );
  }

  if (id === "F") {
    return (
      <section className="px-(--gutter) pt-5 pb-5 lg:pt-9 lg:pb-7">
        <div className="mx-auto w-full max-w-xl">
          <p
            className="mb-4 max-w-[34rem] lg:mb-5"
            style={{ fontSize: "var(--t-body)", lineHeight: 1.65, color: "var(--paper)" }}
          >
            {copy.title}
          </p>
          <SearchMock label={search} hint={hint} align="start" single />
        </div>
      </section>
    );
  }

  return (
    <section className="px-(--gutter) pt-5 pb-5 lg:pt-9 lg:pb-7">
      <div className="mx-auto w-full max-w-3xl">
        <p
          className="mb-5 max-w-[34rem] lg:mb-6"
          style={{ fontSize: "var(--t-body)", lineHeight: 1.7, color: "var(--paper)" }}
        >
          {copy.title}
        </p>
        <SearchMock label={search} hint={hint} align="start" />
      </div>
      <TypeRow />
    </section>
  );
}

function Inner() {
  const params = useSearchParams();
  const { locale } = useLocale();
  const pick = params.get("c") as Id | null;
  const shown = pick ? CONCEPTS.filter((c) => c.id === pick) : CONCEPTS;
  const ko = locale !== "en";

  return (
    <main className="pb-16">
      <header
        className="border-b px-(--gutter) pt-5 pb-4"
        style={{ borderColor: "var(--hairline)" }}
      >
        <p className="index" style={{ color: "var(--dim)" }}>
          {ko ? "시안 2 · 섞은 안" : "Comps 2 · remixed"}
        </p>
        <h1
          className="mt-1.5 font-bold"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.03em" }}
        >
          {ko ? "1차에서 센 조각만 다시 짜습니다." : "The strong pieces from round 1, recut."}
        </h1>
        <p className="mt-2 max-w-[36rem]" style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.55 }}>
          {ko
            ? "질문 문구, 한 줄, 검색이 말하기, 분할을 섞었습니다. 고르면 그 안만 홈에 옮깁니다."
            : "The question, the one-liner, search-as-voice, and the split. Pick one and it moves to home."}
        </p>
        <nav className="mt-4 flex flex-wrap gap-1.5" aria-label={ko ? "시안" : "Comps"}>
          <Link
            href="/hero-concepts"
            className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
            style={{
              background: pick ? "var(--hover)" : "var(--paper)",
              color: pick ? "var(--paper)" : "var(--ground)",
            }}
          >
            {ko ? "전체" : "All"}
          </Link>
          {CONCEPTS.map((c) => {
            const on = pick === c.id;
            return (
              <Link
                key={c.id}
                href={`/hero-concepts?c=${c.id}`}
                className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={{
                  background: on ? "var(--paper)" : "var(--hover)",
                  color: on ? "var(--ground)" : "var(--paper)",
                }}
              >
                {c.id === "now" ? (ko ? "현재" : "Now") : `${c.id} ${ko ? c.name.ko : c.name.en}`}
              </Link>
            );
          })}
        </nav>
      </header>

      {shown.map((c) => {
        const copy = ko ? c.ko : c.en;
        return (
          <article key={c.id} id={c.id} className="border-b" style={{ borderColor: "var(--hairline)" }}>
            <div
              className="flex flex-wrap items-baseline justify-between gap-2 px-(--gutter) pt-3 pb-2"
              style={{ background: "var(--hover)" }}
            >
              <p className="index">
                <span className="font-bold">{c.id === "now" ? (ko ? "현재" : "Now") : c.id}</span>
                <span style={{ color: "var(--dim)" }}> · {ko ? c.name.ko : c.name.en}</span>
              </p>
              <p className="text-[12px]" style={{ color: "var(--dim)" }}>
                {ko ? c.why.ko : c.why.en}
              </p>
            </div>
            <div className="mx-auto w-full max-w-lg lg:max-w-5xl">
              <Hero id={c.id} copy={copy} />
            </div>
          </article>
        );
      })}
    </main>
  );
}

export function Boards() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
