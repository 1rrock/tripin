import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { loadSavedView } from "@/shared/api/saved-server";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Icon } from "@/shared/ui/icons";
import { AccountRow } from "./AccountRow";
import { NewListButton } from "./NewListButton";
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

  return (
    <div className="flex flex-col gap-4">
      {/* 제목은 보이지 않는다 — 첫 행이 이미 "저장한 곳" 이라 같은 낱말이 두 번 선다.
          지우지 않고 sr-only 로 두는 이유: 화면에 h1 이 하나도 없으면 스크린리더가
          이 화면을 무엇이라 부를지 알 수 없다(탭바의 "저장" 은 항해 이름이지 제목이 아니다). */}
      <h1 className="sr-only">{m.saved.title}</h1>

      {blank ? (
        <>
          <div className="flex flex-col items-start gap-2 pb-2">
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
              다른 기기에 저장이 있는 사람이 그것을 되찾는 길. */}
          <ul className="-mx-(--gutter) border-t" style={{ borderColor: "var(--hairline)" }}>
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
