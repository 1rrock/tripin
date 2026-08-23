import type { Metadata } from "next";
import { Suspense } from "react";
import { loadSavedView } from "@/shared/api/saved-server";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Icon } from "@/shared/ui/icons";
import { AccountRow } from "./AccountRow";
import { NewListButton } from "./NewListButton";
import { SavedHeader } from "./SavedHeader";
import { SavedIndex } from "./SavedIndex";

/**
 * 저장 첫 화면 — 목록의 목록.
 *
 *   제목 하나와 행 목록. 브레드크럼·배너·프레임을 걷어냈다(구글 지도 "내 장소" 문법).
 *   저장한 곳 · 그룹 · 새 리스트 · 계정 순. 어느 행을 눌러도 지도가 그 목록으로 열린다
 *   (`/map?saved=1` · `/map?list=<id>`).
 *
 *   로그인 문구는 목록의 **마지막 행**이다 — 헤더에 붙이면 제목과 경쟁하고,
 *   상자로 띄우면 저장한 것보다 로그인 권유가 먼저 보인다(AccountRow 주석).
 *
 * 색인하지 않는다 — 유저별 화면이라 크롤러에게 보일 것이 없다.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  return { title: m.saved.title, robots: { index: false, follow: false } };
}

export default async function SavedPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  const view = await loadSavedView();

  /* 저장도 그룹도 없을 때만 빈 화면이다. 저장 0 만 보고 갈라내면, 장소를 담기 전에
     그룹부터 만든 사람(NewListButton 주석의 순서)이 방금 만든 그룹을 잃는다. */
  const blank = view.places.length === 0 && view.lists.length === 0;

  /* 제목·규모·주 행동은 SavedHeader 가 든다 — 모바일에서는 sr-only h1 로만 남고,
     공용 헤더가 숨는 lg 부터 큰 제목으로 선다. */
  return (
    <div className="flex flex-col">
      {blank ? (
        <>
          <SavedHeader action={false} />

          {/* 빈 화면은 `EmptyState` 가 든다 — 이 앱의 빈 화면 문법 하나로 모은다.
              두 문장을 한 문단으로 합치는 이유: `EmptyState` 는 message 가 하나고,
              둘은 원래 "없다 + 어떻게 채우나" 로 이어 읽는 한 덩어리였다.
              단추도 손으로 그리지 않는다 — 먹색 채움은 `Button secondary` 다.
              데스크톱에서 글줄이 화면 폭만큼 늘어나지 않게 한 단(34rem)으로 묶는다. */}
          <EmptyState
            message={`${m.saved.empty} ${m.saved.emptyHint}`}
            /* `py-20` 을 덮을 때는 `pt-`/`pb-` 를 쓴다 — 같은 `px-` 끼리는
               Tailwind 출력 순서에 기대게 되고, 방향 단위는 축 단위보다
               항상 뒤에 깔려 확실히 이긴다. */
            className="mx-auto max-w-[34rem] pt-4 pb-2 lg:pt-0"
          >
            <Button variant="secondary" size="sm" href={localePath("/map", locale)}>
              <Icon.map className="size-4" />
              {m.saved.emptyCta}
            </Button>
          </EmptyState>

          {/* 빈 화면에도 같은 두 행은 남는다 — 그룹을 먼저 만드는 길과,
              다른 기기에 저장이 있는 사람이 그것을 되찾는 길.
              두 줄뿐이라 데스크톱에서도 가르지 않는다 — 한 단으로 세운다. */}
          <ul
            className="-mx-(--gutter) mt-(--stack) max-w-[calc(34rem+2*var(--gutter))] border-t [&>li:last-child]:border-b-0"
            style={{ borderColor: "var(--hairline)" }}
          >
            <NewListButton variant="row" hint={m.saved.listEmptyHint} />
            <Suspense>
              <AccountRow linked={view.linked} copy="restore" />
            </Suspense>
          </ul>
        </>
      ) : (
        <SavedIndex lists={view.lists} likedCount={view.places.length} linked={view.linked} />
      )}
    </div>
  );
}
