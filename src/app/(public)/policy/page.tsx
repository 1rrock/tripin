import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { publicMeta } from "@/shared/seo/page-meta";
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
  const title = locale === "ko" ? "콘텐츠 정책" : "Content policy";
  const description =
    locale === "ko"
      ? "Eatripin이 영상 정보를 다루는 원칙 — 자막 원문 미보관, 출처 표기, 무변형 원칙."
      : "How Eatripin handles video-derived information — no raw captions, sourcing, unmodified media.";
  return publicMeta({ locale, title, description, bare: "/policy" });
}

export default async function PolicyPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const title = locale === "ko" ? "콘텐츠 정책" : "Content policy";

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
              <h2 style={h2}>자막은 저장하지 않습니다</h2>
              <p style={body}>
                장소 후보를 찾는 과정에서 영상 자막을 잠깐 처리하지만, 자막 원문을 데이터베이스에
                저장하거나 그대로 게시하지 않습니다. 화면에 보이는 요약은 그 처리 결과를 참고해{" "}
                <strong className="font-bold" style={{ color: "var(--paper)" }}>
                  사람이 직접
                </strong>{" "}
                다시 쓴 글입니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>모든 장소에는 출처가 있습니다</h2>
              <p style={body}>
                예외 없이 모든 장소에 그 정보가 나온 영상 링크가 붙습니다. 영상 속 해당 구간을 알 수
                있는 경우 타임스탬프도 함께 표기합니다. 출처가 없는 장소는 만들지 않습니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>영상 제목·썸네일은 원본 그대로</h2>
              <p style={body}>
                영상 제목과 썸네일은 요약하거나 다듬지 않고 YouTube에 등록된 원본 그대로 보여드립니다.
                모든 장소 화면에는 원본 영상으로 돌아가는 링크가 항상 노출되며, 이를 가리거나
                없애지 않습니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>표시·집계하지 않는 것</h2>
              <p style={body}>
                조회수·구독자 수·좋아요 수는 어떤 형태로도 저장·표시·집계하지 않습니다. 여기 보이는
                숫자(간 곳·도시·채널 수)는 전부 저희가 직접 확정한 장소를 센 것이지, 유튜브 지표를
                모은 것이 아닙니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>서술 원칙</h2>
              <p style={body}>
                장소 요약은 영상에서 확인된 사실만 짧게 적습니다. 대사를 그대로 옮기지 않고, 저희가
                가보지 않은 곳에 대한 평가나 별점을 매기지 않습니다. 가격·대기 시간 같은 실용
                정보는 영상 촬영 시점 기준이며 실제와 다를 수 있습니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>동명이점 처리</h2>
              <p style={body}>
                이름이 같은 지점이 여러 곳일 수 있는 장소는 영상 속 정보(간판·지역 언급 등)로
                지점까지 특정되기 전까지 지도에 확정 표시하지 않습니다. 이런 곳은 &ldquo;위치 확인
                중&rdquo;으로 따로 모아 둡니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>정정·삭제</h2>
              <p style={body}>
                정보가 틀렸거나 삭제를 원하시면{" "}
                <Link
                  href={localePath("/takedown", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  삭제 요청
                </Link>
                으로 접수해 주세요. 접수된 건은 검토가 끝날 때까지 우선 비공개 처리합니다.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 style={h2}>We don&rsquo;t keep raw captions</h2>
              <p style={body}>
                Captions are processed briefly while extracting place candidates, but the raw text
                is never stored in our database or published as-is. The summary shown on the site
                is written by a{" "}
                <strong className="font-bold" style={{ color: "var(--paper)" }}>
                  person
                </strong>{" "}
                who reviews that output and rewrites it.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>Every place has a source</h2>
              <p style={body}>
                Without exception, every place links to the video it came from, with a timestamp
                when we can point to the exact moment. We don&rsquo;t publish a place without a
                source.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>Titles and thumbnails stay unmodified</h2>
              <p style={body}>
                Video titles and thumbnails are shown exactly as registered on YouTube — never
                summarized or altered. Every place page keeps a visible link back to the original
                video; we never hide or remove it.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>What we don&rsquo;t show or aggregate</h2>
              <p style={body}>
                View counts, subscriber counts, and like counts are never stored, shown, or
                aggregated in any form. The numbers you see here (places, cities, channels) are
                counts of places we confirmed ourselves, not YouTube metrics.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>How we write summaries</h2>
              <p style={body}>
                Place summaries are short, factual notes confirmed from the video — never a
                transcript of dialogue, and never a rating or opinion about a place we haven&rsquo;t
                visited ourselves. Prices, wait times, and similar details are as of filming and
                may no longer be accurate.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>Same-name locations</h2>
              <p style={body}>
                For places with multiple branches sharing a name, we don&rsquo;t confirm a pin until
                the specific branch is identified from what&rsquo;s visible or said in the video. Until
                then, it stays in a separate &ldquo;location pending&rdquo; group.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>Corrections and removal</h2>
              <p style={body}>
                If something is wrong or you&rsquo;d like a place removed, please{" "}
                <Link
                  href={localePath("/takedown", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  file a request
                </Link>
                . Reported items are taken down first, then reviewed.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
