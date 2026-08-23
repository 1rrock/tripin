import { ImageResponse } from "next/og";
import { loadKoreanFont } from "@/shared/seo/og-font";
import { OG_WAX } from "@/shared/seo/og-brand";

/**
 * 기본 공유 카드 — 흰 지면(#ffffff) + 잉크 타이포 + 왁스(OG_WAX) 밑줄 바.
 * 사진·그라디언트 없음. 지면과 타이포 위계만으로 선다.
 */
export const alt = "여행 유튜버가 간 곳만 지도로 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEAD_A = "여행 유튜버가";
const HEAD_B = "간 곳만";
const HEAD_C = "지도로.";
const SUB = "모든 장소에 출처 영상·타임스탬프";
const FOOT = "Eatripin · 비공식 디렉터리";

export default async function OpengraphImage() {
  const glyphs = HEAD_A + HEAD_B + HEAD_C + SUB + FOOT;
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
            <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#171717" }}>
              {HEAD_A}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", marginTop: 10 }}>
              {/* 키 프레이즈 — 왁스 밑줄 바 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#171717" }}>
                  {HEAD_B}
                </div>
                <div style={{ display: "flex", height: 18, background: OG_WAX, marginTop: 4 }} />
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 82,
                  fontWeight: 800,
                  color: "#171717",
                  marginLeft: 22,
                }}
              >
                {HEAD_C}
              </div>
            </div>
            <div
              style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "#6b6b6b", marginTop: 34 }}
            >
              {SUB}
            </div>
          </div>
        ) : (
          /* 한글 폰트를 못 받았을 때 — 두부 대신 라틴 워드마크로 물러난다 */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            {/* 라틴 폴백 — EATRIPIN, 공유 T·P 왁스 */}
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: "0.18em", color: "#171717" }}>
              <span>EA</span>
              <span style={{ color: OG_WAX }}>T</span>
              <span>RI</span>
              <span style={{ color: OG_WAX }}>P</span>
              <span>IN</span>
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#6b6b6b", marginTop: 34 }}>
              Maps from travel YouTubers
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
          {bold ? FOOT : "EATRIPIN"}
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
