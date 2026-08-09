import { redirect } from "next/navigation";

/**
 * 예전 전역 지도 진입점.
 *
 * 지역·채널·조각 화면에 이미 지도가 있어 메뉴에서 빼고,
 * 세 번째 축을 종류(`/type`)로 바꿨다. 북마크·외부 링크는 종류 목록으로 넘긴다.
 */
export default function MapRedirectPage() {
  redirect("/type");
}
