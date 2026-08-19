"use client";

/**
 * 유튜브 썸네일.
 *
 * variant="card" (기본) — `mqdefault` 320×180. 목록·레일·그리드용.
 *   maxres(1280×720, 200~370KB)를 132px 칸에 넣으면 LCP 가 10초를 넘는다.
 *   mq 는 항상 있고 정확히 16:9 다.
 *
 * variant="hero" — maxres. 영상 상세처럼 프레임이 큰 자리만.
 *   maxres 가 없으면 120×90 회색이 200 으로 온다(onError 없음).
 *   그때는 naturalWidth 로 걸러 mq 로 되돌린다.
 *
 * 왜 next/image 가 아닌가: i.ytimg.com 은 이미 최적화된 JPEG 을 CDN 으로 준다.
 * 여기에 next/image 를 씌우면 우리 서버가 프록시(`/_next/image`)가 되어 대역폭을
 * 쓰고 첫 요청이 오히려 느려진다. remotePatterns 설정도 필요 없어진다.
 *
 * ⚠️ 크롭·필터·오버레이 금지 — YouTube API Developer Policies §III.E.3
 *    "thumbnail and title must be visible to the viewer and unmodified" (LEGAL.md 4.5).
 *    원본이 16:9 이고 프레임도 16:9 라 object-cover 로도 실제 잘림이 없다.
 *    비율이 다른 프레임에 넣으면 그 순간 '변형'이 되므로 프레임 비율을 바꾸지 말 것.
 */

import { useState } from "react";
import { thumbMax, thumbSmall } from "@/shared/lib/youtube";

export function Thumb({
  youtubeId,
  alt,
  eager = false,
  variant = "card",
}: {
  youtubeId: string;
  /** 영상 제목 그대로 — 제목도 변형 대상이 아니다 */
  alt: string;
  /** 첫 화면에 보이는 프레임만 true. 나머지는 lazy 로 둔다 */
  eager?: boolean;
  /** card = 목록(320×180). hero = 상세 히어로(1280×720) */
  variant?: "card" | "hero";
}) {
  const pick = variant === "hero" ? thumbMax(youtubeId) : thumbSmall(youtubeId);
  const [src, setSrc] = useState(pick);
  const [ready, setReady] = useState(false);
  /* 영상이 바뀌면 렌더 중에 되돌린다 — 이펙트로 미루면 한 프레임 전 영상의
     썸네일이 새 alt 로 그려진다(react.dev/learn/you-might-not-need-an-effect). */
  const key = `${youtubeId}:${variant}`;
  const [prev, setPrev] = useState(key);
  if (prev !== key) {
    setPrev(key);
    setSrc(pick);
    setReady(false);
  }

  const fallback = () => {
    const mq = thumbSmall(youtubeId);
    setSrc((cur) => (cur === mq ? cur : mq));
  };

  const settle = (el: HTMLImageElement) => {
    if (variant === "hero" && el.naturalWidth <= 120) {
      fallback();
      return;
    }
    setReady(true);
  };

  return (
    <>
      {ready ? null : <span className="bone" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element -- 위 주석 참조: 유튜브 CDN 원본을 그대로 쓴다 */}
      <img
        src={src}
        alt={alt}
        width={variant === "hero" ? 1280 : 320}
        height={variant === "hero" ? 720 : 180}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        referrerPolicy="no-referrer"
        style={ready ? undefined : { opacity: 0 }}
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0) settle(el);
        }}
        onLoad={(e) => settle(e.currentTarget)}
        onError={fallback}
      />
    </>
  );
}
