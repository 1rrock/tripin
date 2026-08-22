import { ko } from "@/shared/i18n/messages/ko";
import { MapSkeleton } from "@/shared/ui/Skeleton";

/**
 * 동기 — getLocale 을 기다리면 헤더+빈 화면이 스켈레톤보다 먼저 선다.
 * (라벨은 sr-only 라 로케일이 틀려도 화면에는 안 보인다)
 *
 * 뼈를 다시 넣는다. 빈 크롬만 두면 /map 진입이 "아무것도 안 뜨는 흰 화면"이었다.
 * `.bone` 은 background-color + 그라디언트 애니라 LCP 후보가 아니다 —
 * LCP 후보는 url() 배경·<img>·텍스트 블록이고 여기엔 셋 다 없다.
 */
export default function Loading() {
  return <MapSkeleton label={ko.common.loading} />;
}
