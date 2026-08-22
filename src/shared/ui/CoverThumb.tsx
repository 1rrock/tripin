"use client";

/**
 * 홈 연예인 커버 전용 썸네일 — maxres(1280×720)를 먼저 시도하고, 없으면
 * mqdefault(320×180)로 물러난다.
 *
 * 커버는 항상 첫 화면 LCP 후보라 Thumb.tsx 의 hero variant 처럼 maxres 를
 * 써야 하는데, maxres 는 업로더가 HD 썸네일을 올렸을 때만 존재해 영상에
 * 따라 404 가 난다(youtube.ts 주석 참조). 그래서 이 컴포넌트만 onError
 * 폴백이 필요하다 — Thumb 은 실패를 감지할 훅이 없어 이 용도로 못 쓴다.
 *
 * ⚠️ SSR 은 항상 maxres 로 나간다. 실패하는 영상이면 hydration 후 onError 가
 *    붙기 전까지 깨진 이미지가 잠깐 보일 수 있다 — 첫 화면 LCP 를 지키기 위해
 *    감수하는 트레이드오프다.
 *
 * 크롭·필터·오버레이 금지 — YouTube API Developer Policies §III.E.3.
 * next/image 를 안 쓰는 이유는 Thumb.tsx 주석 참조: i.ytimg.com 이 이미
 * 최적화된 CDN 원본을 주므로, 그 위에 씌우면 우리 서버가 프록시가 되어
 * 대역폭을 쓰고 첫 요청이 오히려 느려진다.
 */

import { useState } from "react";
import { thumbMax, thumbSmall } from "@/shared/lib/youtube";

export function CoverThumb({
  youtubeId,
  alt,
}: {
  youtubeId: string;
  /** 영상 제목 그대로 — 제목도 변형 대상이 아니다 */
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = failed ? thumbSmall(youtubeId) : thumbMax(youtubeId);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 위 주석 참조: 유튜브 CDN 원본을 그대로 쓴다
    <img
      src={src}
      alt={alt}
      width={1280}
      height={720}
      loading="eager"
      fetchPriority="high"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
