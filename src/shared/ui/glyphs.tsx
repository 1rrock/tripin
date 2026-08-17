"use client";

/**
 * 브랜드 글리프 — 라운드 키라인 한 벌. 탭독·카테고리 그리드가 쓴다.
 *
 * Phosphor 의 Icon 시그니처(size·weight·forwardRef)를 그대로 받아서
 * 호출부와 icons.client 의 ph() 래퍼가 한 줄도 안 바뀐다.
 *
 * weight 규칙:
 *   · "fill" — 면 변형이 있으면 그걸, 없으면 획이 굵어진다(1.7 → 2.1)
 *   · 나머지(regular · duotone · bold …) — 1.7 키라인
 * 면 변형의 구멍(집의 문, 지도의 접힘)은 evenodd 로 진짜 뚫는다 —
 * 배경색을 몰라도 되도록 바탕을 칠하지 않는다.
 */

import { forwardRef } from "react";
import type { ReactNode } from "react";
import type { Icon, IconProps } from "@phosphor-icons/react";

/** 키라인 공통 획 스타일 */
const S = (w: number) =>
  ({
    stroke: "currentColor",
    strokeWidth: w,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none",
  }) as const;

function glyph(name: string, draw: (w: number) => ReactNode, fill?: ReactNode): Icon {
  const C = forwardRef<SVGSVGElement, IconProps>(function Glyph(
    { size = "1em", weight, color, className, style, ...rest },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        style={color && color !== "currentColor" ? { color, ...style } : style}
        fill="none"
        aria-hidden
        {...rest}
      >
        {weight === "fill" ? (fill ?? draw(2.1)) : draw(1.7)}
      </svg>
    );
  });
  C.displayName = name;
  return C as Icon;
}

/* ── 탭독 넷 ───────────────────────────────────────────── */

export const GlyphHome = glyph(
  "GlyphHome",
  (w) => (
    <g {...S(w)}>
      <path d="M4 10.8 12 4.4l8 6.4" />
      <path d="M5.8 9.7v8.5a1.7 1.7 0 0 0 1.7 1.7h9a1.7 1.7 0 0 0 1.7-1.7V9.7" />
      <path d="M9.9 19.9v-4.2a2.1 2.1 0 0 1 4.2 0v4.2" />
    </g>
  ),
  <path
    fill="currentColor"
    fillRule="evenodd"
    d="M11.16 3.63a1.35 1.35 0 0 1 1.68 0l7.4 5.9c.48.38.76.96.76 1.58v7.29A2.6 2.6 0 0 1 18.4 21H5.6A2.6 2.6 0 0 1 3 18.4v-7.29c0-.62.28-1.2.76-1.58ZM10 21v-4.4a2 2 0 0 1 4 0V21Z"
  />,
);

export const GlyphMap = glyph(
  "GlyphMap",
  (w) => (
    <g {...S(w)}>
      <path d="M3.5 6.7 9 4.4l6 2.1 5.5-2.2v13.1L15 19.6l-6-2.1-5.5 2.2Z" />
      <path d="M9 4.6v12.7M15 6.7v12.7" />
    </g>
  ),
  <path
    fill="currentColor"
    fillRule="evenodd"
    d="M3.5 6.7 9 4.4l6 2.1 5.5-2.2v13.1L15 19.6l-6-2.1-5.5 2.2ZM8.3 5.2h1.4V17H8.3ZM14.3 7.3h1.4V19h-1.4Z"
  />,
);

export const GlyphHeart = glyph(
  "GlyphHeart",
  (w) => (
    <path
      {...S(w)}
      d="M12 19.8c-2.8-1.9-8.2-6-8.2-10.3 0-2.7 2-4.7 4.5-4.7 1.5 0 2.9.8 3.7 2.1.8-1.3 2.2-2.1 3.7-2.1 2.5 0 4.5 2 4.5 4.7 0 4.3-5.4 8.4-8.2 10.3Z"
    />
  ),
  <path
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinejoin="round"
    d="M12 19.8c-2.8-1.9-8.2-6-8.2-10.3 0-2.7 2-4.7 4.5-4.7 1.5 0 2.9.8 3.7 2.1.8-1.3 2.2-2.1 3.7-2.1 2.5 0 4.5 2 4.5 4.7 0 4.3-5.4 8.4-8.2 10.3Z"
  />,
);

export const GlyphUser = glyph(
  "GlyphUser",
  (w) => (
    <g {...S(w)}>
      <circle cx="12" cy="7.9" r="3.5" />
      <path d="M5.3 19.7c.7-3.8 3.4-5.6 6.7-5.6s6 1.8 6.7 5.6" />
    </g>
  ),
  <g fill="currentColor">
    <circle cx="12" cy="7.9" r="4.2" />
    <path d="M12 13.7c4 0 7.1 2.1 7.6 6.3.04.28-.2.5-.48.5H4.88a.48.48 0 0 1-.48-.5c.5-4.2 3.6-6.3 7.6-6.3Z" />
  </g>,
);

/* ── 카테고리 그리드 — 종류 7 + 도구 2 + 미분류 핀 ──────────
   (지역 도구는 위의 GlyphMap 을 그대로 쓴다) */

