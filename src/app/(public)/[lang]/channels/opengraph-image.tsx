import { ImageResponse } from "next/og";
import { loadHomeFeed } from "@/shared/api/home";
import { loadKoreanFont, needsKoreanFont } from "@/shared/seo/og-font";
import type { Locale } from "@/shared/i18n/config";

/**
 * 채널 인덱스 공유 카드 — "여행 유튜버 채널 {n}개" + 대표 채널명 몇 개.
 * 흰 지면(#ffffff), 잉크 타이포, 키 프레이즈에 왁스(#c9441a) 밑줄 바. 사진 없음.
 *
 * 대표 채널명(names)은 실제 채널명이라 로케일과 무관하게 한글일 수 있다 —
 * `needsKoreanFont` 로 실제 글자를 보고 폰트 로딩 여부를 가른다(로케일만 보면
 * EN 카드에서 한글 채널명이 두부로 뜬다).
 */
export const alt = "여행 유튜버 채널 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEAD = { ko: "여행 유튜버", en: "Travel YouTubers" } as const;
const FOOT = { ko: "Eatripin · 비공식 디렉터리", en: "Eatripin · Unofficial directory" } as const;

export default async function ChannelsOpengraphImage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const head = HEAD[locale];
  const foot = FOOT[locale];

  const { creators } = await loadHomeFeed();
  const count = creators.length;
  const names = creators
    .slice(0, 3)
    .map((c) => c.displayName)
    .join(" · ");

  const countLine =
    locale === "ko" ? `${count}개 채널` : `${count} ${count === 1 ? "channel" : "channels"}`;
  const glyphs = head + countLine + names + foot + "0123456789";
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
              {head}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", marginTop: 10 }}>
              {/* 채널 수 — 왁스 밑줄 바 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#171717" }}>
                  {countLine}
                </div>
                <div style={{ display: "flex", height: 18, background: "#c9441a", marginTop: 4 }} />
              </div>
            </div>
            {names ? (
              <div
                style={{ display: "flex", fontSize: 32, fontWeight: 500, color: "#6b6b6b", marginTop: 34 }}
              >
                {names}
              </div>
            ) : null}
          </div>
        ) : (
          /* 한글 폰트를 못 받았을 때 — 두부 대신 라틴 워드마크·숫자로 물러난다 */
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
              {`${count} travel channels`}
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
