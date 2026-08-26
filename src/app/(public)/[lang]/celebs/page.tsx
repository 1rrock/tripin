import type { Metadata } from "next";
import Link from "next/link";
import { loadHomeFeed, type FeedCelebritySpot } from "@/shared/api/home";
import { celebAnchor } from "@/shared/api/celebs";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import { placePath } from "@/shared/lib/place-path";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, linkList } from "@/shared/seo/json-ld";
import { Chip, Frame, Index } from "@/shared/ui/frame";
import { EmptyState } from "@/shared/ui/EmptyState";
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
  /* 장소명은 앱의 나머지 화면과 같은 규칙으로 고른다 — 원본 `name` 을 그대로
     그리면 `/en/celebs` 만 한글 상호를, 같은 장소의 `/en/place/…` 는 현지어를
     보여 같은 장소가 화면마다 다른 이름으로 뜬다. */
  const place = (s: FeedCelebritySpot) =>
    displayPlaceName(
      { name: s.placeName, nameLocal: s.placeNameLocal, nameEn: s.placeNameEn },
      locale,
    );

  if (groups.length === 0) {
    return (
      <main className="px-(--gutter) pt-6 pb-12">
        <h1 className="text-2xl font-black tracking-[-0.04em]">{m.celebs.heading}</h1>
        {/* 예전엔 문장 하나로 끝나는 막다른 화면이었다 — `EmptyState.tsx:6` 이
            스스로 금지한 그것이다. 여기가 비어도 지도에는 장소가 있으므로
            다음 행동은 지도다(채널·홈과 달리 확실히 채워져 있는 곳).
            문구는 `saved.emptyCta`("지도 열기")를 빌려 쓴다 — i18n 은 다른
            소유자라 키를 새로 만들지 않았다. */}
        <EmptyState message={m.celebs.empty} className="pt-8 pb-4">
          <Chip size="md" href={localePath("/map", locale)}>
            {m.saved.emptyCta}
          </Chip>
        </EmptyState>
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
      {/* ⚠️ `url` 은 반드시 placePath() 를 거친다. 확정 slug 는 대부분 한글이라
          날것으로 내보내면 이 ItemList 만 인코딩 안 된 주소를 광고해, 같은 문서를
          canonical·사이트맵과 다른 두 주소로 알리게 된다(place-path.ts 주석). */}
      <JsonLd
        data={linkList(
          m.celebs.srHeading,
          celebritySpots.map((s) => ({
            name: place(s),
            url: absoluteUrl(placePath(s.placeSlug), locale),
          })),
        )}
      />
      <header className="px-(--gutter) pt-6">
        {/* 보이는 제목이 곧 h1 이다 — 예전엔 이 줄이 `<p aria-hidden>` 이고 위에
            sr 전용 h1 이 따로 있어, 보조기기가 화면과 다른 문구를 들었다. */}
        <h1 className="text-[28px] leading-[1.12] font-black tracking-[-0.045em] lg:text-[36px]">
          {m.celebs.heading}
        </h1>
        <p className="mt-2 text-[14px] text-(--dim)">
          {t(m.celebs.intro, { people: groups.length, n: celebritySpots.length })}
        </p>
      </header>

      {/* 인물 앵커 칩 — 추성훈 42곳 같은 긴 그룹을 스크롤로 지나지 않고 건너뛴다.
          규격은 손으로 적지 않는다(globals.css `.chip`) — 여기 있던 사본은
          계산 높이만 28px 로 같았을 뿐 한 벌이 더 있던 것이다.
          `active` 는 안 쓴다: 페이지 안 앵커라 "지금 이 인물"을 알려면
          스크롤 스파이(클라이언트)가 필요한데, 이 화면은 서버 컴포넌트고
          그건 규격 통일이 아니라 새 동작이다. */}
      <nav
        aria-label={m.celebs.title}
        /* `top-0` 이 아니라 헤더 높이만큼 내려온다 — 사이트 헤더도 `sticky top-0`
           이고 z-30 이라, 둘 다 0 에 붙으면 이 줄(z-10, 49px)이 63px 짜리 헤더
           밑으로 통째로 사라진다(실측 확인). ≥1024 에서는 토큰이 0 이다. */
        className="no-scrollbar sticky top-(--site-header-h) z-10 mt-4 flex gap-1.5 overflow-x-auto bg-(--ground) px-(--gutter) py-2.5"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        {groups.map(([personName, spots]) => (
          <Chip key={personName} href={`#${celebAnchor(personName)}`}>
            {person(spots[0])} <span style={{ color: "var(--dim)" }}>{spots.length}</span>
          </Chip>
        ))}
      </nav>

      {groups.map(([personName, spots]) => (
        <section
          key={personName}
          id={celebAnchor(personName)}
          /* 그룹 키는 한글 원문이지만 보조기기가 듣는 이름은 화면과 같아야 한다 */
          aria-label={person(spots[0])}
          /* 앵커로 뛰었을 때 제목이 헤더(63) + 이 앵커 줄(49) 밑에 안 깔리게.
             `scroll-mt-14`(56px)는 헤더 하나도 못 비켰다. */
          className="pt-9"
          style={{ scrollMarginTop: "calc(var(--site-header-h) + 3.0625rem)" }}
        >
          <div className="flex items-baseline gap-2.5 px-(--gutter)">
            {/* 킥커 바는 중성이다 — 인물이 열 명이면 산호 바가 열 개고, 그러면
                산호는 더 이상 "여기를 보라"가 아니다(홈 Head 와 같은 규칙). */}
            <span aria-hidden className="h-[3px] w-[18px] self-center" style={{ background: "var(--paper)" }} />
            <h2 className="text-xl font-bold tracking-[-0.03em]">{person(spots[0])}</h2>
            <Index>{t(m.home.placesUnit, { n: spots.length })}</Index>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 px-(--gutter) lg:grid-cols-4">
            {spots.map((s) => (
              <li key={s.placeSlug} className="min-w-0">
                <Link href={href(placePath(s.placeSlug))} className="block active:scale-[0.99]">
                  <Frame className="block w-full">
                    <Thumb youtubeId={s.cut.youtubeId} alt={s.cut.title} />
                  </Frame>
                  <p className="mt-2 truncate text-[14px] font-semibold tracking-[-0.01em]">
                    {place(s)}
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
