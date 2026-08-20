import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadNearbyPlaces, loadPlaceBySlug } from "@/shared/api/places";
import { placePath } from "@/shared/lib/place-path";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName, displayPlaceName, displayPlaceSecondary } from "@/shared/i18n/display";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { thumbSmall, watchUrl } from "@/shared/lib/youtube";
import { absoluteUrl, publicMeta, siteOrigin } from "@/shared/seo/page-meta";
import { JsonLd, breadcrumbList, placeNode } from "@/shared/seo/json-ld";
import { Avatar, Frame } from "@/shared/ui/frame";
import { Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { SaveButton } from "@/shared/ui/SaveButton";
import { SummaryBlock } from "@/shared/ui/SummaryBlock";
import { Thumb } from "@/shared/ui/Thumb";

/**
 * ★ 장소 낱개 — 상호명 질의가 착지하는 유일한 자리.
 *
 * 이 라우트가 생기기 전까지 확정 장소 1732곳에는 URL 이 없었다. 도시 페이지에
 * 561곳이 한 문서로 뭉쳐 있어서 "잇케이 JRJP 하카타점" 같은 질의에 내밀 수 있는
 * 게 그 3MB 문서뿐이었고, 561개를 다루는 문서는 그중 어느 이름으로도 뜨지 않는다.
 *
 * 그래서 이 화면의 규율은 하나다 — **한 문서에 한 가게.**
 * 아래 "이 도시의 다른 곳"이 12개에서 끊기는 것도 같은 이유다. 도시 전체를 다시
 * 실으면 방금 고친 문제를 1732번 반복하게 된다.
 *
 * 전부 서버 렌더다. `PlaceSheet`(지도 드로어)를 재사용하지 않는 이유는 그쪽이
 * `role="dialog"` + 제스처 + 닫기 버튼을 가진 지도 부속이라서다 — 문서로서 읽히려면
 * h1 과 landmark 가 필요하고, 그 둘은 드로어와 양립하지 않는다. 부품(Thumb·Frame·
 * SummaryBlock)만 공유한다.
 */

interface Params {
  slug: string;
}

/**
 * 라우트 파라미터 → DB slug.
 *
 * ⚠️ **Next 는 비ASCII 세그먼트를 퍼센트 인코딩된 채로 넘긴다.** 직접 확인했다 —
 *    `/place/잇케이-jrjp-하카타점-ku8f` 의 `params.slug` 는
 *    `"%EC%9E%87%EC%BC%80%EC%9D%B4-jrjp-..."` 로 들어온다. 디코딩을 빼면 한글
 *    이름을 가진 장소(대부분)가 전부 404 나고, ASCII slug 만 열려서 "되는 것도
 *    있으니 라우팅은 맞다"고 착각하기 쉬운 형태로 깨진다.
 *
 * NFC 로 맞추는 이유는 DB 가 NFC 이기 때문이다(확인함). macOS 계열에서 올라오는
 * 경로는 NFD 일 수 있고, 그러면 같은 글자인데 문자열이 안 맞는다.
 *
 * 잘못된 인코딩(`%` 하나만 있는 경로 등)은 `decodeURIComponent` 가 던진다 —
 * 크롤러·스캐너가 실제로 만들어 보내므로 500 이 아니라 404 로 떨어뜨린다.
 */
function routeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw).normalize("NFC");
  } catch {
    return "";
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { slug } = await params;
  const place = await loadPlaceBySlug(routeSlug(slug), locale);
  const m = getDictionary(locale);
  if (!place) return { title: m.placeDetail.notFound };

  const name = displayPlaceName(place, locale);
  const cityLabel = displayCityName({ name: place.cityName, nameEn: place.cityNameEn }, locale);
  const typeLabel = m.placeTypes[place.placeType];
  const creators = [...new Set(place.sources.map((s) => s.creatorName))];
  const who = creators.slice(0, 2).join(", ");

  /* 타이틀은 **상호명이 먼저**다. 도시·종류를 앞에 세우면 도시 페이지와 같은 말로
     싸우게 되고, 스니펫이 앞에서 잘릴 때 정작 검색어인 이름이 날아간다. */
  const title =
    locale === "en"
      ? `${name} — ${typeLabel} in ${cityLabel}`
      : `${name} — ${cityLabel} ${typeLabel}`;

  /* 설명은 이 페이지가 실제로 답하는 것만 적는다: 어느 채널 영상에 나왔고,
     주소가 어디고, 지도로 나갈 수 있다. 평가·추천 문구는 쓰지 않는다(LEGAL). */
  const description =
    locale === "en"
      ? `${name} in ${cityLabel}${place.address ? ` — ${place.address}` : ""}. Featured by ${who}. Watch the source video from the exact timestamp and open it in your map app.`
      : /* 조사 폴백 「이(가)」 금지 — 스니펫에 그대로 나간다. 「의」는 받침과 무관하다. */
        `${cityLabel} ${typeLabel} ${name}${place.address ? ` · ${place.address}` : ""}. ${who}의 영상에 나온 곳으로, 나온 장면부터 바로 보고 지도 앱으로 열 수 있습니다.`;

  return publicMeta({
    locale,
    title,
    description,
    bare: placePath(place.slug),
  });
}

