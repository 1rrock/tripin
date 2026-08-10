import type { Metadata } from "next";
import Link from "next/link";
import { loadCityIndex } from "@/shared/api/cities";
import { groupByGeoRegion, type GeoRegionId } from "@/shared/lib/geo-regions";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName } from "@/shared/i18n/display";
import { getLocale, localePath } from "@/shared/i18n/locale";

/**
 * 지역 인덱스 — 여행사 디렉터리 문법.
 *
 * 도시마다 높이 다른 리스트 행(+유형 칩)을 쓰지 않는다.
 * 권역 섹션(일본·한국·미주…) 아래 **동일 높이 도시 타일** 그리드.
 * 유형 필터는 도시 지도 안에서 한다.
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return {
    title: m.cityIndex.title,
    description: m.cityIndex.blurb,
    alternates: {
      canonical: localePath("/city", locale),
      languages: { ko: "/city", en: "/en/city" },
    },
  };
}

export default async function CityIndexPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const cities = await loadCityIndex();
  const sections = groupByGeoRegion(cities);

  return (
    <main className="flex flex-col gap-(--stack) px-(--gutter) pt-2 pb-20">

      {cities.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.cityIndex.empty}</p>
      ) : (
        <div className="flex flex-col gap-(--block)">
          {sections.map(({ id, items }) => (
            <section key={id} aria-labelledby={`region-${id}`} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  id={`region-${id}`}
                  className="font-bold"
                  style={{
                    fontSize: "var(--t-title)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {regionLabel(m, id)}
                </h2>
                <p className="index tnum" style={{ color: "var(--dim)" }}>
                  {t(m.cityIndex.regionStats, {
                    cities: items.length,
                    places: items.reduce((s, c) => s + c.placeCount, 0),
                  })}
                </p>
              </div>

              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((c) => {
                  const label = displayCityName({ name: c.name, nameEn: c.nameEn }, locale);
                  const sub = locale === "en" ? c.name : c.nameEn;
                  return (
                    <li key={c.slug} className="min-h-0">
                      <Link
                        href={localePath(`/city/${c.slug}`, locale)}
                        className="flex h-full min-h-[4.75rem] flex-col justify-between gap-2 p-3 transition-colors"
                        style={{
                          background: "var(--sheet)",
                          borderRadius: "var(--r-control)",
                          boxShadow: "inset 0 0 0 1px var(--hairline)",
                        }}
                        aria-label={t(m.cityIndex.openMap, {
                          name: label,
                          places: c.placeCount,
                          creators: c.creatorCount,
                        })}
                      >
                        <span className="min-w-0">
                          <span
                            className="block truncate font-bold"
                            style={{
                              fontSize: "var(--t-body)",
                              letterSpacing: "-0.02em",
                              lineHeight: 1.25,
                            }}
                          >
                            {label}
                          </span>
                          {sub ? (
                            <span
                              className="mt-0.5 block truncate"
                              style={{ fontSize: "var(--t-index)", color: "var(--dim)" }}
                            >
                              {sub}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className="index tnum"
                          style={{ color: "var(--dim)", fontSize: "var(--t-index)" }}
                        >
                          {t(m.cityIndex.placesChannels, {
                            places: c.placeCount,
                            creators: c.creatorCount,
                          })}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function regionLabel(
  m: ReturnType<typeof getDictionary>,
  id: GeoRegionId,
): string {
  return m.cityIndex.regions[id];
}
