import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { loadSavedView } from "@/shared/api/saved-server";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return { title: m.saved.title, robots: { index: false, follow: false } };
}

export default async function SavedPage() {
  const locale = await getLocale();
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

          {/* 빈 화면은 글부터 시작한다 — 헤어라인에 글줄이 붙지 않게 위 여백을 준다
              (목록 화면과 달리 헤더의 선을 이어받을 목록이 여기엔 없다).
              데스크톱에서는 글줄이 화면 폭만큼 늘어나지 않게 한 단(34rem)으로 묶는다. */}
          <div className="flex max-w-[34rem] flex-col items-start gap-2 pt-4 pb-2 lg:pt-0">
            <p style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>{m.saved.empty}</p>
            <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>{m.saved.emptyHint}</p>
            <Link
              href={localePath("/map", locale)}
              className="mt-2 inline-flex h-10 items-center gap-1.5 px-4 font-bold lg:h-11"
              style={{
                fontSize: "var(--t-body)",
                borderRadius: "var(--r-frame)",
                background: "var(--paper)",
                color: "var(--sheet)",
              }}
            >
              <Icon.map className="size-4" />
              {m.saved.emptyCta}
            </Link>
          </div>

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
