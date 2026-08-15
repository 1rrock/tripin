"use client";

/**
 * 저장 인덱스 — 시안 D. 그룹이 겹친 엽서다.
 *
 * 모바일·데스크톱 둘 다 이 화면이 첫 얼굴이다. 데스크톱 사이드바는
 * 상세(`/saved/liked`, `/saved/[id]`)에서만 선다.
 */

import Link from "next/link";
import { Heart } from "@phosphor-icons/react";
import type { SavedListRow, SavedPlaceRow } from "@/shared/api/saved-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useSaved } from "@/shared/ui/SavedContext";
import { Frame } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { CutStack } from "./CutStack";
import { NewListButton } from "./NewListButton";
import { ListRowMenu } from "./ListRowMenu";

function cutsOf(places: SavedPlaceRow[], pred: (p: SavedPlaceRow) => boolean, n: number) {
  return places
    .filter((p): p is SavedPlaceRow & { youtubeId: string } => Boolean(pred(p) && p.youtubeId))
    .slice(0, n)
    .map((p) => ({ youtubeId: p.youtubeId, alt: p.videoTitle ?? p.name }));
}

export function SavedIndex({
  lists,
  places,
  membership,
  likedCount,
  ungroupedCount,
}: {
  lists: SavedListRow[];
  places: SavedPlaceRow[];
  membership: Record<string, string[]>;
  likedCount: number;
  ungroupedCount: number;
}) {
  const { messages: m, t, href } = useLocale();
  const { lists: clientLists, countIn, ready, savedCount } = useSaved();

  const rows: SavedListRow[] = ready
    ? clientLists.map((l) => ({ id: l.id, name: l.name, count: countIn(l.id) }))
    : lists;
  const liked = ready ? savedCount : likedCount;

  const likedCuts = cutsOf(places, () => true, 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="index" style={{ color: "var(--dim)" }}>
          {m.saved.lists}
        </p>
        <NewListButton />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-6 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-8">
        <Link href={href("/saved/liked")} className="col-span-2 flex flex-col gap-2.5 lg:col-span-1">
          {likedCuts[0] ? (
            <Frame>
              <Thumb youtubeId={likedCuts[0].youtubeId} alt={likedCuts[0].alt} eager />
            </Frame>
          ) : (
            <span className="frame" />
          )}
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5" style={{ fontSize: "var(--t-title)", fontWeight: 800 }}>
              <Heart className="size-3.5 shrink-0" weight="fill" style={{ color: "var(--wax)" }} />
              {m.saved.likedNav}
            </span>
            <span className="tnum shrink-0" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              {t(m.saved.listCount, { n: liked })}
            </span>
          </span>
        </Link>

        {rows.length === 0 ? (
          <div className="col-span-2 flex flex-col justify-end py-2 lg:col-span-1">
            <p style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>{m.saved.listEmpty}</p>
            <p className="mt-0.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              {m.saved.listEmptyHint}
            </p>
          </div>
        ) : (
          rows.map((l) => (
            <div key={l.id} className="flex flex-col gap-2.5">
              <Link href={href(`/saved/${l.id}`)}>
                <CutStack
                  cuts={cutsOf(places, (p) => (membership[p.id] ?? []).includes(l.id), 2)}
                />
              </Link>
              <div className="flex items-start justify-between gap-1">
                <Link href={href(`/saved/${l.id}`)} className="min-w-0">
                  <span className="block truncate" style={{ fontSize: "var(--t-title)", fontWeight: 800 }}>
                    {l.name}
                  </span>
                  <span className="tnum mt-0.5 block" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
                    {t(m.saved.listCount, { n: l.count })}
                  </span>
                </Link>
                <ListRowMenu listId={l.id} name={l.name} />
              </div>
            </div>
          ))
        )}

        <NewListButton variant="slot" className="hidden lg:flex" />

        {ungroupedCount > 0 ? (
          <Link href={href("/saved/ungrouped")} className="flex flex-col justify-end gap-1 py-1">
            <span style={{ fontSize: "var(--t-title)", fontWeight: 800 }}>{m.saved.listUngrouped}</span>
            <span className="tnum" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              {t(m.saved.listCount, { n: ungroupedCount })}
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
