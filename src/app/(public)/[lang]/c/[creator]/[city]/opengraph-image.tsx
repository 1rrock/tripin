import { ImageResponse } from "next/og";
import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import { chunkedIn } from "@/shared/api/chunked-in";
import { loadKoreanFont, needsKoreanFont } from "@/shared/seo/og-font";
import { displayCityName } from "@/shared/i18n/display";
import type { Locale } from "@/shared/i18n/config";

/**
 * 조각(채널×도시) 공유 카드 — "{크리에이터}의 {도시}" + "간 곳 {n}곳".
 * 흰 지면(#ffffff), 잉크 타이포, 도시명에 왁스(#c9441a) 밑줄 바. 사진 없음.
 *
 * 채널명·도시명은 실제 표시명이라 로케일과 무관하게 한글일 수 있다(도시는
 * `name_en` 이 없으면 `displayCityName` 이 원문으로 물러난다) — `needsKoreanFont`
 * 로 실제 글자를 보고 폰트 로딩 여부를 가른다.
 */
export const alt = "크리에이터가 간 곳 지도 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOOT = { ko: "Eatripin · 비공식 디렉터리", en: "Eatripin · Unofficial directory" } as const;

/** 조각의 표시 이름과 확정 핀 수. 조각이 없으면 null — 호출부가 안전한 기본 카드로 물러난다. */
const loadPieceSummary = cachePublic(async function loadPieceSummary(
  creatorSlug: string,
  citySlug: string,
) {
  const [{ data: creator }, { data: city }] = await Promise.all([
    supabase.from("creators").select("id, display_name").eq("slug", creatorSlug).maybeSingle(),
    supabase.from("cities").select("id, name, name_en").eq("slug", citySlug).maybeSingle(),
  ]);
  if (!creator || !city) return null;

  const { data: videos } = await supabase.from("videos").select("id").eq("creator_id", creator.id);
  const videoIds = (videos ?? []).map((v) => v.id);
  if (videoIds.length === 0) {
    return { creatorName: creator.display_name, city, count: 0 };
  }

  const links = await chunkedIn(
    (ids) => supabase.from("video_places").select("place_id").in("video_id", ids),
    videoIds,
  );
  const placeIds = [...new Set(links.map((l) => l.place_id))];
  if (placeIds.length === 0) {
    return { creatorName: creator.display_name, city, count: 0 };
  }

  const places = await chunkedIn(
    (ids) =>
      supabase
        .from("places")
        .select("id")
        .in("id", ids)
        .eq("city_id", city.id)
        .eq("map_status", "confirmed"),
    placeIds,
  );

  return { creatorName: creator.display_name, city, count: places.length };
}, ["piece:og-summary"]);

export default async function PieceOpengraphImage({
  params,
}: {
  params: Promise<{ lang: Locale; creator: string; city: string }>;
}) {
  const { lang: locale, creator: creatorSlug, city: citySlug } = await params;
  const foot = FOOT[locale];

  let summary: Awaited<ReturnType<typeof loadPieceSummary>> = null;
  try {
    summary = await loadPieceSummary(creatorSlug, citySlug);
  } catch {
    summary = null;
  }

  const creatorName = summary?.creatorName ?? "여행 유튜버";
  const cityName = summary
    ? displayCityName({ name: summary.city.name, nameEn: summary.city.name_en }, locale)
    : locale === "ko"
      ? "여행지"
      : "Destination";
  const count = summary?.count ?? 0;

  // 소유격만 로케일로 가른다 — 「의」는 받침과 무관하게 항상 맞고, 도시명은
  // 두 로케일 다 왁스 밑줄 바 자리를 유지한다(레이아웃은 그대로).
  const owner = locale === "ko" ? `${creatorName}의` : `${creatorName}'s`;
  const countLine = locale === "ko" ? `${count}곳` : `${count} ${count === 1 ? "place" : "places"}`;
  const glyphs = owner + cityName + countLine + foot + "0123456789";
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
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: titleSize,
                  fontWeight: 800,
                  color: "#171717",
                  marginRight: 22,
                }}
              >
                {owner}
              </div>
              {/* 도시명 — 왁스 밑줄 바 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                <div
                  style={{ display: "flex", fontSize: titleSize, fontWeight: 800, color: "#171717" }}
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
                color: "#6b6b6b",
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
            <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: "0.18em", color: "#171717" }}>
              <span>EA</span>
              <span style={{ color: "#c9441a" }}>T</span>
              <span>RI</span>
              <span style={{ color: "#c9441a" }}>P</span>
              <span>IN</span>
            </div>
            <div style={{ display: "flex", fontSize: 38, color: "#171717", marginTop: 32 }}>
              {`${creatorSlug} / ${citySlug}`}
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#6b6b6b", marginTop: 12 }}>
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
