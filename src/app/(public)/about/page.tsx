import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Icon } from "@/shared/ui/frame";


const h2 = {
  fontSize: "var(--t-title)",
  fontWeight: 700,
  color: "var(--paper)",
  letterSpacing: "-0.02em",
} as const;

const body = {
  fontSize: "var(--t-body)",
  color: "var(--dim)",
  lineHeight: 1.7,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "ko" ? "소개" : "About";
  const description =
    locale === "ko"
      ? "Greatripin이 무엇을, 왜, 어떻게 만드는지. 데이터 출처와 검수 방식."
      : "What Greatripin is, why it exists, and how the map data is sourced and checked.";
  return {
    title,
    description,
    alternates: {
      canonical: localePath("/about", locale),
      languages: { ko: "/about", en: "/en/about" },
    },
  };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const title = locale === "ko" ? "소개" : "About";

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <header className="flex flex-col gap-3 pb-1">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
            {m.common.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{title}</span>
        </nav>
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {title}
        </h1>
      </header>

      <div className="flex max-w-[64ch] flex-col gap-(--block)">
        {locale === "ko" ? (
          <>
            <section className="flex flex-col gap-3">
              <h2 style={h2}>무엇을 만드나요</h2>
              <p style={body}>
                Greatripin은 여행 유튜버(채널)를 고르면 그 사람이 영상에서 다녀간 맛집·명소가
                지도에 뜨는 웹 디렉터리입니다. 채널을 골랐을 때 세계 지도가 채워지고, 핀을 누르면
                그 장소가 나온 영상으로 이어집니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>왜 만드나요</h2>
              <p style={body}>
                신뢰의 기준을 저희가 아니라 이미 구독하고 계신 크리에이터에게 둡니다. 저희가 맛집을
                추천하는 게 아니라, &ldquo;이 채널이 실제로 다녀간 곳&rdquo;을 지도로 정리해서
                보여드립니다. 그래서 모든 핀은 예외 없이 출처 영상으로 끝납니다 — 지도가 원본
                시청을 대신하지 않고, 원본으로 돌려보냅니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>어떻게 만드나요</h2>
              <ul className="flex flex-col gap-2.5">
                {[
                  "채널의 공개 영상에서 장소 후보를 추출합니다.",
                  "자막 원문은 처리 과정에만 잠깐 쓰고 저장하지 않습니다 — 저희가 화면에 쓰는 요약은 항상 사람이 다시 확인하고 직접 작성합니다.",
                  "각 후보의 위치는 사람이 직접 지도에서 확인해 확정합니다. 같은 이름의 다른 지점과 헷갈릴 수 있는 곳은 지점이 특정되기 전까지 확정하지 않고 “위치 확인 중”으로 따로 둡니다.",
                  "확정된 장소만 지도에 강조 표시되고, 모든 장소에는 출처 영상 링크와 (있다면) 타임스탬프가 붙습니다.",
                ].map((line) => (
                  <li key={line} className="flex gap-2.5" style={body}>
                    <span aria-hidden style={{ color: "var(--wax)" }}>
                      ·
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>관계 고지</h2>
              <p style={body}>
                Greatripin은 공개된 영상 정보를 정리한 비공식 디렉터리이며, 다루는 어떤
                크리에이터·채널과도 제휴 관계가 없습니다. 콘텐츠를 어떤 원칙으로 정리하는지는{" "}
                <Link
                  href={localePath("/policy", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  콘텐츠 정책
                </Link>
                에, 정보가 틀렸거나 삭제를 원하시면{" "}
                <Link
                  href={localePath("/takedown", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  삭제 요청
                </Link>
                에 안내되어 있습니다.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 style={h2}>What this is</h2>
              <p style={body}>
                Greatripin is a web directory: pick a travel YouTuber (a channel), and the places
                they visited in their videos fill in on a map. Choosing a channel fills the world
                map, and tapping a pin takes you to the video the place came from.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>Why</h2>
              <p style={body}>
                Trust here comes from the creator you already subscribe to, not from our own
                curation. We are not recommending restaurants — we are mapping out places a
                specific channel actually visited. That is why every pin ends at a source video
                without exception: the map does not replace watching the original, it sends you
                back to it.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>How it&rsquo;s made</h2>
              <ul className="flex flex-col gap-2.5">
                {[
                  "Place candidates are extracted from a channel's public videos.",
                  "Raw captions are used only transiently for that extraction and are never stored — every summary shown on the site is written and checked by a person.",
                  "Each candidate's location is confirmed manually on a map. Where a name could match multiple branches, we don't confirm a pin until the specific branch is identified; until then it stays in a separate “location pending” state.",
                  "Only confirmed places are highlighted on the map, and every place links to its source video with a timestamp when available.",
                ].map((line) => (
                  <li key={line} className="flex gap-2.5" style={body}>
                    <span aria-hidden style={{ color: "var(--wax)" }}>
                      ·
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>Not affiliated</h2>
              <p style={body}>
                Greatripin is an unofficial directory built from publicly available video
                information. It is not affiliated with any creator or channel it covers. See our{" "}
                <Link
                  href={localePath("/policy", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  content policy
                </Link>{" "}
                for how content is put together, and{" "}
                <Link
                  href={localePath("/takedown", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  report an issue
                </Link>{" "}
                if something is wrong or you&rsquo;d like it removed.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
