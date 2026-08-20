"use client";

/**
 * 목록 행의 장소 링크 — **문서에는 링크로, 손에는 드로어로.**
 *
 * 왜 필요한가: 도시·조각·지도의 장소 행은 전부 `<button onClick>` 이었다. 사람에게는
 * 맞는 동작이었지만(누르면 그 자리에서 상세가 열린다) 문서에는 링크가 하나도 남지
 * 않았다 — `/city/fukuoka` 는 561곳을 싣고도 고유 href 가 14개였고, 크롤러가
 * 장소로 갈 길이 사이트맵밖에 없었다. 사이트맵은 URL 을 **발견**시킬 뿐이라
 * 링크 신호(내부 링크)가 안 붙는다.
 *
 * 그래서 `<a href>` 로 바꾸되, **평범한 좌클릭만** 가로채 드로어를 연다:
 *   · 크롤러 — 진짜 링크를 본다
 *   · 유저 — 지금까지와 똑같이 드로어가 열린다
 *   · ⌘·Ctrl·Shift·가운데 클릭 — 가로채지 않는다. 새 탭으로 장소 페이지가 열린다
 *   · 우클릭 → "새 탭에서 열기", 링크 주소 복사 — 원래 없던 것이 공짜로 생긴다
 *
 * `aria-pressed` 를 쓰지 않는다 — 링크는 토글 버튼이 아니다. 목록에서 지금 열려
 * 있는 행은 `aria-current` 로 알린다.
 */

import type { CSSProperties, ReactNode } from "react";
import { placePath } from "@/shared/lib/place-path";
import { useLocale } from "@/shared/i18n/LocaleContext";

export function PlaceRowLink({
  slug,
  onOpen,
  active = false,
  className,
  style,
  children,
}: {
  slug: string;
  /** 평범한 좌클릭에서 부를 것 — 지금까지 `onClick` 이 하던 일 */
  onOpen: () => void;
  active?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { href } = useLocale();
  return (
    <a
      href={href(placePath(slug))}
      aria-current={active ? "true" : undefined}
      className={className}
      style={style}
      onClick={(e) => {
        /* 새 탭·새 창으로 열려는 의도는 건드리지 않는다. 가운데 클릭은 대개
           click 이 아니라 auxclick 이라 여기 안 오지만, 오는 브라우저도 있어서 같이 본다. */
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onOpen();
      }}
    >
      {children}
    </a>
  );
}
