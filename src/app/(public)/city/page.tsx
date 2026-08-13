import type { Metadata } from "next";
import type { Locale } from "@/shared/i18n/config";
import Link from "next/link";
import { loadCityIndex, type CityRow } from "@/shared/api/cities";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName } from "@/shared/i18n/display";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, linkList } from "@/shared/seo/json-ld";
import { Frame, Icon, Index } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

/**
 * 지역 인덱스 — 많이 간 도시 그리드, 나머지는 컴팩트 행.
 *
 * 여행 직전 사용자는 대륙이 아니라 도시 이름으로 들어온다. 상위 도시는
 * 장소 수의 대부분을 차지해서(실측 6도시 / 235곳 / 86%) 그리드가 거짓말이 아니다.
 * 권역 점프는 두지 않는다 — 목차가 그리드와 같은 일을 한 번 더 한다.
 *
 * 홈 도시 시트와 같은 타일·같은 리듬: 이름을 프레임 앞에.
 */

/** 이 개수 이상이어야 "많이 간 도시" 그리드. 지금은 6도시 · 235곳. */
const POPULAR_MIN_PLACES = 8;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return publicMeta({
    locale,
    title: m.cityIndex.srHeading,
    description: m.cityIndex.blurb,
    bare: "/city",
  });
}

export default async function CityIndexPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const cities = await loadCityIndex();
  const popular = cities.filter((c) => c.placeCount >= POPULAR_MIN_PLACES);
  const rest = cities.filter((c) => c.placeCount < POPULAR_MIN_PLACES);
  const popularPlaces = popular.reduce((sum, c) => sum + c.placeCount, 0);

  return (
    <main className="flex flex-col px-(--gutter) pt-(--stack)">
      <JsonLd
        data={[
          breadcrumbList([
            { name: m.common.home, url: absoluteUrl("/", locale) },
            { name: m.cityIndex.srHeading, url: absoluteUrl("/city", locale) },
          ]),
          linkList(
            m.cityIndex.srHeading,
            cities.map((c) => ({
              name: displayCityName({ name: c.name, nameEn: c.nameEn }, locale),
              url: absoluteUrl(`/city/${c.slug}`, locale),
            })),
          ),
        ]}
      />
      {/* 화면에는 안 보이지만 문서에는 남는 제목. 시각적 헤더는 걷어냈어도
          스크린리더의 목차와 검색엔진의 주제 신호는 있어야 한다.
          `title` 은 훅("어디 가세요?")이라 여기 쓰지 않는다 — `srHeading` 은 설명형이다. */}
      <h1 className="sr-only">{m.cityIndex.srHeading}</h1>

      {cities.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.cityIndex.empty}</p>
      ) : (
        <>
          {popular.length > 0 ? (
            <section aria-labelledby="popular-h">
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  id="popular-h"
                  className="font-bold"
                  style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.03em", lineHeight: 1.2 }}
                >
                  {m.cityIndex.popularHeading}
                </h2>
                <Index className="tnum shrink-0">
                  {t(m.cityIndex.regionStats, {
                    cities: popular.length,
                    places: popularPlaces,
                  })}
                </Index>
              </div>
              <ul className="mt-(--stack) grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-4 md:gap-y-10">
                {popular.map((c, i) => (
                  <CityTile key={c.slug} city={c} i={i} locale={locale} m={m} />
                ))}
              </ul>
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section className="mt-(--block)" aria-labelledby="rest-h">
              <h2 id="rest-h" className="index">
                {m.cityIndex.minorHeading}
              </h2>
              <ul className="mt-(--stack) flex flex-col">
                {rest.map((c) => (
                  <CityMinorRow key={c.slug} city={c} locale={locale} m={m} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

function cityLabel(city: CityRow, locale: Locale): string {
  return displayCityName({ name: city.name, nameEn: city.nameEn }, locale);
}

function CityTile({
  city,
  i,
  locale,
  m,
}: {
  city: CityRow;
  i: number;
  locale: Locale;
  m: ReturnType<typeof getDictionary>;
}) {
  const label = cityLabel(city, locale);
  const cut = city.recentVideos[0];
  return (
    <li
      className="min-w-0"
    >
      <Link
        href={localePath(`/city/${city.slug}`, locale)}
        className="block"
        aria-label={t(m.cityIndex.openMap, {
          name: label,
          places: city.placeCount,
          creators: city.creatorCount,
        })}
      >
        <span className="mb-2 flex items-baseline justify-between gap-2">
          <span
            className="min-w-0 truncate font-bold"
            style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em" }}
          >
            {label}
          </span>
          <span className="index tnum shrink-0" style={{ color: "var(--dim)" }}>
            {t(m.home.placesUnit, { n: city.placeCount })}
          </span>
        </span>
        <Frame className="block w-full">
          {cut ? (
            <Thumb youtubeId={cut.youtubeId} alt={cut.title} eager={i === 0} />
          ) : null}
        </Frame>
      </Link>
    </li>
  );
}

/** 그리드에 못 든 도시 — 컷 하나 + 이름 + 메타 */
function CityMinorRow({
  city,
  locale,
  m,
}: {
  city: CityRow;
  locale: Locale;
  m: ReturnType<typeof getDictionary>;
}) {
  const label = cityLabel(city, locale);
  const sub = locale === "en" ? city.name : city.nameEn;
  const cut = city.recentVideos[0];
  return (
    <li>
      <Link
        href={localePath(`/city/${city.slug}`, locale)}
        className="roll -mx-2.5 flex items-center gap-3.5 rounded-(--r-control) border-b px-2.5 py-3 last:border-b-0"
        style={{ borderColor: "var(--hairline)" }}
        aria-label={t(m.cityIndex.openMap, {
          name: label,
          places: city.placeCount,
          creators: city.creatorCount,
        })}
      >
        {cut ? (
          <Frame className="w-[92px] shrink-0">
            <Thumb youtubeId={cut.youtubeId} alt={cut.title} />
          </Frame>
        ) : null}
        <span className="min-w-0 flex-1 truncate">
          <span
            className="font-bold"
            style={{ fontSize: "var(--t-body)", letterSpacing: "-0.02em" }}
          >
            {label}
          </span>
          {sub ? <Index className="ml-2 max-sm:hidden">{sub}</Index> : null}
        </span>
        <Index className="tnum shrink-0">
          {t(m.cityIndex.minorMeta, { places: city.placeCount, videos: city.videoCount })}
        </Index>
        <Icon.chevron className="roll-go size-4 shrink-0" style={{ color: "var(--dim)" }} />
      </Link>
    </li>
  );
}
