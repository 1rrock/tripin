import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import type { Locale } from "@/shared/i18n/config";
import { displayCityName, displayIntro } from "@/shared/i18n/display";
import { Chip } from "@/shared/ui/frame"
import { Icon } from "@/shared/ui/icons";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, placeList } from "@/shared/seo/json-ld";
import { placePath } from "@/shared/lib/place-path";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { Explorer, type RelatedPiece } from "./Explorer";
import { loadPiece, toPublicPlace, PIECE_HEAD, type PageParams } from "./loader";

/**
 * ★ 채널×도시 — 이 서비스의 핵심 페이지 (CONCEPT.md 4.3).
 * 로더는 `loader.ts` — layout(존재 판정)·page·generateMetadata 셋이 나눠 쓴다.
 *
 * ⚠️ 여기서 `searchParams` 를 읽지 마라 — `map/page.tsx:14` 와 같은 규율이다.
 *    읽는 순간 이 페이지가 ISR 에서 빠져 **매 진입이 람다 SSR** 이 된다
 *    (실측 TTFB 20~35ms vs ISR 2~3ms). 종류 필터는 이미 클라이언트인 `Explorer`
 *    가 하이드레이션 뒤 `?type=` 을 읽어 그대로 건다.
 *
 * 존재 판정은 `layout.tsx` 가 맡는다 — `loading.tsx` 의 Suspense 경계 **위** 라야
 * 404 가 제대로 나간다(그 파일 주석).
 */

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams & { lang: Locale }>;
}): Promise<Metadata> {
  const { lang: locale, ...routeParams } = await params;
  const data = await loadPiece(routeParams);
  /* 여기까지 오는 일은 없다 — 존재 판정은 `layout.tsx` 가 경계 위에서 끝낸다.
     라우트마다 제각각이던 not-found 제목은 `m.notFound.metaTitle` 하나로 모았다. */
  if (!data) return { title: getDictionary(locale).notFound.metaTitle };
  const confirmed = data.places.filter((p) => p.mapStatus === "confirmed");
  const topNames = confirmed.slice(0, 3).map((p) => p.name).join(", ");
  const bare = `/c/${routeParams.creator}/${routeParams.city}`;
  const cityName = displayCityName({ name: data.city.name, nameEn: data.city.name_en }, locale);
  const title =
    locale === "en"
      ? `${cityName} by ${data.creator.display_name} — places map (${confirmed.length})`
      : `${data.creator.display_name} ${cityName} 맛집·간 곳 지도 (${confirmed.length}곳)`;
  const description =
    locale === "en"
      ? `${confirmed.length} places ${data.creator.display_name} visited in ${cityName} — ${topNames}. Every place links back to its source video.`
      : /* 「이(가)」를 쓰지 않는다 — 채널명은 받침이 있을 수도(곽튜브) 없을 수도
           (비밀이야 bimirya) 있고, 폴백 표기는 검색 결과 스니펫에 그대로 노출된다.
           「의」는 받침과 무관하게 항상 맞고, 이 페이지 h1 의 어법과도 같다. */
        `${data.creator.display_name}의 ${cityName} 맛집·간 곳 ${confirmed.length}곳: ${topNames}. 모든 장소에 출처 영상 링크 포함.`;
  return publicMeta({
    locale,
    title,
    description,
    bare,
    // 공개 게이트 — 미달 조각은 직접 링크로만 열리고 검색에는 노출하지 않는다
    ...(confirmed.length < MIN_CONFIRMED_PINS
      ? { robots: { index: false, follow: false } }
      : {}),
  });
}

/** 브레드크럼 구분자 — Explorer 와 같은 획. */
function CrumbIcon() {
  return <Icon.chevron className="mx-1 inline size-2.5" />;
}

/**
 * 준비 중 화면 — 확정 핀이 아직 0개인 조각.
 * 404 가 아니라 200 + noindex: 직접 링크(운영자 미리보기)는 살리고 검색에서만 뺀다.
 */
function PendingPiece({
  creatorName,
  cityName,
  confirmedCount,
  locale,
}: {
  creatorName: string;
  cityName: string;
  confirmedCount: number;
  locale: Locale;
}) {
  const m = getDictionary(locale);
  return (
    <main className="flex flex-col gap-4 px-(--gutter) pt-4">
      <nav className="index flex items-center" style={{ color: "var(--dim)" }}>
        <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
          {m.common.home}
        </Link>
        <CrumbIcon />
        <span>{creatorName}</span>
        <CrumbIcon />
        <span style={{ color: "var(--paper)" }}>{cityName}</span>
      </nav>
      <h1
        className="font-black"
        style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
      >
        {t(m.piece.title, { creator: creatorName, city: cityName })}
      </h1>
      <p style={{ fontSize: "var(--t-body)", color: "var(--dim)", lineHeight: 1.7 }}>
        {m.piece.emptyAll}
      </p>
      <p className="index tnum" style={{ color: "var(--dim)" }}>
        {t(m.piece.statsConfirmed, { n: confirmedCount })}
        {locale === "en"
          ? ` · published from ${MIN_CONFIRMED_PINS}`
          : ` · 공개 기준 ${MIN_CONFIRMED_PINS}곳 이상`}
      </p>
      <div>
        <Chip href={localePath("/", locale)}>
          {locale === "en" ? "Browse published pieces" : "공개된 조각 보기"}
        </Chip>
      </div>
    </main>
  );
}

