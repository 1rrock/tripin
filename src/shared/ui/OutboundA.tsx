"use client";

/**
 * 외부로 나가는 <a> — 클릭을 성공 지표로 남긴다.
 *
 * frame.tsx 의 Act 는 서버에서도 쓰이므로 훅·클라이언트 모듈을 직접 못 넣는다.
 * 이 컴포넌트가 그 경계다. href 는 그대로 두고 onClick 만 붙이므로 JS 없이도
 * 링크는 살아 있다.
 */

import { track } from "@vercel/analytics";
import type { CSSProperties, ReactNode } from "react";
import { outboundKind } from "@/shared/lib/track-outbound";

export function OutboundA({
  href,
  children,
  className,
  style,
  title,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const kind = outboundKind(href);
  return (
    <a
      href={href}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onClick={() => {
        /* Hobby 플랜은 커스텀 이벤트를 대시보드에 안 보여 준다(Pro 필요).
           호출은 플랜과 무관하게 둔다 — 업그레이드하면 코드 변경 없이 집계가 열린다. */
        if (kind) track(kind === "video" ? "outbound_video" : "outbound_map");
      }}
    >
      {children}
    </a>
  );
}
