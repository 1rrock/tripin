import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSavedView } from "@/shared/api/saved-server";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Icon } from "@/shared/ui/icons";
import { PlaceRows } from "../PlaceRows";
import { ListActions } from "./ListActions";

/**
 * 그룹 상세 — 시안 C.
 *
 * 데스크톱은 레이아웃의 사이드바가 그대로 남고 본문만 이 그룹으로 바뀐다.
 * 모바일은 `/saved` 인덱스에서 밀려 들어온 화면이라 뒤로 가는 길을 준다.
 *
 * `liked` / `ungrouped` 는 예약어다. 그룹 id 는 uuid 라 이 두 낱말과 부딪히지 않는다.
 */
export const dynamic = "force-dynamic";

const LIKED = "liked";
const UNGROUPED = "ungrouped";

async function resolve(listParam: string) {
  const [locale, view] = await Promise.all([getLocale(), loadSavedView()]);
  const m = getDictionary(locale);

  if (listParam === LIKED) {
    return { locale, m, view, title: `♥ ${m.saved.likedNav}`, kind: "liked" as const, list: null };
  }
  if (listParam === UNGROUPED) {
    return {
      locale,
      m,
      view,
      title: m.saved.listUngrouped,
      kind: "ungrouped" as const,
      list: null,
    };
  }
  const list = view.lists.find((l) => l.id === listParam) ?? null;
  return { locale, m, view, title: list?.name ?? "", kind: "list" as const, list };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ list: string }>;
}): Promise<Metadata> {
  const { list } = await params;
  const { title, m } = await resolve(list);
  return {
    title: title || m.saved.title,
    robots: { index: false, follow: false },
  };
}

export default async function SavedListPage({ params }: { params: Promise<{ list: string }> }) {
  const { list: listParam } = await params;
  const { locale, m, view, title, kind, list } = await resolve(listParam);

  /* 없는 그룹이면 404. 남의 그룹 id 를 넣어도 RLS 가 안 주므로 여기로 온다. */
  if (kind === "list" && !list) notFound();

  const rows =
    kind === LIKED
      ? view.places
      : kind === UNGROUPED
        ? view.places.filter((p) => (view.membership[p.id]?.length ?? 0) === 0)
        : view.places.filter((p) => view.membership[p.id]?.includes(listParam));

  return (
    <>
      <header className="flex flex-col gap-3 pb-1">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
            {m.common.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <Link
            href={localePath("/saved", locale)}
            className="underline-offset-4 hover:underline"
          >
            {m.saved.title}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span className="truncate" style={{ color: "var(--paper)" }}>
            {title}
          </span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1
            className="font-black"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
          >
            {title}
          </h1>
          {/* 이름 바꾸기·삭제는 진짜 그룹에만. 좋아요·그룹 없음은 지울 수 있는 것이 아니다 */}
          {kind === "list" && list ? <ListActions listId={list.id} name={list.name} /> : null}
        </div>
      </header>

      <PlaceRows
        rows={rows}
        listId={kind === "list" ? listParam : undefined}
        ungroupedOnly={kind === UNGROUPED}
        emptyText={kind === LIKED ? m.saved.empty : m.saved.listPlacesEmpty}
      />
    </>
  );
}
