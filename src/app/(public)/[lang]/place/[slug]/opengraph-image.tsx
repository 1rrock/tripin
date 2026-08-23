import { ImageResponse } from "next/og";
import { loadPlaceBySlug } from "@/shared/api/places";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { displayPlaceName, displayCityName } from "@/shared/i18n/display";
import { loadKoreanFont, needsKoreanFont } from "@/shared/seo/og-font";
import { OG_WAX } from "@/shared/seo/og-brand";
import { thumbMax, thumbSmall } from "@/shared/lib/youtube";
import type { Locale } from "@/shared/i18n/config";

/**
 * 장소 낱개 공유 카드 — 사이트맵의 87%가 이 페이지인데 지금까지 루트 폴백
 * 브랜드 카드로 나갔다. 카카오톡·인스타 DM 에 붙는 카드가 곧 유입 전환율이라,
 * "무슨 가게인지"가 카드에서 끝나야 한다: 상호명 + 도시·종류 + 원본 썸네일.
 *
 * 썸네일은 유튜브 원본 16:9 그대로 프레임에 담는다 — 크롭·오버레이는
 * §III.E.3 위반(PRODUCT.md 원칙 1). 텍스트는 썸네일 **밖** 왼쪽 칸에 선다.
 *
 * 이전엔 `loadPlaceBySlug(slug, "ko")` 로 로케일을 못박아 EN 카드에도 한국어
 * 요약이 나갔다 — `page.tsx` 와 같은 방식(`displayPlaceName`·`displayCityName`)
 * 으로 `params.lang` 을 실제로 쓴다. 상호명·도시명은 사용자 데이터라 EN 이어도
 * 현지어(nameLocal)·영문명(nameEn)이 없으면 한글 원문으로 물러난다 —
 * `needsKoreanFont` 로 실제 글자를 보고 폰트 로딩 여부를 가른다.
 */
export const alt = "여행 유튜버가 간 곳 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOOT = { ko: "Eatripin · 비공식 디렉터리", en: "Eatripin · Unofficial directory" } as const;
const FALLBACK_NAME = {
  ko: "여행 유튜버가 간 곳",
  en: "A place travel YouTubers visited",
} as const;

/**
 * maxres 는 업로더가 HD 썸네일을 올렸을 때만 진짜가 온다 — 없으면 120×90
 * 회색 플레이스홀더가 **200 으로** 내려와서 상태코드로는 못 가른다. 화면단
 * Thumb 은 onError 로 물러나지만 satori 에는 그 길이 없으므로, 서버에서 받아
 * 크기로 가른다(플레이스홀더는 ~1KB). mq(320×180)는 항상 존재하는 최후선이다.
 */
async function loadThumb(youtubeId: string): Promise<string | null> {
  for (const [url, minBytes] of [
    [thumbMax(youtubeId), 10_000],
    [thumbSmall(youtubeId), 0],
  ] as const) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.arrayBuffer();
      if (data.byteLength <= minBytes) continue;
      return `data:image/jpeg;base64,${Buffer.from(data).toString("base64")}`;
    } catch {
      continue;
    }
  }
  return null;
}

/** 페이지 라우트와 같은 규칙 — Next 는 비ASCII 세그먼트를 인코딩된 채로 넘긴다. */
function routeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw).normalize("NFC");
  } catch {
    return "";
  }
}

export default async function PlaceOpengraphImage({
  params,
}: {
  params: Promise<{ lang: Locale; slug: string }>;
}) {
  const { lang: locale, slug } = await params;
  const foot = FOOT[locale];

  let place: Awaited<ReturnType<typeof loadPlaceBySlug>> = null;
  try {
    place = await loadPlaceBySlug(routeSlug(slug), locale);
  } catch {
    place = null;
  }

  const m = getDictionary(locale);
  const name = place ? displayPlaceName(place, locale) : FALLBACK_NAME[locale];
  const cityLabel = place
    ? displayCityName({ name: place.cityName, nameEn: place.cityNameEn }, locale)
    : "";
  const metaLine = place ? `${cityLabel} · ${m.placeTypes[place.placeType]}` : "";
  const hero = place?.sources[0] ?? null;

  const glyphs = name + metaLine + foot;
  const needsKR = needsKoreanFont(glyphs);
  const [bold, regular, thumb] = await Promise.all([
    needsKR ? loadKoreanFont(glyphs, 800) : Promise.resolve(null),
    needsKR ? loadKoreanFont(glyphs, 500) : Promise.resolve(null),
    hero ? loadThumb(hero.youtubeId) : Promise.resolve(null),
  ]);
  const showRich = !needsKR || Boolean(bold);

  const fonts = bold
    ? [
        { name: "KR", data: bold, weight: 800 as const, style: "normal" as const },
        ...(regular
          ? [{ name: "KR", data: regular, weight: 500 as const, style: "normal" as const }]
          : []),
      ]
    : [];

  /* 상호명이 길면 줄바꿈 대신 글자 크기를 낮춘다 — 카드에서 잘리는 것보다 낫다 */
  const titleSize = name.length > 14 ? 56 : name.length > 8 ? 68 : 80;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "68px 76px",
          fontFamily: "KR",
          letterSpacing: "-0.035em",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 56 }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {showRich ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: titleSize,
                    fontWeight: 800,
                    color: "#171717",
                    lineHeight: 1.15,
                  }}
                >
                  {name}
                </div>
                {/* 상호명 — 왁스 밑줄 바(조각 카드와 같은 문법) */}
                <div
                  style={{
                    display: "flex",
                    height: 16,
                    alignSelf: "stretch",
                    background: OG_WAX,
                    marginTop: 6,
                  }}
                />
                {metaLine ? (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 36,
                      fontWeight: 500,
                      color: "#6b6b6b",
                      marginTop: 32,
                    }}
                  >
                    {metaLine}
                  </div>
                ) : null}
              </div>
            ) : (
              /* 한글 폰트를 못 받았을 때 — 두부 대신 워드마크·슬러그로 물러난다 */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 64,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: "#171717",
                  }}
                >
                  <span>EA</span>
                  <span style={{ color: OG_WAX }}>T</span>
                  <span>RI</span>
                  <span style={{ color: OG_WAX }}>P</span>
                  <span>IN</span>
                </div>
                <div style={{ display: "flex", fontSize: 34, color: "#6b6b6b", marginTop: 28 }}>
                  {routeSlug(slug) || "place"}
                </div>
              </div>
            )}
          </div>

          {thumb ? (
            <div
              style={{
                display: "flex",
                width: 480,
                height: 270,
                flexShrink: 0,
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 0 0 1px rgba(23,23,23,0.12)",
              }}
            >
              <img src={thumb} alt="" width={480} height={270} style={{ objectFit: "cover" }} />
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 26,
            fontWeight: 500,
            color: "#6b6b6b",
            letterSpacing: "0.06em",
          }}
        >
          {showRich ? foot : "EATRIPIN"}
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
