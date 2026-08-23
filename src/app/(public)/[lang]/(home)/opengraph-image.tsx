import { ImageResponse } from "next/og";
import { loadKoreanFont, needsKoreanFont } from "@/shared/seo/og-font";
import { OG_WAX } from "@/shared/seo/og-brand";
import type { Locale } from "@/shared/i18n/config";

/**
 * 홈 공유 카드 — 사이트 전체 피치. 앱 루트 기본 카드(`src/app/opengraph-image.tsx`)와
 * 같은 헤드라인 문법(흰 지면, 잉크 타이포, 키 프레이즈에 왁스 밑줄 바, 사진 없음)을
 * 쓰되 로케일별로 갈린다 — 루트 파일은 `(public)/[lang]` 트리에 상속되지 않는다
 * (AUDIT-2026-08-23: `/`·`/en`·`/map`·영상 페이지에 og:image 가 통째로 없었다).
 */
export const alt = "여행 유튜버가 간 곳만 지도로 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COPY = {
  ko: {
    headA: "여행 유튜버가",
    headB: "간 곳만",
    headC: "지도로.",
    sub: "모든 장소에 출처 영상·타임스탬프",
    foot: "Eatripin · 비공식 디렉터리",
  },
  en: {
    headA: "Only the places",
    headB: "travel YouTubers",
    headC: "visited.",
    sub: "Every place has a source video and timestamp",
    foot: "Eatripin · Unofficial directory",
  },
} as const;

export default async function HomeOpengraphImage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const c = COPY[locale];

  const glyphs = c.headA + c.headB + c.headC + c.sub + c.foot;
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
            <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#171717" }}>
              {c.headA}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", marginTop: 10 }}>
              {/* 키 프레이즈 — 왁스 밑줄 바 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#171717" }}>
                  {c.headB}
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
                {c.headC}
              </div>
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
          {showRich ? c.foot : "EATRIPIN"}
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
