import { ImageResponse } from "next/og";
import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";

/**
 * 조각(채널×도시) 공유 카드 — "{크리에이터}의 {도시}" + "간 곳 {n}곳".
 * 웜 페이퍼: #f0e8db 지면, 잉크 타이포, 도시명에 왁스(#c9441a) 밑줄 바. 사진 없음.
 */
export const alt = "크리에이터가 간 곳 지도 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

/** 조각의 표시 이름과 확정 핀 수. 조각이 없으면 null — 호출부가 안전한 기본 카드로 물러난다. */
const loadPieceSummary = cachePublic(async function loadPieceSummary(
  creatorSlug: string,
  citySlug: string,
) {
  const [{ data: creator }, { data: city }] = await Promise.all([
    supabase.from("creators").select("id, display_name").eq("slug", creatorSlug).maybeSingle(),
    supabase.from("cities").select("id, name").eq("slug", citySlug).maybeSingle(),
  ]);
  if (!creator || !city) return null;

  const { data: videos } = await supabase.from("videos").select("id").eq("creator_id", creator.id);
  const videoIds = (videos ?? []).map((v) => v.id);
  if (videoIds.length === 0) {
    return { creatorName: creator.display_name, cityName: city.name, count: 0 };
  }

  const { data: links } = await supabase
    .from("video_places")
    .select("place_id")
    .in("video_id", videoIds);
  const placeIds = [...new Set((links ?? []).map((l) => l.place_id))];
  if (placeIds.length === 0) {
    return { creatorName: creator.display_name, cityName: city.name, count: 0 };
  }

  const { data: places } = await supabase
    .from("places")
    .select("id")
    .in("id", placeIds)
    .eq("city_id", city.id)
    .eq("map_status", "confirmed");

  return { creatorName: creator.display_name, cityName: city.name, count: (places ?? []).length };
}, ["piece:og-summary"]);

export default async function PieceOpengraphImage({
  params,
}: {
  params: Promise<{ creator: string; city: string }>;
}) {
  const { creator: creatorSlug, city: citySlug } = await params;

  let summary: Awaited<ReturnType<typeof loadPieceSummary>> = null;
  try {
    summary = await loadPieceSummary(creatorSlug, citySlug);
  } catch {
    summary = null;
  }

  const creatorName = summary?.creatorName ?? "여행 유튜버";
  const cityName = summary?.cityName ?? "여행지";
  const count = summary?.count ?? 0;

  const owner = `${creatorName}의`;
  const countLine = `${count}곳`;
  const glyphs = owner + cityName + countLine + FOOT + "0123456789";
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

  // 이름이 길면 줄바꿈 대신 글자 크기를 낮춘다 — 카드에서 잘리는 것보다 낫다
  const titleSize = owner.length + cityName.length > 16 ? 68 : 86;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f0e8db",
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
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: titleSize,
                  fontWeight: 800,
                  color: "#2a2118",
                  marginRight: 22,
                }}
              >
                {owner}
              </div>
              {/* 도시명 — 왁스 밑줄 바 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                <div
                  style={{ display: "flex", fontSize: titleSize, fontWeight: 800, color: "#2a2118" }}
                >
                  {cityName}
                </div>
                <div style={{ display: "flex", height: 18, background: "#c9441a", marginTop: 4 }} />
              </div>
            </div>
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
            <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: "0.18em", color: "#2a2118" }}>
              <span>EA</span>
              <span style={{ color: "#c9441a" }}>T</span>
              <span>RI</span>
              <span style={{ color: "#c9441a" }}>P</span>
              <span>IN</span>
            </div>
            <div style={{ display: "flex", fontSize: 38, color: "#2a2118", marginTop: 32 }}>
              {`${creatorSlug} / ${citySlug}`}
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#6e5c4a", marginTop: 12 }}>
              {`${count} places`}
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
