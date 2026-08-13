"use client";

/**
 * 유튜브 썸네일 — maxres 가 없는 영상을 hq 로 되받는다.
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
import { thumbHq, thumbMax } from "@/shared/lib/youtube";

function markReady(el: HTMLImageElement | null, done: () => void) {
  if (el?.complete && el.naturalWidth > 0) done();
}

export function Thumb({
  youtubeId,
  alt,
  eager = false,
}: {
  youtubeId: string;
  /** 영상 제목 그대로 — 제목도 변형 대상이 아니다 */
  alt: string;
  /** 첫 화면에 보이는 프레임만 true. 나머지는 lazy 로 둔다 */
  eager?: boolean;
}) {
  const [src, setSrc] = useState(() => thumbMax(youtubeId));
  const [ready, setReady] = useState(false);

  return (
    <>
      {ready ? null : <span className="bone" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element -- 위 주석 참조: 유튜브 CDN 원본을 그대로 쓴다 */}
      <img
        src={src}
        alt={alt}
        width={1280}
        height={720}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        style={ready ? undefined : { opacity: 0 }}
        ref={(el) => markReady(el, () => setReady(true))}
        onLoad={() => setReady(true)}
        onError={() => {
          // maxres 가 없는 영상은 120×90 회색 플레이스홀더가 200 으로 내려온다.
          // 그 경우에도 onError 는 안 뜨므로, 진짜 404 일 때만 여기로 온다.
          const hq = thumbHq(youtubeId);
          setSrc((prev) => (prev === hq ? prev : hq));
        }}
      />
    </>
  );
}
