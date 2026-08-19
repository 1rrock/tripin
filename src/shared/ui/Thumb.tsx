/**
 * 유튜브 썸네일 — 서버·클라이언트 둘 다 쓴다. 훅 없음.
 *
 * variant="card" (기본) — `mqdefault` 320×180. 목록·레일·그리드용.
 * variant="hero" — maxres. 영상 상세처럼 프레임이 큰 자리만.
 *
 * 예전에 opacity:0 + useState(ready) 로 뼈를 깔았다. 그 이미지는 하이드레이션
 * 전까지 LCP 후보가 되지 못해, 홈 LCP 가 JS 를 기다렸다.
 *
 * 왜 next/image 가 아닌가: i.ytimg.com 은 이미 최적화된 JPEG 을 CDN 으로 준다.
 * 여기에 next/image 를 씌우면 우리 서버가 프록시(`/_next/image`)가 되어 대역폭을
 * 쓰고 첫 요청이 오히려 느려진다.
 *
 * ⚠️ 크롭·필터·오버레이 금지 — YouTube API Developer Policies §III.E.3
 *    원본이 16:9 이고 프레임도 16:9 라 object-cover 로도 실제 잘림이 없다.
 */

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
  const src = variant === "hero" ? thumbMax(youtubeId) : thumbSmall(youtubeId);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 위 주석 참조: 유튜브 CDN 원본을 그대로 쓴다
    <img
      src={src}
      alt={alt}
      width={variant === "hero" ? 1280 : 320}
      height={variant === "hero" ? 720 : 180}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
