"use client";

/**
 * 저장 화면의 왼쪽 사이드바 — **데스크톱 전용**.
 *
 * 시안 C. 그룹 사이를 오가는 것이 이 화면의 주 동작이라, 데스크톱에서는
 * 목록을 상시 띄워 클릭 한 번에 넘나들게 한다. 모바일은 같은 것을 카드 목록으로
 * 그리고 상세로 밀어넣는다(`SavedIndex`) — 좁은 화면에서 사이드바는 내용을 먹는다.
 *
 * 서버가 준 그룹·개수를 초기값으로 쓰되, 그룹을 새로 만들면 컨텍스트가 먼저 알므로
 * 둘을 합친다. 안 그러면 새 그룹이 새로고침 전까지 사이드바에 안 뜬다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SavedListRow } from "@/shared/api/saved-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { stripLocalePrefix } from "@/shared/i18n/paths";
import { useSaved } from "@/shared/ui/SavedContext";
import { NewListButton } from "./NewListButton";

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

  const item = (path: string, label: string, n: number, on: boolean) => (
    <Link
      key={path}
      href={href(path)}
      aria-current={on ? "page" : undefined}
      className="flex items-center justify-between gap-2 px-2.5 py-2 transition-colors"
      style={{
        borderRadius: "var(--r-control)",
        fontSize: "var(--t-meta)",
        fontWeight: on ? 800 : 600,
        background: on ? "var(--hover)" : "transparent",
        color: on ? "var(--paper)" : "var(--dim)",
      }}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className="tnum shrink-0" style={{ opacity: 0.7 }}>
        {n}
      </span>
    </Link>
  );

  return (
    <nav
      aria-label={m.saved.title}
      className="hidden w-[210px] shrink-0 flex-col gap-1 self-start lg:flex"
    >
      {item("/saved", `♥ ${m.saved.likedNav}`, liked, pathname === "/saved")}

      {rows.length > 0 ? (
        <p className="index mt-3 mb-0.5 px-2.5" style={{ color: "var(--dim)" }}>
          {m.saved.lists}
        </p>
      ) : null}

      {rows.map((l) =>
        item(`/saved/${l.id}`, l.name, l.count, pathname === `/saved/${l.id}`),
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
