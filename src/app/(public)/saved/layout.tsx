import { loadSavedView } from "@/shared/api/saved-server";
import { SavedSidebar } from "./SavedSidebar";

/**
 * 저장 화면 골격 — 시안 D.
 *
 * 인덱스(`/saved`)는 엽서 그리드. 사이드바는 상세에서만 선다(SavedSidebar).
 * 모바일은 처음부터 인덱스가 본문이다.
 *
 * 사이드바를 레이아웃에 둔 이유: 그룹을 오갈 때마다 다시 그리면 스크롤 위치와
 * 포커스가 매번 초기화된다. 레이아웃에 있으면 본문만 바뀐다.
 *
 * 데이터는 `loadSavedView` 가 `cache` 로 감싸져 있어 레이아웃과 페이지가 각각
 * 불러도 요청당 한 번만 질의한다.
 */
export default async function SavedLayout({ children }: { children: React.ReactNode }) {
  const view = await loadSavedView();

  return (
    <main className="mx-auto flex w-full max-w-lg gap-8 px-(--gutter) pt-4 lg:max-w-5xl lg:pt-8">
      <SavedSidebar
        lists={view.lists}
        likedCount={view.places.length}
        ungroupedCount={view.ungroupedCount}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-(--block)">{children}</div>
    </main>
  );
}