export default async function CreatorCityPage({
  params,
}: {
  params: Promise<PageParams & { lang: Locale }>;
}) {
  const { lang: locale, ...routeParams } = await params;
  const data = await loadPiece(routeParams);
  /* 존재 판정은 layout 이 이미 끝냈다. 남긴 건 타입 좁히기용. */
  if (!data) notFound();
  const cityName = displayCityName({ name: data.city.name, nameEn: data.city.name_en }, locale);

  // 공개 게이트 — 확정 핀 미달 조각은 Explorer 대신 준비 중 화면 (404 아님)
  const confirmedCount = data.places.filter((p) => p.mapStatus === "confirmed").length;
  if (confirmedCount < MIN_CONFIRMED_PINS) {
    return (
      <PendingPiece
        creatorName={data.creator.display_name}
        cityName={cityName}
        confirmedCount={confirmedCount}
        locale={locale}
      />
    );
  }

  /* 목록·핀에 필요한 것만 넘긴다 — 요약·지도ID·영상 제목은 드로어가 열릴 때
     `/api/map/place/[id]` 로 받는다(Explorer `PublicPlace` 주석). 예전에는 여기서
     전부 넘겨서 후쿠오카 아저씨×후쿠오카 535곳이 HTML 3.2MB 였다.

     **그리고 이제는 그 최소 형태조차 전부 싣지 않는다.** 필드를 줄인 뒤에도 296곳이
     HTML 마크업 한 벌 + RSC 플라이트 한 벌로 두 번 실려 gzip 105KB(원본 866KB)였고,
     그 수치는 확정 장소가 늘수록 정비례로 자란다. `/map` 이 씨앗 6곳으로 푼 것과
     같은 처방으로, 문서에는 앞줄 `PIECE_HEAD` 곳만 남기고 나머지는 Explorer 가
     마운트 뒤 `/api/city/[city]/c/[creator]` 로 받아 이어붙인다.

     ⚠️ 여기를 되돌리면 DOM 이 아니라 **RSC 페이로드**가 다시 부푼다. `.map()` 을
     거치면 초과 속성 검사가 안 걸려서 tsc 가 잡아 주지 않는다 — 필드를 늘리기 전에
     535를 곱해 보고, 정말 목록·핀·필터에 필요한지 따져라.

     로케일 문제도 같이 사라진다 — 넘기는 값에 요약이 없으니 EN 페이지 HTML 에
     한국어 원문이 샐 자리가 없다(예전에 실제로 걸렸던 검증 항목이다). */
  const headPlaces = data.places.slice(0, PIECE_HEAD).map(toPublicPlace);

  /* 통계 줄과 종류 칩은 **전체** 기준으로 서버가 미리 센다. 앞줄 36곳에서 뽑으면
     꼬리가 도착할 때 숫자가 뛰고 칩 줄이 늘어난다 — 무엇을 몇 개 그리느냐만
     바꾸는 게 이 작업의 규율이라, 통계·필터의 모양은 자르기 전과 같아야 한다. */
  const totalConfirmed = confirmedCount;
  const totalCandidates = data.places.filter((p) => p.mapStatus === "candidate").length;
  const presentTypes = FILTERABLE_TYPES.filter((pt) =>
    data.places.some((p) => p.placeType === pt),
  );

  const m = getDictionary(locale);
  const bare = `/c/${routeParams.creator}/${routeParams.city}`;
  /* ⚠️ 문서에 그린 **앞줄과 같은 목록**이어야 한다. 문서에 없는 장소를 구조화
     데이터로 광고하면 크롤러가 보는 것과 신호가 엇갈린다. 꼬리로 가는 길은 따로
     있다 — 사이트맵이 `/place/[slug]` 를 전부 싣고, 이 화면 아래 칩이
     `/city/[city]` 전체 지도와 다른 조각으로 이어진다. */
  const confirmedPlaces = headPlaces.filter((p) => p.mapStatus === "confirmed");
  const listName =
    locale === "en"
      ? `${cityName} by ${data.creator.display_name}`
      : `${data.creator.display_name}의 ${cityName}`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbList([
            { name: m.common.home, url: absoluteUrl("/", locale) },
            {
              name: data.creator.display_name,
              url: absoluteUrl(`/c/${routeParams.creator}`, locale),
            },
            { name: cityName, url: absoluteUrl(bare, locale) },
          ]),
          placeList(
            listName,
            confirmedPlaces.map((p) => ({
              name: p.name,
              address: p.address,
              lat: p.lat,
              lng: p.lng,
              /* 낱개 장소 페이지가 생기기 전에는 이 목록의 항목이 `#슬러그` 앵커를
                 가리켰다. 이제 각 장소가 실재하는 문서라 그쪽을 가리킨다 —
                 ItemList 가 프래그먼트가 아니라 URL 을 주면 검색엔진이 항목을
                 독립 문서로 따라간다. */
              url: absoluteUrl(placePath(p.slug), locale),
            })),
          ),
        ]}
      />
      <Explorer
        creatorName={data.creator.display_name}
        accentColor={data.creator.accent_color}
        cityName={cityName}
        introText={displayIntro(data, locale)}
        places={headPlaces}
        total={data.places.length}
        totalConfirmed={totalConfirmed}
        totalCandidates={totalCandidates}
        presentTypes={presentTypes}
        basePath={bare}
        otherCities={data.otherCities.map(
          (c): RelatedPiece => ({
            slug: c.slug,
            name: displayCityName(c, locale),
            count: c.count,
          }),
        )}
        otherCreators={data.otherCreators}
      />
    </>
  );
}
