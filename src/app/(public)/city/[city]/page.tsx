import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { loadCityDetail } from "@/shared/api/cities";
import type { PlaceType } from "@/shared/api/database.types";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName, displaySummary } from "@/shared/i18n/display";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, placeList } from "@/shared/seo/json-ld";
import { Icon } from "@/shared/ui/icons";
import { CityExplorer, type CityPlace } from "./CityExplorer";


interface Params {
  city: string;
}

function parseType(v: string | undefined): PlaceType | null {
  return v && (FILTERABLE_TYPES as string[]).includes(v) ? (v as PlaceType) : null;
}

function parseChannel(v: string | undefined, creators: { slug: string }[]): string | null {
  if (!v) return null;
  return creators.some((c) => c.slug === v) ? v : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const data = await loadCityDetail((await params).city);
  if (!data) return { title: "Not found" };
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

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ type?: string; channel?: string }>;
}) {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const [{ city }, sp] = await Promise.all([params, searchParams]);
  const data = await loadCityDetail(city);
  if (!data) notFound();

  /* 채널이 하나면 이 화면은 조각 페이지와 내용이 같다 — 중복 색인을 막으려고 넘긴다.
     ?type= 은 조각 페이지도 같은 이름으로 지원하므로 들고 간다. 안 들고 가면
     `/type/[type]` 의 "지도에서 보기" 칩이 필터를 잃은 채 착지한다.
     ?channel= 은 목적지가 이미 그 채널이라 의미가 없으므로 버린다. */
  if (data.creators.length === 1) {
    const only = data.creators[0]!;
    const type = parseType(sp.type);
    const target = localePath(`/c/${only.slug}/${data.slug}`, locale);
    permanentRedirect(type ? `${target}?type=${type}` : target);
  }

  const cityLabel = displayCityName({ name: data.name, nameEn: data.nameEn }, locale);

  /* 로케일이 여기서만 확정된다 — CityExplorer(클라이언트)에는 ko/en 원본을 둘 다 넘기지
     않고 이미 고른 summary 하나만 보낸다. 그대로 넘기면 props 직렬화로 EN 페이지 HTML 에
     한국어 원문이 새어 나간다(검증 중 실제로 걸림 — grep 이 0이어야 할 자리에 1이 나왔다). */
  const places: CityPlace[] = data.places.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameLocal: p.nameLocal,
    placeType: p.placeType,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    summary: displaySummary(p, locale),
    mapLinks: p.mapLinks,
    sources: p.sources,
  }));

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
          placeList(
            listName,
            places.map((p) => ({
              name: p.name,
              address: p.address,
              lat: p.lat,
              lng: p.lng,
              url: `${absoluteUrl(`/city/${data.slug}`, locale)}#${p.slug}`,
            })),
          ),
        ]}
      />
      {/* 브레드크럼은 데스크톱에도 세운다 — 검색 유입이 위로 올라갈 길.
          제목·통계는 모바일 전용(데스크톱 h1 은 CityExplorer 가 그린다). */}
      <header className="flex flex-col gap-3 px-(--gutter) pt-4 pb-1 lg:pb-0">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
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

        <h1
          className="font-black lg:hidden"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {t(m.cityDetail.creatorsTitle, { city: cityLabel })}
        </h1>

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
        places={places}
        creators={data.creators}
        initialType={parseType(sp.type)}
        initialChannel={parseChannel(sp.channel, data.creators)}
      />
    </main>
  );
}
