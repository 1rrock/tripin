import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import type { PlaceType } from "@/shared/api/database.types";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import type { Locale } from "@/shared/i18n/config";
import { displayCityName, displayIntro, displaySummary } from "@/shared/i18n/display";
import type { EnSource } from "@/shared/i18n/display";
import { Chip } from "@/shared/ui/frame"
import { Icon } from "@/shared/ui/icons";
import { publicMeta, absoluteUrl } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, placeList } from "@/shared/seo/json-ld";
import { Explorer, type PublicPlace, type RelatedPiece } from "./Explorer";

/**
 * ★ 채널×도시 — 이 서비스의 핵심 페이지 (CONCEPT.md 4.3).
 * anon 클라이언트 → RLS 가 공개(is_published) 데이터만 내려준다.
 */

interface PageParams {
  creator: string;
  city: string;
}

/**
 * 캐시에 로케일을 넣지 않는다 — 도시명은 `name`·`name_en` 을 그대로 실어 보내고
 * 표시 문자열은 호출부에서 고른다. 그래야 EN 요청이 KO 캐시를 맞지 않는다.
 */
interface RelatedCityRow {
  slug: string;
  name: string;
  nameEn: string | null;
  count: number;
}

/**
 * 로더가 돌려주는 장소 원본 — ko/en 요약을 **둘 다** 싣는다(로케일 무관, 캐시 규칙).
 * `PublicPlace`(Explorer.tsx) 와 다르다 — 그건 로케일로 이미 확정된 표시용 형태다.
 * 이 원본을 그대로 Explorer(클라이언트)에 넘기면 props 직렬화로 EN 페이지 HTML 에
 * 한국어 원문이 새어 나간다. `CreatorCityPage` 가 로케일을 안 뒤 `displaySummary()` 로 변환한다.
 */
interface LoadedPlace {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PublicPlace["placeType"];
  mapStatus: PublicPlace["mapStatus"];
  lat: number | null;
  lng: number | null;
  address: string | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  kakaoPlaceId: string | null;
  naverPlaceId: string | null;
  summary: string | null;
  summaryBullets: string[];
  priceHint: string | null;
  summaryEn: string | null;
  summaryBulletsEn: string[];
  priceHintEn: string | null;
  enSource: EnSource;
  videoTitle: string | null;
  youtubeVideoId: string | null;
  timestampSec: number | null;
}

/** generateMetadata 와 페이지가 같은 캐시 항목을 나눠 쓴다. */
const loadPiece = cachePublic(async function loadPiece(params: PageParams) {
  const [{ data: creator }, { data: city }] = await Promise.all([
    supabase.from("creators").select("*").eq("slug", params.creator).single(),
    supabase.from("cities").select("*").eq("slug", params.city).single(),
  ]);
  if (!creator || !city) return null;

  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, youtube_video_id")
    .eq("creator_id", creator.id);
  const videoById = new Map((videos ?? []).map((v) => [v.id, v]));

  const videoIds = (videos ?? []).map((v) => v.id);
  const { data: links } = videoIds.length
    ? await supabase
        .from("video_places")
        .select("video_id, place_id, timestamp_sec")
        .in("video_id", videoIds)
    : { data: [] };

  const placeIds = [...new Set((links ?? []).map((l) => l.place_id))];
  const { data: places } = placeIds.length
    ? await supabase
        .from("places")
        .select(
          "id, slug, name, name_local, place_type, map_status, lat, lng, address, summary, summary_bullets, price_hint, summary_en, summary_bullets_en, price_hint_en, en_source, google_place_id, google_maps_url, kakao_place_id, naver_place_id",
        )
        .in("id", placeIds)
        .eq("city_id", city.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const loadedPlaces: LoadedPlace[] = (places ?? []).map((p) => {
    const link = (links ?? []).find((l) => l.place_id === p.id);
    const video = link ? videoById.get(link.video_id) : undefined;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameLocal: p.name_local,
      placeType: p.place_type,
      mapStatus: p.map_status,
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      googlePlaceId: p.google_place_id,
      googleMapsUrl: p.google_maps_url,
      kakaoPlaceId: p.kakao_place_id,
      naverPlaceId: p.naver_place_id,
      summary: p.summary,
      summaryBullets: p.summary_bullets,
      priceHint: p.price_hint,
      summaryEn: p.summary_en,
      summaryBulletsEn: p.summary_bullets_en,
      priceHintEn: p.price_hint_en,
      enSource: p.en_source,
      videoTitle: video?.title ?? null,
      youtubeVideoId: video?.youtube_video_id ?? null,
      timestampSec: link?.timestamp_sec ?? null,
    };
  });

  const { data: piece } = await supabase
    .from("creator_cities")
    .select("intro_text, intro_text_en")
    .eq("creator_id", creator.id)
    .eq("city_id", city.id)
    .maybeSingle();

  const [otherCities, otherCreators] = await Promise.all([
    loadOtherCities(placeIds, city.id),
    loadOtherCreators(creator.id, city.id),
  ]);

  return {
    creator,
    city,
    places: loadedPlaces,
    introText: piece?.intro_text ?? null,
    introTextEn: piece?.intro_text_en ?? null,
    otherCities,
    otherCreators,
  };
}, ["piece"]);

