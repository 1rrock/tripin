import { ImageResponse } from "next/og";
import { loadCityDetail } from "@/shared/api/cities";
import { loadKoreanFont, needsKoreanFont } from "@/shared/seo/og-font";
import { OG_WAX } from "@/shared/seo/og-brand";
import { displayCityName } from "@/shared/i18n/display";
import type { Locale } from "@/shared/i18n/config";

/**
 * 도시 공유 카드 — "{도시}" + "채널 m · n곳". 조각 카드와 같은 문법
 * (흰 지면, 잉크 타이포, 도시명에 왁스 밑줄 바, 사진 없음).
 * 장소 카드가 1차 유입 랜딩이라면 이 카드는 "도쿄 어디 갈까" 류 공유의 랜딩이다.
 *
 * EN 은 한글 폰트를 아예 안 부른다 — 본문이 라틴뿐이라 satori 기본 폰트로 충분하고,
 * 폰트 로딩 실패 시 물러나는 워드마크 폴백은 ko 전용(라틴은 애초에 폰트가 필요 없다).
 */
export const alt = "여행 유튜버가 간 곳 지도 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOOT = { ko: "Eatripin · 비공식 디렉터리", en: "Eatripin · Unofficial directory" } as const;
const FALLBACK_CITY = { ko: "여행지", en: "Destination" } as const;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export default async function CityOpengraphImage({
  params,
}: {
  params: Promise<{ lang: Locale; city: string }>;
}) {
  const { lang: locale, city: citySlug } = await params;
  const isKo = locale === "ko";

  let data: Awaited<ReturnType<typeof loadCityDetail>> = null;
  try {
    data = await loadCityDetail(citySlug);
  } catch {
    data = null;
  }

  const cityName = data ? displayCityName(data, locale) : FALLBACK_CITY[locale];
  const countLine = data
    ? isKo
      ? `채널 ${data.creators.length} · ${data.places.length}곳`
      : `${plural(data.creators.length, "channel", "channels")} · ${plural(data.places.length, "place", "places")}`
    : "";
  const foot = FOOT[locale];

  const glyphs = cityName + countLine + foot + "0123456789";
  // 로케일이 아니라 실제로 그릴 글자로 가른다 — EN 이어도 name_en 이 없는 도시는
  // `displayCityName` 이 한글 원문으로 물러난다.
  const needsKR = needsKoreanFont(glyphs);
  const [bold, regular] = needsKR
    ? await Promise.all([loadKoreanFont(glyphs, 800), loadKoreanFont(glyphs, 500)])
    : [null, null];
  const showRich = !needsKR || Boolean(bold);

  const fonts = bold
    ? [
        { name: "KR", data: bold, weight: 800 as const, style: "normal" as const },
        ...(regular
          ? [{ name: "KR", data: regular, weight: 500 as const, style: "normal" as const }]
          : []),
      ]
    : [];

  const titleSize = cityName.length > 8 ? 72 : 96;

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
          padding: "76px 84px",
          fontFamily: "KR",
          letterSpacing: "-0.035em",
        }}
      >
        {showRich ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            {/* 도시명 — 왁스 밑줄 바 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
              <div
                style={{ display: "flex", fontSize: titleSize, fontWeight: 800, color: "#171717" }}
              >
                {cityName}
              </div>
              <div style={{ display: "flex", height: 18, background: OG_WAX, marginTop: 4 }} />
            </div>
            {countLine ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 40,
                  fontWeight: 500,
                  color: "#6b6b6b",
                  marginTop: 40,
                }}
              >
                {countLine}
              </div>
            ) : null}
          </div>
        ) : (
          /* 한글 폰트를 못 받았을 때 — 두부 대신 워드마크·슬러그로 물러난다 */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
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
            <div style={{ display: "flex", fontSize: 38, color: "#171717", marginTop: 32 }}>
              {citySlug}
            </div>
          </div>
        )}

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
