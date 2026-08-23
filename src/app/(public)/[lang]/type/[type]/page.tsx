import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTypeDetail, parsePlaceType } from "@/shared/api/place-types";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import type { Locale } from "@/shared/i18n/config";
import { localePath } from "@/shared/i18n/locale";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, placeList } from "@/shared/seo/json-ld";
import { Icon } from "@/shared/ui/icons";
import { TypeCityGroupSection } from "./TypeCityGroup";
import { TypeMoreCities } from "./TypeMoreCities";
import { VISIBLE_CITY_GROUPS, toTypeListGroup, type TypeRestCity } from "./list-payload";

/**
 * ⚠️ 여기서 `searchParams` 를 읽지 마라 — `map/page.tsx:14` 와 같은 규율이다.
 *    읽는 순간 이 페이지가 ISR 에서 빠져 **매 진입이 람다 SSR** 이 된다.
 */
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

interface Params {
  lang: Locale;
  type: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang: locale, type: typeParam } = await params;
  const m = getDictionary(locale);
  const type = parsePlaceType(typeParam);
  /* 여기까지 오는 일은 없다 — 존재 판정은 `layout.tsx` 가 경계 위에서 끝낸다.
     라우트마다 제각각이던 not-found 제목은 `m.notFound.metaTitle` 하나로 모았다. */
  if (!type) return { title: m.notFound.metaTitle };
  const data = await loadTypeDetail(type);
  if (!data) return { title: m.notFound.metaTitle };
  const label = m.placeTypes[type];
  const cities = data.groups
    .slice(0, 4)
    .map((g) => displayCityName({ name: g.cityName, nameEn: g.cityNameEn }, locale))
    .join(", ");
  return publicMeta({
    locale,
    title:
      locale === "en"
        ? `${label} from travel YouTubers — ${data.placeCount} places`
        : `여행 유튜버 ${label} ${data.placeCount}곳 — ${cities}`,
    description:
      locale === "en"
        ? `${data.placeCount} ${label.toLowerCase()} places across ${data.cityCount} cities, each with a source video.`
        : `여행 유튜버가 다녀간 ${label} ${data.placeCount}곳 (${data.cityCount}개 도시). 각 장소마다 출처 영상과 지도 링크가 있습니다.`,
    bare: `/type/${type}`,
  });
}

export default async function TypeDetailPage({ params }: { params: Promise<Params> }) {
  const { lang: locale, type: typeParam } = await params;
  const m = getDictionary(locale);
  /* 존재 판정은 layout 이 이미 끝냈다. 남긴 건 타입 좁히기용. */
  const type = parsePlaceType(typeParam);
  if (!type) notFound();
  const data = await loadTypeDetail(type);
  if (!data) notFound();

  const label = m.placeTypes[type];

  /* 문서에 행으로 그리는 건 앞 3개 도시뿐이다(`VISIBLE_CITY_GROUPS`).
     예전에는 도시당 12곳 상한(`VISIBLE_PER_CITY`)만 있고 **그룹 수에는 상한이
     없어서** 도시 46곳 × 12 = 552행이 HTML 마크업 한 벌 + RSC 플라이트 한 벌로
     두 번 실렸다 — gzip 244KB(원본 1.91MB). 캡이 있는데 아무것도 안 자르고 있었다.
     남은 도시는 아래 `TypeMoreCities` 가 실링크 칩으로 전부 문서에 남기고,
     행은 "더 보기"가 `/api/type/[type]/groups` 로 받아 이어붙인다. */
  const headGroups = data.groups.slice(0, VISIBLE_CITY_GROUPS).map(toTypeListGroup);
  const restCities: TypeRestCity[] = data.groups.slice(VISIBLE_CITY_GROUPS).map((g) => ({
    citySlug: g.citySlug,
    cityName: g.cityName,
    cityNameEn: g.cityNameEn,
    count: g.places.length,
  }));

  /* ⚠️ 문서에 그린 **앞 그룹과 같은 목록**이어야 한다. 문서에 없는 장소를 구조화
     데이터로 광고하면 크롤러가 보는 것과 신호가 엇갈린다. 꼬리로 가는 길은 따로
     있다 — 사이트맵이 `/place/[slug]` 를 전부 싣고, 아래 도시 칩이 `/city/[city]`
     전체 지도로 이어진다. */
  const schemaPlaces = headGroups.flatMap((g) =>
    g.places.map((p) => ({
      name: displayPlaceName(p, locale),
      address: p.address,
    })),
  );

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4">
      <JsonLd
        data={[
          /* 종류 인덱스(`/type`)를 없앴으므로 부모는 홈이다 — 홈 카테고리
             그리드가 종류 전부를 깔고 있어서 그게 이 페이지의 목록 자리다 */
          breadcrumbList([
            { name: m.typeDetail.home, url: absoluteUrl("/", locale) },
            { name: label, url: absoluteUrl(`/type/${type}`, locale) },
          ]),
          placeList(label, schemaPlaces),
        ]}
      />
      <header className="flex flex-col gap-3">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link
            href={localePath("/", locale)}
            className="underline-offset-4 hover:underline"
          >
            {m.typeDetail.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{label}</span>
        </nav>

        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {label}
        </h1>
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          {t(m.typeDetail.stats, { places: data.placeCount, cities: data.cityCount })}
        </p>
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)", lineHeight: 1.65 }}>
          {t(m.typeDetail.blurb, { label })}
        </p>
      </header>

      <div className="flex flex-col gap-(--block)">
        {headGroups.map((g, gi) => (
          <TypeCityGroupSection
            key={g.citySlug}
            group={g}
            type={type}
            locale={locale}
            m={m}
            /* 첫 도시의 첫 장소 컷만 eager — 이 페이지의 LCP 후보 */
            eagerFirstCut={gi === 0}
          />
        ))}
        {restCities.length > 0 ? <TypeMoreCities type={type} rest={restCities} /> : null}
      </div>

      {/* 다른 종류로 가는 길 — 목록이 홈 카테고리 그리드로 옮겨졌으므로 홈으로 보낸다 */}
      <Link
        href={localePath("/", locale)}
        className="index inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
        style={{ color: "var(--dim)" }}
      >
        <Icon.back className="size-3.5" />
        {m.typeDetail.otherTypes}
      </Link>
    </main>
  );
}
