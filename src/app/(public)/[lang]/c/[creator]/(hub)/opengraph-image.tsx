import { ImageResponse } from "next/og";
import { loadCreatorMap } from "@/shared/api/creator-hub";
import { loadKoreanFont, needsKoreanFont } from "@/shared/seo/og-font";
import { OG_WAX } from "@/shared/seo/og-brand";
import type { Locale } from "@/shared/i18n/config";

/**
 * 채널 허브 공유 카드 — "{크리에이터}" + "간 곳 {n}곳 · 도시 {m}곳".
 * 흰 지면(#ffffff), 잉크 타이포, 채널명에 왁스(OG_WAX) 밑줄 바. 사진 없음.
 *
 * 조각(`[creator]/[city]/opengraph-image.tsx`)이 채널×도시 한 켤레를 다룬다면,
 * 이 카드는 그 채널의 전체 지도를 대표한다 — 도시가 아니라 사람이 헤드라인이다.
 *
 * 채널명(creatorName)은 실제 표시명이라 로케일과 무관하게 한글일 수 있다 —
 * `needsKoreanFont` 로 실제 글자를 보고 폰트 로딩 여부를 가른다.
 */
export const alt = "크리에이터의 여행 지도 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOOT = { ko: "Eatripin · 비공식 디렉터리", en: "Eatripin · Unofficial directory" } as const;

export default async function CreatorHubOpengraphImage({
  params,
}: {
  params: Promise<{ lang: Locale; creator: string }>;
}) {
  const { lang: locale, creator: creatorSlug } = await params;
  const foot = FOOT[locale];

  let data: Awaited<ReturnType<typeof loadCreatorMap>> = null;
  try {
    data = await loadCreatorMap(creatorSlug);
  } catch {
    data = null;
  }

  const creatorName = data?.creator.display_name ?? "여행 유튜버";
  const placeCount = data?.places.length ?? 0;
  const cityCount = data?.cities.length ?? 0;

  const statsLine =
    locale === "ko"
      ? `간 곳 ${placeCount}곳 · 도시 ${cityCount}곳`
      : `${placeCount} ${placeCount === 1 ? "place" : "places"} · ${cityCount} ${cityCount === 1 ? "city" : "cities"}`;
  const glyphs = creatorName + statsLine + foot + "0123456789";
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

  // 이름이 길면 줄바꿈 대신 글자 크기를 낮춘다 — 카드에서 잘리는 것보다 낫다
  const titleSize = creatorName.length > 10 ? 68 : 86;

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
            {/* 채널명 — 왁스 밑줄 바 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, color: "#171717" }}>
                {creatorName}
              </div>
              <div style={{ display: "flex", height: 18, background: OG_WAX, marginTop: 4 }} />
            </div>
            {placeCount > 0 ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 40,
                  fontWeight: 500,
                  color: "#6b6b6b",
                  marginTop: 40,
                }}
              >
                {statsLine}
              </div>
            ) : null}
          </div>
        ) : (
          /* 한글 폰트를 못 받았을 때 — 두부 대신 워드마크·슬러그·숫자로 물러난다 */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: "0.18em", color: "#171717" }}>
              <span>EA</span>
              <span style={{ color: OG_WAX }}>T</span>
              <span>RI</span>
              <span style={{ color: OG_WAX }}>P</span>
              <span>IN</span>
            </div>
            <div style={{ display: "flex", fontSize: 38, color: "#171717", marginTop: 32 }}>
              {creatorSlug}
            </div>
            {placeCount > 0 ? (
              <div style={{ display: "flex", fontSize: 34, color: "#6b6b6b", marginTop: 12 }}>
                {`${placeCount} places / ${cityCount} cities`}
              </div>
            ) : null}
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
