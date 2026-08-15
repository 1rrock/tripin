"use client";

/**
 * 저장 화면의 왼쪽 사이드바 — **데스크톱 전용**.
 *
 * 시안 D. 인덱스는 엽서가 맡으므로 사이드바는 **상세에서만** 선다.
 * 좋아요는 `/saved/liked` — `/saved` 는 이제 인덱스다.
 *
 * 서버가 준 그룹·개수를 초기값으로 쓰되, 그룹을 새로 만들면 컨텍스트가 먼저 알므로
 * 둘을 합친다. 안 그러면 새 그룹이 새로고침 전까지 사이드바에 안 뜬다.
 */

import Link from "next/link";
import { Heart } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { SavedListRow } from "@/shared/api/saved-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { stripLocalePrefix } from "@/shared/i18n/paths";
import { useSaved } from "@/shared/ui/SavedContext";
import { NewListButton } from "./NewListButton";
import { ListRowMenu } from "./ListRowMenu";

export function SavedSidebar({
  lists,
  likedCount,
  ungroupedCount,
}: {
  lists: SavedListRow[];
  likedCount: number;
  ungroupedCount: number;
}) {
  const { messages: m, href } = useLocale();
  const { lists: clientLists, countIn, ready, savedCount } = useSaved();
  const pathname = stripLocalePrefix(usePathname() ?? "/saved");

  /* 컨텍스트가 준비되기 전에는 서버 값이 정답이다(첫 페인트에 숫자가 비지 않는다).
     준비된 뒤에는 컨텍스트가 정답 — 방금 만든 그룹이 바로 보인다. */
  const rows: SavedListRow[] = ready
    ? clientLists.map((l) => ({ id: l.id, name: l.name, count: countIn(l.id) }))
    : lists;
  const liked = ready ? savedCount : likedCount;

  const item = (path: string, label: ReactNode, n: number, on: boolean, menu?: ReactNode) => (
    /* 링크 안에 메뉴 버튼을 넣지 않는다 — 중첩 인터랙티브는 스크린리더에서
       무엇을 누르는지 알 수 없고, 클릭이 링크로 새기도 한다. 형제로 둔다. */
    <div
      key={path}
      className="flex items-center gap-1 pr-1 transition-colors"
      style={{
        borderRadius: "var(--r-control)",
        background: on ? "var(--hover)" : "transparent",
      }}
    >
      <Link
        href={href(path)}
        aria-current={on ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2 pl-2.5"
        style={{
          fontSize: "var(--t-meta)",
          fontWeight: on ? 800 : 600,
          color: on ? "var(--paper)" : "var(--dim)",
        }}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">{label}</span>
        <span className="tnum shrink-0" style={{ opacity: 0.7 }}>
          {n}
        </span>
      </Link>
      {menu}
    </div>
  );

  /* 인덱스(`/saved`)는 엽서가 항해한다. 사이드바가 같은 그룹을 한 번 더 그리면
     데스크톱에서 두 벌이 된다. */
  if (pathname === "/saved") return null;

  return (
    <nav
      aria-label={m.saved.title}
      className="hidden w-[210px] shrink-0 flex-col gap-1 self-start lg:flex"
    >
      {item(
        "/saved/liked",
        <>
          <Heart className="size-3.5 shrink-0" weight="fill" style={{ color: "var(--wax)" }} />
          {m.saved.likedNav}
        </>,
        liked,
        pathname === "/saved/liked",
      )}

      {rows.length > 0 ? (
        <p className="index mt-3 mb-0.5 px-2.5" style={{ color: "var(--dim)" }}>
          {m.saved.lists}
        </p>
      ) : null}

      {rows.map((l) =>
        item(
          `/saved/${l.id}`,
          l.name,
          l.count,
          pathname === `/saved/${l.id}`,
          <ListRowMenu listId={l.id} name={l.name} isCurrent={pathname === `/saved/${l.id}`} />,
        ),
      )}

      {ungroupedCount > 0
        ? item(
            "/saved/ungrouped",
            m.saved.listUngrouped,
            ungroupedCount,
            pathname === "/saved/ungrouped",
          )
        : null}

      <NewListButton className="mt-2" />
    </nav>
  );
}