/** 이 크리에이터의 확정 장소가 있는 다른 도시 — 다음 행동 칩용. */
async function loadOtherCities(
  placeIds: string[],
  currentCityId: string,
): Promise<RelatedCityRow[]> {
  if (placeIds.length === 0) return [];
  const { data: allPlaces } = await supabase
    .from("places")
    .select("id, city_id, map_status")
    .in("id", placeIds);
  const countByCity = new Map<string, number>();
  for (const p of allPlaces ?? []) {
    if (p.map_status !== "confirmed" || p.city_id === currentCityId) continue;
    countByCity.set(p.city_id, (countByCity.get(p.city_id) ?? 0) + 1);
  }
  if (countByCity.size === 0) return [];
  const { data: cities } = await supabase
    .from("cities")
    .select("id, slug, name, name_en")
    .in("id", [...countByCity.keys()]);
  return (cities ?? [])
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      nameEn: c.name_en,
      count: countByCity.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/** 같은 도시에 확정 장소가 있는 다른 크리에이터 — 교차 뷰로 가는 유일한 입구. */
async function loadOtherCreators(
  currentCreatorId: string,
  cityId: string,
): Promise<RelatedPiece[]> {
  const { data: cityPlaces } = await supabase
    .from("places")
    .select("id")
    .eq("city_id", cityId)
    .eq("map_status", "confirmed");
  const cityPlaceIds = (cityPlaces ?? []).map((p) => p.id);
  if (cityPlaceIds.length === 0) return [];

  const { data: cityLinks } = await supabase
    .from("video_places")
    .select("video_id, place_id")
    .in("place_id", cityPlaceIds);
  const cityVideoIds = [...new Set((cityLinks ?? []).map((l) => l.video_id))];
  if (cityVideoIds.length === 0) return [];

  const { data: cityVideos } = await supabase
    .from("videos")
    .select("id, creator_id")
    .in("id", cityVideoIds);
  const creatorByVideo = new Map((cityVideos ?? []).map((v) => [v.id, v.creator_id]));
  const placesByCreator = new Map<string, Set<string>>();
  for (const link of cityLinks ?? []) {
    const creatorId = creatorByVideo.get(link.video_id);
    if (!creatorId || creatorId === currentCreatorId) continue;
    if (!placesByCreator.has(creatorId)) placesByCreator.set(creatorId, new Set());
    placesByCreator.get(creatorId)!.add(link.place_id);
  }
  if (placesByCreator.size === 0) return [];

  const { data: creators } = await supabase
    .from("creators")
    .select("id, slug, display_name")
    .in("id", [...placesByCreator.keys()]);
  return (creators ?? [])
    .map((c) => ({
      slug: c.slug,
      name: c.display_name,
      count: placesByCreator.get(c.id)?.size ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const routeParams = await params;
  const data = await loadPiece(routeParams);
  if (!data) return { title: locale === "en" ? "Not found" : "찾을 수 없는 페이지" };
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
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<{ type?: string; picked?: string }>;
}) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  const locale = await getLocale();
  const data = await loadPiece(routeParams);
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

  /* 로케일이 여기서만 확정된다 — Explorer(클라이언트)에는 ko/en 원본을 둘 다 넘기지
     않고 이미 고른 summary 하나만 보낸다. 그대로 넘기면 props 직렬화로 EN 페이지 HTML 에
     한국어 원문이 새어 나간다(검증 중 실제로 걸림 — grep 이 0이어야 할 자리에 1이 나왔다). */
  const places: PublicPlace[] = data.places.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameLocal: p.nameLocal,
    placeType: p.placeType,
    mapStatus: p.mapStatus,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    googlePlaceId: p.googlePlaceId,
    googleMapsUrl: p.googleMapsUrl,
    kakaoPlaceId: p.kakaoPlaceId,
    naverPlaceId: p.naverPlaceId,
    summary: displaySummary(p, locale),
    videoTitle: p.videoTitle,
    youtubeVideoId: p.youtubeVideoId,
    timestampSec: p.timestampSec,
  }));

  const m = getDictionary(locale);
  const bare = `/c/${routeParams.creator}/${routeParams.city}`;
  const confirmedPlaces = places.filter((p) => p.mapStatus === "confirmed");
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
              url: `${absoluteUrl(bare, locale)}#${p.slug}`,
            })),
          ),
        ]}
      />
      <Explorer
        creatorName={data.creator.display_name}
        creatorInitials={data.creator.initials}
        creatorAvatar={data.creator.avatar_url}
        accentColor={data.creator.accent_color}
        cityName={cityName}
        introText={displayIntro(data, locale)}
        places={places}
        activeType={(query.type as PlaceType | undefined) ?? null}
        basePath={bare}
        initialPicked={query.picked?.split(",").filter(Boolean) ?? []}
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
