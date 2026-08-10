import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { loadCityDetail } from "@/shared/api/cities";
import type { PlaceType } from "@/shared/api/database.types";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName, displaySummary } from "@/shared/i18n/display";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Icon } from "@/shared/ui/frame";
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
  const names = data.places
    .slice(0, 4)
    .map((p) => p.name)
    .join(", ");
  const who = data.creators.map((c) => c.displayName).join(", ");
  if (locale === "en") {
    return {
      title: `${cityLabel} — YouTuber places map (${data.places.length})`,
      description: `${who} visited ${data.places.length} places in ${cityLabel}: ${names}. Each pin links to a source video.`,
      alternates: {
        canonical: localePath(`/city/${data.slug}`, locale),
        languages: {
          ko: `/city/${data.slug}`,
          en: `/en/city/${data.slug}`,
        },
      },
    };
  }
  return {
    title: `${data.name} 여행 유튜버 맛집 지도 — ${data.places.length}곳`,
    description: `${who}이(가) ${data.name}에서 다녀간 ${data.places.length}곳: ${names}. 각 장소마다 출처 영상과 지도 링크가 있습니다.`,
    alternates: {
      canonical: localePath(`/city/${data.slug}`, locale),
      languages: {
        ko: `/city/${data.slug}`,
        en: `/en/city/${data.slug}`,
      },
    },
  };
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
    mapUrl: p.mapUrl,
    sources: p.sources,
  }));

  return (
    <main>
      <header className="flex flex-col gap-3 px-(--gutter) pt-2 pb-1 lg:px-(--gutter)">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link
            href={localePath("/", locale)}
            className="underline-offset-4 hover:underline"
          >
            {m.cityDetail.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <Link
            href={localePath("/city", locale)}
            className="underline-offset-4 hover:underline"
          >
            {m.cityDetail.region}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{cityLabel}</span>
        </nav>

        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {t(m.cityDetail.creatorsTitle, { city: cityLabel })}
        </h1>

        <p className="index tnum" style={{ color: "var(--dim)" }}>
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
