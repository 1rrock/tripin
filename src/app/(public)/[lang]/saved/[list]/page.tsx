import { notFound, redirect } from "next/navigation";
import { loadSavedView } from "@/shared/api/saved-server";
import type { Locale } from "@/shared/i18n/config";
import { localePath } from "@/shared/i18n/locale";

/**
 * 저장 상세는 **지도**가 맡는다. 이 경로는 예전 링크를 그리로 넘기는 다리다.
 *
 *   /saved/liked · /saved/ungrouped → /map?saved=1
 *   /saved/<그룹 id>                → /map?list=<id>
 *
 * 왜 화면이 아니라 다리인가: 저장한 곳도 그룹도 결국 "어디에 있나" 를 보는 일이고
 * 그 답은 지도에 있다. 목록만 있는 화면을 따로 두면 같은 것을 두 벌로 그리게 된다.
 * 장소를 빼거나 그룹에 담는 일은 지도의 장소 카드(하트 → 그룹 시트)에서 한다.
 */
export const dynamic = "force-dynamic";

const SAVED_ALL = ["liked", "ungrouped"];

export default async function SavedListRedirect({
  params,
}: {
  params: Promise<{ lang: Locale; list: string }>;
}) {
  const { lang: locale, list } = await params;

  if (SAVED_ALL.includes(list)) redirect(localePath("/map?saved=1", locale));

  /* 없는 그룹이면 404. 남의 그룹 id 를 넣어도 RLS 가 안 주므로 여기로 온다. */
  const view = await loadSavedView();
  if (!view.lists.some((l) => l.id === list)) notFound();

  redirect(localePath(`/map?list=${list}`, locale));
}
