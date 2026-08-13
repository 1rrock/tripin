import type { Metadata } from "next";
import type { Locale } from "@/shared/i18n/config";
import Link from "next/link";
import { loadCityIndex, type CityRow } from "@/shared/api/cities";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName } from "@/shared/i18n/display";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, linkList } from "@/shared/seo/json-ld";
import { Frame, Index, Rule } from "@/shared/ui/frame";
import { Icon } from "@/shared/ui/icons";
import { Thumb } from "@/shared/ui/Thumb";

/**
 * 지역 인덱스 — 많이 간 도시 그리드, 나머지는 컴팩트 행.
 *
 * 여행 직전 사용자는 대륙이 아니라 도시 이름으로 들어온다. 상위 도시는
 * 장소 수의 대부분을 차지해서(실측 6도시 / 235곳 / 86%) 그리드가 거짓말이 아니다.
 * 권역 점프는 두지 않는다 — 목차가 그리드와 같은 일을 한 번 더 한다.
 *
 * 페이지 제목은 탭 에코(「지역」) 하나. 「많이 간 도시」는 그리드 캡션이지
 * 두 번째 타이틀이 아니다 — 보이면 홈 레일처럼 눌러야 할 것처럼 읽히거나,
 * 첫 도시명 위의 키커가 된다. 화면에는 두지 않고 문서 아웃라인만 남긴다.
 * 문법 전환은 「다른 도시」에서만 표시한다.
 *
 * 타일은 이름을 프레임 앞에. 컷은 변형하지 않는다.
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
  const totalPlaces = cities.reduce((sum, c) => sum + c.placeCount, 0);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col px-(--gutter) pt-4">
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
      {/* `title` 은 훅("어디 가세요?")이라 화면에 쓰지 않는다.
          보이는 h1 은 탭과 같은 「지역」. 설명형은 스크린리더·검색엔진만. */}
      <header className="pb-5">
        <h1 className="text-xl font-bold tracking-[-0.03em]">{m.nav.region}</h1>
        <p className="sr-only">{m.cityIndex.srHeading}</p>
        {cities.length > 0 ? (
          <p className="index tnum mt-1.5" style={{ color: "var(--dim)" }}>
            {t(m.cityIndex.stats, { cities: cities.length, places: totalPlaces })}
          </p>
        ) : null}
      </header>

      {cities.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.cityIndex.empty}</p>
      ) : (
        <>
          {popular.length > 0 ? (
            <section aria-labelledby="popular-h">
              <h2 id="popular-h" className="sr-only">
                {m.cityIndex.popularHeading}
              </h2>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-4 md:gap-y-8">
                {popular.map((c, i) => (
                  <CityTile key={c.slug} city={c} i={i} locale={locale} m={m} />
                ))}
              </ul>
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section className="mt-(--block)" aria-labelledby="rest-h">
              <Rule />
              <h2 id="rest-h" className="index mt-(--stack)">
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
    <li className="min-w-0">
      <Link
        href={localePath(`/city/${city.slug}`, locale)}
        className="group/city block"
        aria-label={t(m.cityIndex.openMap, {
          name: label,
          places: city.placeCount,
          creators: city.creatorCount,
        })}
      >
        <span className="mb-2 flex items-baseline justify-between gap-2">
          <span
            className="min-w-0 truncate font-bold transition-colors group-active/city:text-(--wax) [@media(hover:hover)]:group-hover/city:text-(--wax)"
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
    <li
      className="border-b last:border-b-0"
      style={{ borderColor: "var(--hairline)" }}
    >
      <Link
        href={localePath(`/city/${city.slug}`, locale)}
        className="roll -mx-2.5 flex items-center gap-3.5 rounded-(--r-control) px-2.5 py-3"
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
