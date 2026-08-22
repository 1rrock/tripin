import { ImageResponse } from "next/og";
import { loadCityDetail } from "@/shared/api/cities";
import { loadKoreanFont } from "@/shared/seo/og-font";

/**
 * 도시 공유 카드 — "{도시}" + "채널 m · n곳". 조각 카드와 같은 문법
 * (흰 지면, 잉크 타이포, 도시명에 왁스 밑줄 바, 사진 없음).
 * 장소 카드가 1차 유입 랜딩이라면 이 카드는 "도쿄 어디 갈까" 류 공유의 랜딩이다.
 */
export const alt = "여행 유튜버가 간 곳 지도 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOOT = "Eatripin · 비공식 디렉터리";

export default async function CityOpengraphImage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: citySlug } = await params;

  let data: Awaited<ReturnType<typeof loadCityDetail>> = null;
  try {
    data = await loadCityDetail(citySlug);
  } catch {
    data = null;
  }

  const cityName = data?.name ?? "여행지";
  const countLine = data ? `채널 ${data.creators.length} · ${data.places.length}곳` : "";

  const glyphs = cityName + countLine + FOOT + "0123456789";
  const [bold, regular] = await Promise.all([
    loadKoreanFont(glyphs, 800),
    loadKoreanFont(glyphs, 500),
  ]);

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
        {bold ? (
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
                style={{ display: "flex", fontSize: titleSize, fontWeight: 800, color: "#2a2118" }}
              >
                {cityName}
              </div>
              <div style={{ display: "flex", height: 18, background: "#c9441a", marginTop: 4 }} />
            </div>
            {countLine ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 40,
                  fontWeight: 500,
                  color: "#6e5c4a",
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
                color: "#2a2118",
              }}
            >
              <span>EA</span>
              <span style={{ color: "#c9441a" }}>T</span>
              <span>RI</span>
              <span style={{ color: "#c9441a" }}>P</span>
              <span>IN</span>
            </div>
            <div style={{ display: "flex", fontSize: 38, color: "#2a2118", marginTop: 32 }}>
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
            color: "#6e5c4a",
            letterSpacing: "0.06em",
          }}
        >
          {bold ? FOOT : "EATRIPIN"}
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
