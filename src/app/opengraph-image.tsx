import { ImageResponse } from "next/og";

/**
 * 기본 공유 카드 (웜 페이퍼) — #f0e8db 지면 + 잉크 타이포 + 왁스(#c9441a) 밑줄 바.
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

/**
 * satori 에는 한글 폰트가 없다 — 없으면 두부(tofu)로 렌더된다.
 * 구글 폰트 css2 API 를 **구형 UA** 로 부르면 woff2 대신 truetype 을 주고,
 * `text=` 로 실제 쓰는 글자만 서브셋해 수 KB 로 떨어진다.
 * 실패하면 null 을 돌려주고 호출부가 라틴 전용 레이아웃으로 물러난다.
 *
 * ⚠️ UA 에 MSIE 토큰을 넣으면 EOT 를 준다 — satori 가 못 읽고 렌더가 통째로 죽는다.
 *    "Mozilla/4.0" 만 보낼 것. 아래 시그니처 검사가 최후 방어선이다.
 */
async function loadKoreanFont(text: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Gothic+A1:wght@${weight}&text=${encodeURIComponent(text)}`,
      { headers: { "User-Agent": "Mozilla/4.0" } },
    );
    if (!css.ok) return null;
    const url = /src:\s*url\(([^)]+)\)\s*format\('truetype'\)/.exec(await css.text())?.[1];
    if (!url) return null;
    const font = await fetch(url);
    if (!font.ok) return null;
    const data = await font.arrayBuffer();
    return isOpenType(data) ? data : null;
  } catch {
    return null;
  }
}

/** sfnt 매직 넘버 — 0x00010000(TrueType) / "true" / "OTTO". 아니면 satori 가 throw 한다. */
function isOpenType(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false;
  const tag = new DataView(data).getUint32(0);
  return tag === 0x00010000 || tag === 0x74727565 || tag === 0x4f54544f;
}

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
            <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#2a2118" }}>
              {HEAD_A}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", marginTop: 10 }}>
              {/* 키 프레이즈 — 왁스 밑줄 바 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", fontSize: 82, fontWeight: 800, color: "#2a2118" }}>
                  {HEAD_B}
                </div>
                <div style={{ display: "flex", height: 18, background: "#c9441a", marginTop: 4 }} />
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 82,
                  fontWeight: 800,
                  color: "#2a2118",
                  marginLeft: 22,
                }}
              >
                {HEAD_C}
              </div>
            </div>
            <div
              style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "#6e5c4a", marginTop: 34 }}
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
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: "0.18em", color: "#2a2118" }}>
              <span>EA</span>
              <span style={{ color: "#c9441a" }}>T</span>
              <span>RI</span>
              <span style={{ color: "#c9441a" }}>P</span>
              <span>IN</span>
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#6e5c4a", marginTop: 34 }}>
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
