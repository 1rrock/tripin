import type { Metadata } from "next";
import type { CSSProperties } from "react";
import type { Locale } from "@/shared/i18n/config";
import Link from "next/link";
import { loadCityIndex, type CityRow } from "@/shared/api/cities";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName } from "@/shared/i18n/display";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Frame, Icon, Index, Rule } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

/**
 * 지역 인덱스 — 필름 스트립 행 (콘택트 시트의 선반).
 *
 * 도시 하나가 필름 한 롤이다: 도시명 + 최근 컷 4장.
 * 균일 타일 그리드를 쓰지 않는 이유는 데이터 분포다 — 후쿠오카 75곳과 1곳짜리
 * 도시 6개가 같은 타일이면 무게가 거짓말이 된다. 분량이 있는 도시는 스트립 행,
 * 아직 한두 곳뿐인 도시는 컴팩트 행으로 **투티어**를 나눈다.
 */

/** 이 개수 이상 영상이 있어야 스트립 행 — 미만이면 컴팩트 행으로 내려간다 */
const STRIP_MIN_VIDEOS = 3;

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
  const majors = cities.filter((c) => c.videoCount >= STRIP_MIN_VIDEOS);
  const minors = cities.filter((c) => c.videoCount < STRIP_MIN_VIDEOS);

  return (
    <main className="flex flex-col px-(--gutter) pt-2 pb-20">
      {/* 화면에는 안 보이지만 문서에는 남는 제목. 시각적 헤더는 걷어냈어도
          스크린리더의 목차와 검색엔진의 주제 신호는 있어야 한다.
          `title` 은 훅("어디 가세요?")이라 여기 쓰지 않는다 — `srHeading` 은 설명형이다. */}
      <h1 className="sr-only">{m.cityIndex.srHeading}</h1>

      {cities.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.cityIndex.empty}</p>
      ) : (
        <>
          <ul className="flex flex-col">
            {majors.map((c, i) => (
              <CityRoll key={c.slug} city={c} i={i} locale={locale} m={m} />
            ))}
          </ul>

          {minors.length > 0 ? (
            <section className="mt-(--block)">
              <div className="flex items-center gap-3">
                <Index>{m.cityIndex.minorHeading}</Index>
                <Rule className="flex-1" />
              </div>
              <ul className="mt-2 flex flex-col">
                {minors.map((c) => (
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

/**
 * 분량이 있는 도시 — 큰 도시명 + 최근 컷 스트립.
 *
 * ⚠️ 왁스 번호(01·02…)를 붙이지 않는다. 이 월드에서 숫자를 매기는 자리는
 *    지도 핀과 1:1로 대응하는 `FrameNo` 뿐이다 — 거기서는 번호가 데이터다.
 *    여기서는 그냥 정렬 순서라, 붙이면 순위표처럼 읽히면서 없는 뜻이 생긴다.
 */
function CityRoll({
  city,
  i,
  locale,
  m,
}: {
  city: CityRow;
  /** 진입 애니메이션(`develop`) 계단 순서에만 쓴다 */
  i: number;
  locale: Locale;
  m: ReturnType<typeof getDictionary>;
}) {
  const label = displayCityName({ name: city.name, nameEn: city.nameEn }, locale);
  const sub = locale === "en" ? city.name : city.nameEn;
  return (
    <li className="develop" style={{ "--i": i } as CSSProperties}>
      <Rule />
      <Link
        href={localePath(`/city/${city.slug}`, locale)}
        className="roll -mx-2.5 block rounded-(--r-control) px-2.5 py-(--stack)"
        aria-label={t(m.cityIndex.openMap, {
          name: label,
          places: city.placeCount,
          creators: city.creatorCount,
        })}
      >
        <span className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
          <span
            className="font-black"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            {label}
          </span>
          {sub ? <Index>{sub}</Index> : null}
          <Index className="tnum ml-auto">
            {t(m.cityIndex.rowMeta, {
              places: city.placeCount,
              creators: city.creatorCount,
              videos: city.videoCount,
            })}
          </Index>
        </span>

        <span className="no-scrollbar -mx-(--gutter) mt-3 flex gap-2 overflow-x-auto px-(--gutter) sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
          {city.recentVideos.map((v) => (
            <Frame key={v.youtubeId} className="w-[46%] shrink-0 sm:w-auto">
              <Thumb youtubeId={v.youtubeId} alt={v.title} />
            </Frame>
          ))}
        </span>
      </Link>
    </li>
  );
}

/** 아직 한두 곳뿐인 도시 — 컷 하나 + 이름 + 메타의 컴팩트 행 */
function CityMinorRow({
  city,
  locale,
  m,
}: {
  city: CityRow;
  locale: Locale;
  m: ReturnType<typeof getDictionary>;
}) {
  const label = displayCityName({ name: city.name, nameEn: city.nameEn }, locale);
  const sub = locale === "en" ? city.name : city.nameEn;
  const cut = city.recentVideos[0];
  return (
    <li>
      <Link
        href={localePath(`/city/${city.slug}`, locale)}
        className="roll -mx-2.5 flex items-center gap-3.5 rounded-(--r-control) border-b px-2.5 py-2.5 last:border-b-0"
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
        <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
      </Link>
    </li>
  );
}