export default async function PlacePage({ params }: { params: Promise<Params> }) {
  const locale = await getLocale();
  const { slug } = await params;
  const place = await loadPlaceBySlug(routeSlug(slug), locale);
  if (!place) notFound();

  const m = getDictionary(locale);
  const nearby = await loadNearbyPlaces(place.citySlug, place.slug);

  const name = displayPlaceName(place, locale);
  const secondary = displayPlaceSecondary(place, locale);
  const cityLabel = displayCityName({ name: place.cityName, nameEn: place.cityNameEn }, locale);
  const typeLabel = m.placeTypes[place.placeType];
  const bare = placePath(place.slug);
  const hero = place.sources[0] ?? null;

  return (
    <main className="px-(--gutter) pt-4">
      <JsonLd
        data={[
          breadcrumbList([
            { name: m.common.home, url: absoluteUrl("/", locale) },
            { name: m.nav.map, url: absoluteUrl("/map", locale) },
            { name: cityLabel, url: absoluteUrl(`/city/${place.citySlug}`, locale) },
            { name, url: absoluteUrl(bare, locale) },
          ]),
          placeNode({
            site: siteOrigin(),
            url: absoluteUrl(bare, locale),
            name,
            alternateName: secondary,
            placeType: place.placeType,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            /* 요약 불릿을 한 문장으로 잇는다 — 없으면 지어내지 않고 비운다 */
            description: place.summary.bullets.join(" ") || place.summary.summary,
            /* 같은 실체를 가리키는 외부 주소 — 엔티티 결합에 그대로 쓰인다 */
            sameAs: place.mapLinks.map((l) => l.url),
            image: hero ? thumbSmall(hero.youtubeId) : null,
          }),
        ]}
      />

      <nav
        aria-label={m.placeDetail.breadcrumbAria}
        className="index flex flex-wrap items-center gap-1.5"
        style={{ color: "var(--dim)" }}
      >
        <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
          {m.common.home}
        </Link>
        <Icon.chevron className="size-2.5" />
        <Link
          href={localePath(`/city/${place.citySlug}`, locale)}
          className="underline-offset-4 hover:underline"
        >
          {cityLabel}
        </Link>
        <Icon.chevron className="size-2.5" />
        <span style={{ color: "var(--paper)" }}>{name}</span>
      </nav>

      <header className="mt-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h1
            className="font-black"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.035em", lineHeight: 1.15 }}
          >
            {name}
          </h1>
          <p className="mt-1.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
            {t(m.placeDetail.typeInCity, { city: cityLabel, type: typeLabel })}
            {secondary ? (
              <>
                {" · "}
                <span lang={locale === "en" ? undefined : "ja"}>{secondary}</span>
              </>
            ) : null}
          </p>
          {place.address ? (
            <p className="mt-1" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              {place.address}
            </p>
          ) : null}
        </div>
        <div className="mt-0.5 shrink-0">
          <SaveButton placeId={place.id} placeName={place.name} bare />
        </div>
      </header>

      {/* 대표 컷 — 눌러서 유튜브로 바로 나간다. 원본 16:9, 크롭·오버레이 없음
          (YouTube API Developer Policies §III.E.3 — Thumb 주석 참조) */}
      {hero ? (
        <OutboundA
          href={watchUrl(hero.youtubeId, hero.timestampSec)}
          title={hero.videoTitle}
          className="mt-4 block"
        >
          <Frame className="block w-full">
            <Thumb youtubeId={hero.youtubeId} alt={hero.videoTitle} eager variant="hero" />
          </Frame>
        </OutboundA>
      ) : null}

      <SummaryBlock className="mt-4" display={place.summary} />

      {place.mapLinks.length > 0 ? (
        <section className="mt-6">
          <h2 className="index" style={{ color: "var(--dim)" }}>
            {m.placeDetail.openMapHeading}
          </h2>
          {/* 지도는 하나로 정하지 않고 고르게 한다 — 구글엔 사진·영업시간이,
              네이버엔 한글 리뷰·길찾기가 있다. 첫 번째가 그 나라의 기본이라 칠한다. */}
          <div className="mt-2 flex w-full gap-2">
            {place.mapLinks.map((link, i) => (
              <OutboundA
                key={link.app}
                href={link.url}
                className="flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 font-bold"
                style={{
                  fontSize: place.mapLinks.length > 2 ? "var(--t-meta)" : "var(--t-body)",
                  borderRadius: "var(--r-frame)",
                  background: i === 0 ? "var(--paper)" : "transparent",
                  color: i === 0 ? "var(--ground)" : "var(--paper)",
                  boxShadow: i === 0 ? undefined : "inset 0 0 0 1px var(--hairline)",
                }}
              >
                {place.mapLinks.length === 1 ? <Icon.out className="size-4" /> : null}
                <span className="truncate">{m.map.mapApps[link.app]}</span>
              </OutboundA>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="index" style={{ color: "var(--dim)" }}>
          {m.placeDetail.sourcesHeading}
        </h2>
        <div className="mt-3 flex flex-col gap-4">
          {place.sources.map((s, i) => (
            <div key={`${s.youtubeId}-${i}`} className="flex gap-3">
              <Link
                href={localePath(`/c/${s.creatorSlug}/v/${s.youtubeId}`, locale)}
                title={s.videoTitle}
                className="w-[120px] shrink-0"
              >
                <Frame>
                  <Thumb youtubeId={s.youtubeId} alt={s.videoTitle} eager={i === 0} />
                </Frame>
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={localePath(`/c/${s.creatorSlug}`, locale)}
                  className="flex items-center gap-2 hover:underline"
                >
                  <Avatar
                    initials={s.initials}
                    accent={s.accentColor}
                    src={s.avatarUrl}
                    size={20}
                  />
                  <span className="truncate text-[12px] font-semibold">{s.creatorName}</span>
                </Link>
                <Link
                  href={localePath(`/c/${s.creatorSlug}/v/${s.youtubeId}`, locale)}
                  className="mt-1 block text-[13px] leading-snug font-medium"
                >
                  {s.videoTitle}
                </Link>
                {/* 두 갈래 — 유튜브로 바로 나갈 사람과, 타임라인이 붙은 우리 영상 화면.
                    PlaceSheet 의 출처 줄과 같은 문법이다. */}
                <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <OutboundA
                    href={watchUrl(s.youtubeId, s.timestampSec)}
                    title={s.videoTitle}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-(--wax)"
                  >
                    <Icon.play className="size-3.5" />
                    {s.timestampSec !== null
                      ? t(m.common.watchOnYoutubeAt, { ts: timestampLabel(s.timestampSec) })
                      : m.common.watchOnYoutube}
                  </OutboundA>
                  <Link
                    href={localePath(`/c/${s.creatorSlug}/v/${s.youtubeId}`, locale)}
                    className="inline-flex items-center gap-0.5 text-[12px] font-semibold"
                    style={{ color: "var(--dim)" }}
                  >
                    {m.common.videoDetail}
                    <Icon.chevron className="size-2.5" />
                  </Link>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 크롤러가 옆으로 갈 길 — 사이트맵만으로는 발견은 되어도 링크 신호가 안 붙는다.
          12개에서 끊는 이유는 이 파일 맨 위 주석. */}
      {nearby.length > 0 ? (
        <section className="mt-8">
          <h2 className="index" style={{ color: "var(--dim)" }}>
            {t(m.placeDetail.nearbyHeading, { city: cityLabel })}
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
            {nearby.map((n) => (
              <li key={n.slug}>
                <Link href={localePath(placePath(n.slug), locale)} className="block">
                  {n.youtubeId ? (
                    <Frame className="block w-full">
                      <Thumb youtubeId={n.youtubeId} alt={n.name} />
                    </Frame>
                  ) : null}
                  <span className="mt-1.5 block text-[13px] leading-snug font-medium">
                    {displayPlaceName(n, locale)}
                  </span>
                  <span
                    className="mt-0.5 block"
                    style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                  >
                    {m.placeTypes[n.placeType]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4">
            <Link
              href={localePath(`/city/${place.citySlug}`, locale)}
              className="index inline-flex items-center gap-0.5 underline-offset-4 hover:underline"
              style={{ color: "var(--dim)" }}
            >
              {t(m.placeDetail.nearbyMore, { city: cityLabel })}
              <Icon.chevron className="size-2.5" />
            </Link>
          </p>
        </section>
      ) : null}
    </main>
  );
}

/** h:mm:ss 까지 가는 긴 영상이 있어 `timecode`(m:ss)를 그대로 쓰지 못한다. */
function timestampLabel(sec: number): string {
  const h = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${mm}:${String(ss).padStart(2, "0")}`;
}
