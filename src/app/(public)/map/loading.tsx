import { ko } from "@/shared/i18n/messages/ko";
import { MapSkeleton } from "@/shared/ui/Skeleton";

/** 동기 — getLocale 을 기다리면 헤더+빈 화면이 스켈레톤보다 먼저 선다. */
export default function Loading() {
  return <MapSkeleton label={ko.common.loading} />;
}
