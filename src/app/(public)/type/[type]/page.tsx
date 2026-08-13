import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTypeDetail, parsePlaceType } from "@/shared/api/place-types";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName, displayPlaceName, displayPlaceSecondary } from "@/shared/i18n/display";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, placeList } from "@/shared/seo/json-ld";
import { Act, Chip, Frame, Icon, Index, Rule } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

/* `export const revalidate` 를 두지 않는다 — 이 트리는 레이아웃이 headers() 를 읽어
   요청마다 렌더되므로 아무 일도 하지 않는 죽은 선언이 된다(shared/api/cache.ts).
   캐시는 로더 쪽 cachePublic 이 맡는다. 나머지 공개 페이지 8개도 같은 이유로 뺐다. */

/** 도시당 펼쳐 보여줄 상한. 나머지는 렌더하지 않고 도시 지도로 넘긴다(무게). */
const VISIBLE_PER_CITY = 12;

interface Params {
  type: string;
}

function youtubeUrl(videoId: string, sec: number | null): string {
  return `https://www.youtube.com/watch?v=${videoId}${sec !== null ? `&t=${Math.floor(sec)}s` : ""}`;
}

function fmt(sec: number | null): string {
  if (sec === null) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const type = parsePlaceType((await params).type);
  if (!type) return { title: "Not found" };
  const data = await loadTypeDetail(type);
  if (!data) return { title: "Not found" };
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
  const locale = await getLocale();
  const m = getDictionary(locale);
  const type = parsePlaceType((await params).type);
  if (!type) notFound();
  const data = await loadTypeDetail(type);
  if (!data) notFound();

  const label = m.placeTypes[type];

  const schemaPlaces = data.groups.flatMap((g) =>
    g.places.slice(0, VISIBLE_PER_CITY).map((p) => ({
      name: displayPlaceName(p, locale),
      address: p.address,
    })),
  );

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <JsonLd
        data={[
          breadcrumbList([
            { name: m.typeDetail.home, url: absoluteUrl("/", locale) },
            { name: m.typeDetail.type, url: absoluteUrl("/type", locale) },
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
          <Link
            href={localePath("/type", locale)}
            className="underline-offset-4 hover:underline"
          >
            {m.typeDetail.type}
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
        {data.groups.map((g, gi) => {
          const cityLabel = displayCityName(
            { name: g.cityName, nameEn: g.cityNameEn },
            locale,
          );
          return (
            <section key={g.citySlug} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  className="font-bold"
                  style={{ fontSize: "var(--t-title)", letterSpacing: "-0.025em" }}
                >
                  {cityLabel}
                  <span className="index tnum ml-2 font-normal" style={{ color: "var(--dim)" }}>
                    {t(m.typeDetail.placesUnit, { n: g.places.length })}
                  </span>
                </h2>
                <Chip href={localePath(`/city/${g.citySlug}?type=${type}`, locale)}>
                  {m.typeDetail.viewOnMap}
                </Chip>
              </div>

              <ol className="flex flex-col">
                {g.places.slice(0, VISIBLE_PER_CITY).map((place, i) => {
                  /* 대표 컷 — 이 장소를 실은 첫 출처 영상. 썸네일이 이 월드의 서명인데
                     이 화면만 텍스트 목록이었다. 컷은 원본 그대로여야 하므로
                     프레임 비율(16:9)을 건드리지 않는다(LEGAL.md 4.5) */
                  const cut = place.sources[0];
                  return (
                    <li key={place.id} className="develop" style={{ "--i": i } as CSSProperties}>
                      <Rule />
                      <div className="flex items-start gap-3.5 py-(--stack)">
                        {cut ? (
                          /* 첫 도시의 첫 장소 컷만 eager — 이 페이지의 LCP 후보 */
                          <span className="w-[104px] shrink-0 sm:w-[132px]">
                            <Frame>
                              <Thumb
                                youtubeId={cut.youtubeId}
                                alt={cut.videoTitle}
                                eager={gi === 0 && i === 0}
                              />
                            </Frame>
                          </span>
                        ) : null}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <Index tone="wax" className="tnum shrink-0">
                              {String(i + 1).padStart(2, "0")}
                            </Index>
                            <p
                              className="min-w-0 font-bold"
                              style={{
                                fontSize: "var(--t-title)",
                                letterSpacing: "-0.025em",
                                lineHeight: 1.3,
                              }}
                            >
                              {displayPlaceName(place, locale)}
                            </p>
                          </div>
                          {displayPlaceSecondary(place, locale) ? (
                            <p
                              className="mt-1"
                              style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                            >
                              {displayPlaceSecondary(place, locale)}
                            </p>
                          ) : null}
                          {place.address ? (
                            <p
                              className="mt-0.5"
                              style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                            >
                              {place.address}
                            </p>
                          ) : null}

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {place.sources.map((s, si) => (
                              <Act
                                key={`${s.youtubeId}-${si}`}
                                icon="play"
                                href={youtubeUrl(s.youtubeId, s.timestampSec)}
                                title={s.videoTitle}
                              >
                                {s.creatorName}
                                {s.timestampSec !== null ? ` ${fmt(s.timestampSec)}` : ""}
                              </Act>
                            ))}
                            {place.mapUrl ? (
                              <Act icon="out" href={place.mapUrl}>
                                {m.typeDetail.openMap}
                              </Act>
                            ) : null}
                            {cut ? (
                              <Chip
                                href={localePath(
                                  `/c/${cut.creatorSlug}/${place.citySlug}`,
                                  locale,
                                )}
                              >
                                {m.typeDetail.channelMap}
                              </Chip>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
                {g.places.length > VISIBLE_PER_CITY ? (
                  <li>
                    <Rule />
                    <div className="py-(--stack)">
                      <Chip href={localePath(`/city/${g.citySlug}?type=${type}`, locale)}>
                        {t(m.typeDetail.moreInCity, { n: g.places.length - VISIBLE_PER_CITY })}
                      </Chip>
                    </div>
                  </li>
                ) : null}
                <Rule />
              </ol>
            </section>
          );
        })}
      </div>

      <Link
        href={localePath("/type", locale)}
        className="index inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
        style={{ color: "var(--dim)" }}
      >
        <Icon.back className="size-3.5" />
        {m.typeDetail.otherTypes}
      </Link>
    </main>
  );
}
