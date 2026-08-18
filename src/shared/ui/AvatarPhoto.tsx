"use client";

import { useState, type ReactNode } from "react";

/**
 * yt3 / ggpht 아바타.
 *
 * 사이트 Referrer-Policy 가 `strict-origin-when-cross-origin` 이라 이미지 요청에
 * 우리 origin 이 붙는다. 구글 아바타 CDN 은 그 조합을 가끔 거절한다 — 같은 URL 을
 * 주소창에 직접 열면 된다. 리퍼러를 안 보내면 통과한다.
 * 그래도 실패하면 fallback(이니셜)을 그린다.
 */
export function AvatarPhoto({
  src,
  alt,
  size,
  fallback,
}: {
  src: string;
  alt: string;
  size: number;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- yt3 CDN 원본
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="size-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
