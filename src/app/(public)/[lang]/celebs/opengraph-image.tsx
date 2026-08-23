import { ImageResponse } from "next/og";
import { loadHomeFeed } from "@/shared/api/home";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { loadKoreanFont, needsKoreanFont } from "@/shared/seo/og-font";
import { OG_WAX } from "@/shared/seo/og-brand";
import type { Locale } from "@/shared/i18n/config";

/**
 * 연예인 장소 인덱스 공유 카드 — "연예인이 간 장소 {n}곳" + 대표 인물명 몇 개.
 * 흰 지면(#ffffff), 잉크 타이포, 키 프레이즈에 왁스(OG_WAX) 밑줄 바. 사진 없음.
 *
 * EN 은 한글 폰트를 아예 안 부른다 — 본문이 라틴뿐이라 satori 기본 폰트로 충분하고,
 * 폰트 로딩 실패 시 물러나는 워드마크 폴백은 ko 전용(라틴은 애초에 폰트가 필요 없다).
 */
export const alt = "연예인이 간 장소 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOOT = { ko: "Eatripin · 비공식 디렉터리", en: "Eatripin · Unofficial directory" } as const;

export default async function CelebsOpengraphImage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const isKo = locale === "ko";
  const m = getDictionary(locale);
  const head = m.celebs.title;
  const foot = FOOT[locale];

  const { celebritySpots } = await loadHomeFeed();
  const count = celebritySpots.length;

  /* 등장 순서대로 인물명 앞 3명 — 중복 제거(같은 인물이 spots 여러 개를 낸다) */
  const names: string[] = [];
  for (const s of celebritySpots) {
    const name = isKo ? s.personName : (s.personNameEn ?? s.personName);
    if (names.includes(name)) continue;
    names.push(name);
    if (names.length >= 3) break;
  }
  const namesLine = names.join(" · ");

  const countLine = isKo ? `${count}곳` : `${count} ${count === 1 ? "spot" : "spots"}`;
  const glyphs = head + countLine + namesLine + foot + "0123456789";
  // 로케일이 아니라 실제로 그릴 글자로 가른다 — EN 이어도 personNameEn 이 없는
  // 인물은 namesLine 에 한글 원문이 그대로 남는다(위 루프의 `?? s.personName`).
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
              {/* 장소 수 — 왁스 밑줄 바 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#171717" }}>
                  {countLine}
                </div>
                <div style={{ display: "flex", height: 18, background: OG_WAX, marginTop: 4 }} />
              </div>
            </div>
            {namesLine ? (
              <div
                style={{ display: "flex", fontSize: 32, fontWeight: 500, color: "#6b6b6b", marginTop: 34 }}
              >
                {namesLine}
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
              <span style={{ color: OG_WAX }}>T</span>
              <span>RI</span>
              <span style={{ color: OG_WAX }}>P</span>
              <span>IN</span>
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#6b6b6b", marginTop: 34 }}>
              {`${count} spots visited by celebrities`}
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
