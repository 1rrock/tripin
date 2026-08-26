import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCityDetail } from "@/shared/api/cities";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName } from "@/shared/i18n/display";
import type { Locale } from "@/shared/i18n/config";
import { localePath } from "@/shared/i18n/locale";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, placeList } from "@/shared/seo/json-ld";
import { placePath } from "@/shared/lib/place-path";
import { Icon } from "@/shared/ui/icons";
import { ShareButton } from "@/shared/ui/ShareButton";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { CityExplorer } from "./CityExplorer";
import { CITY_HEAD, toCityPlace } from "./list-payload";


/**
 * ⚠️ 여기서 `searchParams` 를 읽지 마라 — `map/page.tsx:14` 와 같은 규율이다.
 *    읽는 순간 이 페이지가 ISR 에서 빠져 **매 진입이 람다 SSR** 이 된다
 *    (실측 TTFB 20~35ms vs ISR 2~3ms). `?type=`·`?channel=` 은 이미 클라이언트인
 *    `CityExplorer` 가 하이드레이션 뒤에 읽어 그대로 건다.
 *
 * 존재 판정과 단일 채널 도시 리다이렉트는 `layout.tsx` 가 맡는다 — `loading.tsx`
 * 의 Suspense 경계 **위** 라야 상태 코드가 제대로 나간다(그 파일 주석).
 */
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

interface Params {
  lang: Locale;
  city: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang: locale, city } = await params;
  const data = await loadCityDetail(city);
  /* 여기까지 오는 일은 없다 — 존재 판정은 `layout.tsx` 가 경계 위에서 끝낸다.
     라우트마다 제각각이던 not-found 제목은 `m.notFound.metaTitle` 하나로 모았다. */
  if (!data) return { title: getDictionary(locale).notFound.metaTitle };
  const cityLabel = displayCityName({ name: data.name, nameEn: data.nameEn }, locale);
  /* 스니펫은 앞에서 잘린다 — 검색어가 되는 **상호명**을 먼저 세운다.
     채널명은 전부 나열하지 않는다: 도쿄에 4채널이면 로마자까지 붙어
     스니펫 절반을 이름 목록이 먹고 상호명이 잘려 나갔다. "곽튜브 도쿄" 질의는
     조각 페이지(`/c/[creator]/[city]`)가 받는 게 이 사이트의 구조다. */
  const names = data.places
    .slice(0, 3)
    .map((p) => p.name)
    .join(", ");
  const shown = data.creators.slice(0, 2).map((c) => c.displayName).join(", ");
  const rest = data.creators.length - 2;
  const who = rest > 0 ? `${shown} 외 ${rest}명` : shown;
  const whoEn = rest > 0 ? `${shown} and ${rest} more` : shown;
  const title =
    locale === "en"
      ? `${cityLabel} — YouTuber places map (${data.places.length})`
      : `${data.name} 여행 유튜버 맛집 지도 — ${data.places.length}곳`;
  const description =
    locale === "en"
      ? `${data.places.length} places in ${cityLabel} from travel videos — ${names} and more. Featured by ${whoEn}. Every pin links to its source video.`
      : /* 조사 폴백 「이(가)」 금지 — 스니펫에 그대로 나간다. 이 페이지의 질의는
           "도쿄 맛집" 쪽이라 도시명을 앞에 세우고, 채널은 「의」로 붙인다. */
        `${data.name} 맛집·명소 ${data.places.length}곳 — ${names} 등. ${who}의 영상에 나온 장소마다 출처 영상과 지도 링크가 있습니다.`;
  return publicMeta({
    locale,
    title,
    description,
    bare: `/city/${data.slug}`,
  });
}

