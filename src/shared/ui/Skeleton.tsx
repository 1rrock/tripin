/**
 * 페이지별 뼈대 — 실화면과 **같은 자리**에 서는 것이 이 파일의 유일한 요구다.
 *
 * 규칙: 스켈레톤은 새로 그리지 않는다. 실화면 컴포넌트의 마크업을 그대로 베끼고
 * 글자·사진 자리에만 뼈를 넣는다(`skeleton/bones.tsx` 머리말 참고). 이 앱은
 * 페이지마다 모바일/데스크톱 레이아웃이 다르므로 — 홈은 롤 ↔ 그리드, 캔버스 화면은
 * 세로 흐름 ↔ 고정 오버레이 — `lg:` 분기를 통째로 들고 가야 어긋나지 않는다.
 *
 * 실제 구현은 `skeleton/` 아래에 페이지별로 있다. 여기는 창구.
 */

export { HomeSkeleton } from "./skeleton/HomeSkeleton";
export { MapSkeleton, CitySkeleton, CreatorSkeleton } from "./skeleton/CanvasSkeleton";
export { PieceSkeleton } from "./skeleton/PieceSkeleton";
export { VideoSkeleton } from "./skeleton/VideoSkeleton";
export { TypeDetailSkeleton } from "./skeleton/TypeDetailSkeleton";
export { TypeIndexSkeleton } from "./skeleton/TypeIndexSkeleton";
export { ProseSkeleton } from "./skeleton/ProseSkeleton";