export const GlyphMeal = glyph("GlyphMeal", (w) => (
  <g {...S(w)}>
    <path d="M4.8 11.6h14.4" />
    <path d="M5.2 11.6c.2 3.6 3 6.3 6.8 6.3s6.6-2.7 6.8-6.3" />
    <path d="M9.7 20h4.6" />
    <path d="M9.8 8.3c-.8-.9.8-1.7 0-2.9M13.4 8.3c-.8-.9.8-1.7 0-2.9" />
  </g>
));

export const GlyphCafe = glyph("GlyphCafe", (w) => (
  <g {...S(w)}>
    <path d="M4.8 10h10.4v4.4a4.4 4.4 0 0 1-4.4 4.4H9.2a4.4 4.4 0 0 1-4.4-4.4z" />
    <path d="M15.4 11.2h1.3a2.2 2.2 0 0 1 0 4.4h-1.5" />
    <path d="M8.6 7.2c-.7-.8.7-1.5 0-2.6M11.6 7.2c-.7-.8.7-1.5 0-2.6" />
  </g>
));

export const GlyphBed = glyph("GlyphBed", (w) => (
  <g {...S(w)}>
    <path d="M3.6 19v-8.4" />
    <path d="M3.6 15.6h16.8V19" />
    <path d="M20.4 15.6v-1.4a3.2 3.2 0 0 0-3.2-3.2H9.2v4.6" />
    <circle cx="6.4" cy="13.3" r="1.4" />
  </g>
));

export const GlyphLandmark = glyph("GlyphLandmark", (w) => (
  <g {...S(w)}>
    <path d="M9.2 19.8c1.5-4.6 2-8.7 2-12.8h1.6c0 4.1.5 8.2 2 12.8" />
    <path d="M7.6 19.8h8.8" />
    <path d="M9.9 14.6h4.2" />
    <path d="M12 7V4.4" />
  </g>
));

export const GlyphWine = glyph("GlyphWine", (w) => (
  <g {...S(w)}>
    <path d="M8 4.6h8v3.2a4 4 0 0 1-8 0z" />
    <path d="M12 11.8v6.6" />
    <path d="M8.9 18.4h6.2" />
  </g>
));

export const GlyphShop = glyph("GlyphShop", (w) => (
  <g {...S(w)}>
    <path d="M5.6 12.4v5.9a1.3 1.3 0 0 0 1.3 1.3h10.2a1.3 1.3 0 0 0 1.3-1.3v-5.9" />
    <path d="M4.4 9.2 5.9 4.8h12.2l1.5 4.4" />
    <path d="M4.4 9.2a2.53 2.53 0 0 0 5.06 0 2.53 2.53 0 0 0 5.06 0 2.54 2.54 0 0 0 5.08 0" />
    <path d="M10.1 19.6v-3.3a1.9 1.9 0 0 1 3.8 0v3.3" />
  </g>
));

export const GlyphView = glyph("GlyphView", (w) => (
  <g {...S(w)}>
    <path d="M3.6 18.6l5-7.4 3.2 4.6 2.4-3.3 5.8 6.1z" />
    <circle cx="17.2" cy="7.2" r="2.3" />
  </g>
));

export const GlyphFish = glyph("GlyphFish", (w) => (
  <g {...S(w)}>
    <path d="M4.2 12.2c2.4-3.8 6.2-5.6 10.4-4.2 2.6.9 4.6 2.6 5.4 4.2-.8 1.6-2.8 3.3-5.4 4.2-4.2 1.4-8-.4-10.4-4.2Z" />
    <path d="M4.2 12.2 2.6 9.4v5.6Z" />
    <circle cx="15.4" cy="11.2" r="0.7" fill="currentColor" stroke="none" />
    <path d="M11.2 8.6 12.6 5.8M11.2 15.8 12.6 18.6" />
  </g>
));

export const GlyphChannel = glyph("GlyphChannel", (w) => (
  <g {...S(w)}>
    <path d="M4.6 6.8h14.8M4.6 11.6h8.2M4.6 16.4h6.2" />
    <path d="M15.6 12.9l4.4 2.7-4.4 2.7z" />
  </g>
));

export const GlyphMore = glyph("GlyphMore", (w) => (
  <g {...S(w)}>
    <circle cx="7.6" cy="7.6" r="2.5" />
    <circle cx="16.4" cy="7.6" r="2.5" />
    <circle cx="7.6" cy="16.4" r="2.5" />
    <path d="M16.4 13.9v5M13.9 16.4h5" />
  </g>
));

export const GlyphPin = glyph(
  "GlyphPin",
  (w) => (
    <path
      {...S(w)}
      d="M12 3.6a6 6 0 0 1 6 6c0 4.2-4.5 9-5.6 10.2a.55.55 0 0 1-.8 0C10.5 18.6 6 13.8 6 9.6a6 6 0 0 1 6-6z"
    />
  ),
  <path
    fill="currentColor"
    d="M12 3.4a6.2 6.2 0 0 1 6.2 6.2c0 4.3-4.6 9.2-5.7 10.4a.68.68 0 0 1-1 0c-1.1-1.2-5.7-6.1-5.7-10.4A6.2 6.2 0 0 1 12 3.4z"
  />,
);
