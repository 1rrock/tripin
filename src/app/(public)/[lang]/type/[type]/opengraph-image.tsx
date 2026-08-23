import { ImageResponse } from "next/og";
import { loadTypeDetail, parsePlaceType } from "@/shared/api/place-types";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { loadKoreanFont, needsKoreanFont } from "@/shared/seo/og-font";
import type { Locale } from "@/shared/i18n/config";

/**
 * 종류 상세 공유 카드 — "{종류}" + "{n}곳 · 도시 {m}".
 * 흰 지면(#ffffff), 잉크 타이포, 종류 라벨에 왁스(#c9441a) 밑줄 바. 사진 없음.
 * 알 수 없는 type 파라미터도 죽지 않고 일반 카드로 물러난다 — 크롤러가 임의 경로로 찔러본다.
 *
 * EN 은 한글 폰트를 아예 안 부른다 — 본문이 라틴뿐이라 satori 기본 폰트로 충분하고,
 * 폰트 로딩 실패 시 물러나는 워드마크 폴백은 ko 전용(라틴은 애초에 폰트가 필요 없다).
 */
export const alt = "여행 유튜버가 간 곳 종류별 지도 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOOT = { ko: "Eatripin · 비공식 디렉터리", en: "Eatripin · Unofficial directory" } as const;
const FALLBACK_LABEL = { ko: "여행지", en: "Destination" } as const;

export default async function TypeOpengraphImage({
  params,
}: {
  params: Promise<{ lang: Locale; type: string }>;
}) {
  const { lang: locale, type: rawType } = await params;
  const m = getDictionary(locale);
  const type = parsePlaceType(rawType);

  let label: string = FALLBACK_LABEL[locale];
  let placeCount = 0;
  let cityCount = 0;
  if (type) {
    try {
      const data = await loadTypeDetail(type);
      if (data) {
        label = m.placeTypes[type];
        placeCount = data.placeCount;
        cityCount = data.cityCount;
      }
    } catch {
      // 로딩 실패 — 일반 카드로 물러난다
    }
  }

  const foot = FOOT[locale];
  const statsLine = t(m.typeDetail.stats, { places: placeCount, cities: cityCount });
  const glyphs = label + statsLine + foot + "0123456789";
  // 로케일이 아니라 실제로 그릴 글자로 가른다 — label 은 사전 값이라 순수하지만,
  // 다른 카드와 같은 판정을 써서 일관되게 둔다.
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
            {/* 종류 라벨 — 왁스 밑줄 바 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#171717" }}>
                {label}
              </div>
              <div style={{ display: "flex", height: 18, background: "#c9441a", marginTop: 4 }} />
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
              <span style={{ color: "#c9441a" }}>T</span>
              <span>RI</span>
              <span style={{ color: "#c9441a" }}>P</span>
              <span>IN</span>
            </div>
            <div style={{ display: "flex", fontSize: 38, color: "#171717", marginTop: 32 }}>
              {rawType}
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
