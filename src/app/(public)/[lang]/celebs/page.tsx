import type { Metadata } from "next";
import Link from "next/link";
import { loadHomeFeed, type FeedCelebritySpot } from "@/shared/api/home";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import { displayCityName } from "@/shared/i18n/display";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, linkList } from "@/shared/seo/json-ld";
import { Frame, Index } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

/**
 * 연예인 장소 인덱스 — 홈 커버스토리의 "더 보기"가 여기로 온다.
 *
 * 인물별 그룹이 뼈대다. 이 페이지가 답하는 질문이 "성시경이 간 데 또 어디?"
 * 라서, 도시·최신순으로 섞으면 질문과 어긋난다. 인물 순서는 홈과 같은
 * 라운드로빈 기준(각자의 최신 스팟) — 홈에서 넘어온 사람이 같은 순서를 만난다.
 *
 * 🔴 지도를 얹지 않는다(/channels 와 같은 이유). 지도는 /map 의 것.
 */

export const revalidate = 3600;

/** 인물별 그룹 — 등장 순서(라운드로빈)를 보존한다 */
function groupByPerson(spots: FeedCelebritySpot[]) {
  const groups = new Map<string, FeedCelebritySpot[]>();
  for (const s of spots) {
    const list = groups.get(s.personName);
    if (list) list.push(s);
    else groups.set(s.personName, [s]);
  }
  return [...groups.entries()];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  const { celebritySpots } = await loadHomeFeed();
  const groups = groupByPerson(celebritySpots);
  const names = groups
    .slice(0, 3)
    .map(([person]) => person)
    .join(", ");
  const description =
    locale === "en"
      ? `${celebritySpots.length} places visited by ${names} and other celebrities — each confirmed from the source video and mapped.`
      : `${names} 등 연예인이 다녀간 맛집·명소 ${celebritySpots.length}곳 — 전부 출처 영상으로 확인해 지도에 올렸습니다.`;
  return publicMeta({
    locale,
    title: m.celebs.title,
    description,
    bare: "/celebs",
  });
}

export default async function CelebsPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  const { celebritySpots } = await loadHomeFeed();
  const href = (path: string) => localePath(path, locale);
  const groups = groupByPerson(celebritySpots);
  const person = (s: FeedCelebritySpot) =>
    locale === "ko" ? s.personName : (s.personNameEn ?? s.personName);

  if (groups.length === 0) {
    return (
      <main className="px-(--gutter) pt-6 pb-12">
        <h1 className="text-2xl font-black tracking-[-0.04em]">{m.celebs.heading}</h1>
        <p className="mt-3 text-[15px] text-(--dim)">{m.celebs.empty}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg pb-14 lg:max-w-5xl">
      <JsonLd
        data={breadcrumbList([
          { name: "tripin", url: absoluteUrl("/", locale) },
          { name: m.celebs.title, url: absoluteUrl("/celebs", locale) },
        ])}
      />
      <JsonLd
        data={linkList(
          m.celebs.srHeading,
          celebritySpots.map((s) => ({
            name: s.placeName,
            url: absoluteUrl(`/place/${s.placeSlug}`, locale),
          })),
        )}
      />
      <h1 className="sr-only">{m.celebs.srHeading}</h1>
      <header className="px-(--gutter) pt-6">
        <p
          aria-hidden
          className="text-[28px] leading-[1.12] font-black tracking-[-0.045em] lg:text-[36px]"
        >
          {m.celebs.heading}
        </p>
        <p className="mt-2 text-[14px] text-(--dim)">
          {t(m.celebs.intro, { people: groups.length, n: celebritySpots.length })}
        </p>
      </header>

      {/* 인물 앵커 칩 — 추성훈 42곳 같은 긴 그룹을 스크롤로 지나지 않고 건너뛴다 */}
      <nav
        aria-label={m.celebs.title}
        className="no-scrollbar sticky top-0 z-10 mt-4 flex gap-1.5 overflow-x-auto bg-(--ground) px-(--gutter) py-2.5"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        {groups.map(([personName, spots]) => (
          <a
            key={personName}
            href={`#p-${personName}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium"
            style={{
              background: "var(--ground)",
              color: "#383838",
              boxShadow: "inset 0 0 0 1px var(--hairline)",
            }}
          >
            {person(spots[0])} <span style={{ color: "var(--dim)" }}>{spots.length}</span>
          </a>
        ))}
      </nav>

      {groups.map(([personName, spots]) => (
        <section
          key={personName}
          id={`p-${personName}`}
          aria-label={personName}
          className="scroll-mt-14 pt-9"
        >
          <div className="flex items-baseline gap-2.5 px-(--gutter)">
            <span aria-hidden className="h-[3px] w-[18px] self-center" style={{ background: "var(--wax)" }} />
            <h2 className="text-xl font-bold tracking-[-0.03em]">{person(spots[0])}</h2>
            <Index>{t(m.home.placesUnit, { n: spots.length })}</Index>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 px-(--gutter) lg:grid-cols-4">
            {spots.map((s) => (
              <li key={s.placeSlug} className="min-w-0">
                <Link href={href(`/place/${s.placeSlug}`)} className="block active:scale-[0.99]">
                  <Frame className="block w-full">
                    <Thumb youtubeId={s.cut.youtubeId} alt={s.cut.title} />
                  </Frame>
                  <p className="mt-2 truncate text-[14px] font-semibold tracking-[-0.01em]">
                    {s.placeName}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-(--dim)">
                    {displayCityName(s.city, locale)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
