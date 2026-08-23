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
 *
 * ⚠️ `saved/loading.tsx` 를 **되살리지 마라.** 그 Suspense 경계는 `/saved` 뿐 아니라
 *    이 자식 세그먼트까지 감싸고, 경계는 200 헤더를 **먼저** flush 한다 — 아래
 *    `redirect()`·`notFound()` 가 상태 코드를 못 바꿔서 `/saved/doesnotexist` 가
 *    404 대신 200 이었다. 다른 라우트는 `layout.tsx` 를 경계 **위**에 세워 풀었지만
 *    (`city/[city]/layout.tsx` 주석) 여기는 그럴 자리가 없다: 경계가 부모 세그먼트인
 *    `saved` 에 있어서 `[list]/layout.tsx` 는 여전히 경계 **안**이다.
 *    `/saved` 인덱스의 스켈레톤을 되찾고 싶으면 `saved/page.tsx` 본문을
 *    `<Suspense fallback={<SavedSkeleton />}>` 로 감싸라 — 라우트 파일이 아니라
 *    페이지 안의 경계라야 이 라우트를 건드리지 않는다.
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
