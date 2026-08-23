import { ImageResponse } from "next/og";
import { loadVideoDetail } from "@/shared/api/videos";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { loadKoreanFont, needsKoreanFont } from "@/shared/seo/og-font";
import { thumbMax, thumbSmall } from "@/shared/lib/youtube";
import type { Locale } from "@/shared/i18n/config";

/**
 * 영상 공유 카드 — 영상 제목(유튜브 원본 그대로) + 채널명·정거장 수 + 원본 썸네일.
 * `place/[slug]/opengraph-image.tsx` 와 같은 문법(사진 + 왼쪽 텍스트 칸) — 이
 * 화면의 헤드라인은 상호명이 아니라 영상 제목이라 그 축만 바뀐다.
 *
 * 썸네일은 유튜브 원본 16:9 그대로 프레임에 담는다 — 크롭·오버레이는
 * §III.E.3 위반(PRODUCT.md 원칙 1). place 카드가 쓰는 `loadThumb` 판정을 그대로 쓴다.
 *
 * EN 은 한글 폰트를 아예 안 부른다 — 채널명·통계 문구만 로케일이 갈리고 영상
 * 제목 자체는 원본 그대로라 한글이 섞여 있을 수 있다. 그래서 제목에 한글이 있으면
 * ko 든 en 이든 항상 한글 폰트를 부른다(`needsKoreanFont`, 실제 글자 기준 판정) —
 * 순수 라틴 제목일 때만 건너뛴다.
 */
export const alt = "여행 유튜버 영상 속 장소 — Eatripin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOOT = { ko: "Eatripin · 비공식 디렉터리", en: "Eatripin · Unofficial directory" } as const;

/**
 * maxres 는 업로더가 HD 썸네일을 올렸을 때만 진짜가 온다 — 없으면 120×90
 * 회색 플레이스홀더가 **200 으로** 내려와서 상태코드로는 못 가른다. 서버에서
 * 받아 크기로 가른다(플레이스홀더는 ~1KB). mq(320×180)는 항상 존재하는 최후선이다.
 */
async function loadThumb(youtubeId: string): Promise<string | null> {
  for (const [url, minBytes] of [
    [thumbMax(youtubeId), 10_000],
    [thumbSmall(youtubeId), 0],
  ] as const) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.arrayBuffer();
      if (data.byteLength <= minBytes) continue;
      return `data:image/jpeg;base64,${Buffer.from(data).toString("base64")}`;
    } catch {
      continue;
    }
  }
  return null;
}

export default async function VideoOpengraphImage({
  params,
}: {
  params: Promise<{ lang: Locale; creator: string; videoId: string }>;
}) {
  const { lang: locale, creator: creatorSlug, videoId } = await params;
  const m = getDictionary(locale);
  const foot = FOOT[locale];

  let data: Awaited<ReturnType<typeof loadVideoDetail>> = null;
  try {
    data = await loadVideoDetail(creatorSlug, videoId);
  } catch {
    data = null;
  }

  const title = data?.video.title ?? "여행 유튜버 영상";
  const metaLine = data
    ? `${data.creator.displayName} · ${t(m.video.statsStops, { n: data.video.stopCount })}`
    : "";
  const glyphs = title + metaLine + foot + "0123456789";
  // 제목이 유튜브 원본 그대로라 로케일과 무관하게 한글이 섞일 수 있다 — 있으면 부른다.
  const needsKR = needsKoreanFont(glyphs);
  const [bold, regular, thumb] = await Promise.all([
    needsKR ? loadKoreanFont(glyphs, 800) : Promise.resolve(null),
    needsKR ? loadKoreanFont(glyphs, 500) : Promise.resolve(null),
    data ? loadThumb(data.video.youtubeId) : Promise.resolve(null),
  ]);
  const showRich = !needsKR || Boolean(bold);

  const fonts = bold
    ? [
        { name: "KR", data: bold, weight: 800 as const, style: "normal" as const },
        ...(regular
          ? [{ name: "KR", data: regular, weight: 500 as const, style: "normal" as const }]
          : []),
      ]
    : [];

  /* 제목이 길면 줄바꿈 대신 글자 크기를 낮춘다 — 영상 제목 평균 41자, 상호명보다 길다 */
  const titleSize = title.length > 40 ? 40 : title.length > 28 ? 48 : title.length > 16 ? 60 : 72;

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
          padding: "68px 76px",
          fontFamily: "KR",
          letterSpacing: "-0.035em",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 56 }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {showRich ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: titleSize,
                    fontWeight: 800,
                    color: "#171717",
                    lineHeight: 1.25,
                  }}
                >
                  {title}
                </div>
                {/* 영상 제목 — 왁스 밑줄 바(다른 카드와 같은 문법) */}
                <div
                  style={{
                    display: "flex",
                    height: 14,
                    alignSelf: "stretch",
                    background: "#c9441a",
                    marginTop: 6,
                  }}
                />
                {metaLine ? (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 32,
                      fontWeight: 500,
                      color: "#6b6b6b",
                      marginTop: 28,
                    }}
                  >
                    {metaLine}
                  </div>
                ) : null}
              </div>
            ) : (
              /* 한글 폰트를 못 받았을 때 — 두부 대신 워드마크로 물러난다 */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 64,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: "#171717",
                  }}
                >
                  <span>EA</span>
                  <span style={{ color: "#c9441a" }}>T</span>
                  <span>RI</span>
                  <span style={{ color: "#c9441a" }}>P</span>
                  <span>IN</span>
                </div>
                <div style={{ display: "flex", fontSize: 34, color: "#6b6b6b", marginTop: 28 }}>
                  {creatorSlug}
                </div>
              </div>
            )}
          </div>

          {thumb ? (
            <div
              style={{
                display: "flex",
                width: 480,
                height: 270,
                flexShrink: 0,
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 0 0 1px rgba(23,23,23,0.12)",
              }}
            >
              <img src={thumb} alt="" width={480} height={270} style={{ objectFit: "cover" }} />
            </div>
          ) : null}
        </div>

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
