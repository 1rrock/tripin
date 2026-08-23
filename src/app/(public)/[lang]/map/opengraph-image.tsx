import { ImageResponse } from "next/og";
import { loadKoreanFont, needsKoreanFont } from "@/shared/seo/og-font";
import type { Locale } from "@/shared/i18n/config";

/**
 * 지도 공유 카드 — 홈 카드가 "무엇"이면 이 카드는 "어떻게"(도시·종류·채널로 좁혀
 * 지도에서 고른다)를 판다. 흰 지면, 잉크 타이포, 키 프레이즈에 왁스 밑줄 바.
 * 사진 없음 — `/map` 자체가 지도라 스크린샷을 굳이 흉내 내지 않는다.
 */
export const alt = "여행 유튜버가 간 곳 지도 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COPY = {
  ko: {
    headA: "여행 유튜버가 간 곳,",
    headB: "한눈에.",
    sub: "지역·종류·채널로 좁혀보세요",
    foot: "Eatripin · 비공식 디렉터리",
  },
  en: {
    headA: "Every place,",
    headB: "one map.",
    sub: "Filter by city, type, or channel",
    foot: "Eatripin · Unofficial directory",
  },
} as const;

export default async function MapOpengraphImage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const c = COPY[locale];

  const glyphs = c.headA + c.headB + c.sub + c.foot;
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

  const headSize = c.headA.length > 12 ? 58 : 72;

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
            <div style={{ display: "flex", fontSize: headSize, fontWeight: 800, color: "#171717" }}>
              {c.headA}
            </div>
            {/* 키 프레이즈 — 왁스 밑줄 바 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", marginTop: 6 }}>
              <div style={{ display: "flex", fontSize: headSize, fontWeight: 800, color: "#171717" }}>
                {c.headB}
              </div>
              <div style={{ display: "flex", height: 18, background: "#c9441a", marginTop: 4 }} />
            </div>
            <div
              style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "#6b6b6b", marginTop: 34 }}
            >
              {c.sub}
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
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: "0.18em", color: "#171717" }}>
              <span>EA</span>
              <span style={{ color: "#c9441a" }}>T</span>
              <span>RI</span>
              <span style={{ color: "#c9441a" }}>P</span>
              <span>IN</span>
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#6b6b6b", marginTop: 34 }}>
              Map of places travel YouTubers visited
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
          {showRich ? c.foot : "EATRIPIN"}
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