export default async function CityPage({ params }: { params: Promise<Params> }) {
  const { lang: locale, city } = await params;
  const m = getDictionary(locale);
  const data = await loadCityDetail(city);
  /* 존재 판정·단일 채널 리다이렉트는 layout 이 이미 끝냈다. 남긴 건 타입 좁히기용. */
  if (!data) notFound();

  const cityLabel = displayCityName({ name: data.name, nameEn: data.nameEn }, locale);

  /* 목록·핀에 필요한 것만 넘긴다 — 요약·출처·지도링크는 드로어가 열릴 때
     `/api/map/place/[id]` 로 받는다(CityExplorer `CityPlace` 주석). 예전에는 여기서
     전부 넘겨서 후쿠오카 561곳이 HTML 3.1MB 였다.

     **그리고 이제는 그 최소 형태조차 전부 싣지 않는다.** 필드를 줄인 뒤에도 573곳이
     HTML 마크업 한 벌 + RSC 플라이트 한 벌로 두 번 실려 gzip 188KB(원본 1.26MB)였다.
     이 수치는 확정 장소가 늘수록 정비례로 자란다. `/map` 이 씨앗 6곳으로 푼 것과
     같은 처방으로, 문서에는 앞줄 `CITY_HEAD` 곳만 남기고 나머지는 캔버스가
     마운트 뒤 `/api/city/[city]/places` 로 받아 이어붙인다.

     로케일 문제도 같이 사라진다 — 넘기는 값에 요약이 없으니 EN 페이지 HTML 에
     한국어 원문이 샐 자리가 없다(예전에 실제로 걸렸던 검증 항목이다). 상세 라우트는
     `?l=` 로 로케일을 따로 받는다. */
  const headPlaces = data.places.slice(0, CITY_HEAD).map(toCityPlace);

  /* 종류 칩은 **전체** 기준으로 서버가 미리 세어 넘긴다. 앞줄 36곳에서 뽑으면
     꼬리가 도착할 때 칩 줄이 늘어나 필터가 튄다 — 무엇을 몇 개 그리느냐만
     바꾸는 게 이 작업의 규율이라, 필터의 모양은 자르기 전과 같아야 한다. */
  const presentTypes = FILTERABLE_TYPES.filter((pt) =>
    data.places.some((p) => p.placeType === pt),
  );

  const listName =
    locale === "en"
      ? `Places in ${cityLabel}`
      : `${cityLabel}에 간 곳`;

  return (
    <main>
      <JsonLd
        data={[
          breadcrumbList([
            { name: m.cityDetail.home, url: absoluteUrl("/", locale) },
            { name: m.nav.map, url: absoluteUrl("/map", locale) },
            { name: cityLabel, url: absoluteUrl(`/city/${data.slug}`, locale) },
          ]),
          /* ⚠️ 문서에 그린 **앞줄과 같은 목록**이어야 한다. 문서에 없는 장소를
             구조화 데이터로 광고하면 크롤러가 보는 것과 신호가 엇갈린다.
             꼬리로 가는 길은 따로 있다 — 사이트맵이 `/place/[slug]` 를 전부 싣고,
             이 화면 아래 채널 칩이 `/c/[creator]/[city]` 조각으로 이어진다. */
          placeList(
            listName,
            headPlaces.map((p) => ({
              name: p.name,
              address: p.address,
              lat: p.lat,
              lng: p.lng,
              /* 낱개 장소 페이지가 생기기 전에는 `#슬러그` 앵커였다. 이제 각 장소가
                 실재하는 문서라 그쪽을 가리킨다 — 검색엔진이 항목을 독립 문서로 따라간다. */
              url: absoluteUrl(placePath(p.slug), locale),
            })),
          ),
        ]}
      />
      {/* 브레드크럼은 데스크톱에도 세운다 — 검색 유입이 위로 올라갈 길.
          제목·통계는 모바일 전용(데스크톱 h1 은 CityExplorer 가 그린다). */}
      <header className="flex flex-col gap-3 px-(--gutter) pt-4 pb-1 lg:pb-0">
        {/* 아래 h1·통계 줄과 같은 `lg:hidden` 이다 — 빠져 있었다.
            ≥1024 에서 `.canvas-page` 가 `position:fixed inset-0 z-10` 로 뷰포트를
            통째로 덮으므로(globals.css) 이 빵부스러기는 **안 보이는데 탭 순서에는
            남아** 있었다. 실측: 1440 에서 이 두 링크의 `elementFromPoint` 가 둘 다
            캔버스를 돌려줬다 — 키보드 사용자는 보이지 않는 링크로 포커스가 간다.
            구조화 빵부스러기(`breadcrumbList` JSON-LD)는 위에서 따로 싣고 있고,
            모바일 우선 색인이라 크롤러가 보는 폭에서는 그대로 보인다. */}
        <nav
          className="index flex items-center gap-1.5 lg:hidden"
          style={{ color: "var(--dim)" }}
        >
          <Link
            href={localePath("/", locale)}
            className="underline-offset-4 hover:underline"
          >
            {m.cityDetail.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <Link
            href={localePath("/map", locale)}
            className="underline-offset-4 hover:underline"
          >
            {m.nav.map}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{cityLabel}</span>
        </nav>

        <div className="flex items-start gap-2 lg:hidden">
          <h1
            className="min-w-0 flex-1 font-black"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
          >
            {t(m.cityDetail.creatorsTitle, { city: cityLabel })}
          </h1>
          <ShareButton title={cityLabel} bare className="mt-0.5" />
        </div>

        <p className="index tnum lg:hidden" style={{ color: "var(--dim)" }}>
          {t(m.cityDetail.stats, {
            creators: data.creators.length,
            places: data.places.length,
          })}
        </p>
      </header>

      <CityExplorer
        cityName={cityLabel}
        citySlug={data.slug}
        places={headPlaces}
        total={data.places.length}
        presentTypes={presentTypes}
        creators={data.creators}
      />
    </main>
  );
}
