import type { Metadata } from "next";
import Link from "next/link";
import { loadSavedView } from "@/shared/api/saved-server";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Icon } from "@/shared/ui/icons";
import { ConnectBanner } from "./ConnectBanner";
import { PlaceRows } from "./PlaceRows";
import { SavedIndex } from "./SavedIndex";

/**
 * 저장 첫 화면 — 플랫폼마다 답이 다르다(시안 C).
 *
 *   모바일   그룹 인덱스(좋아요 카드 + 그룹 카드) → 눌러서 상세로
 *   데스크톱 사이드바가 인덱스를 맡으므로 본문은 바로 **좋아요 목록**
 *
 * 두 벌을 다 그리고 CSS 로 가른다. 데이터는 이미 한 번에 읽어와서
 * 질의가 늘지 않고, 서버 컴포넌트라 뷰포트를 알 방법도 없다.
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

  if (view.places.length === 0) {
    return (
      <>
        <Header locale={locale} title={m.saved.title} homeLabel={m.common.home} />
        <div className="flex flex-col items-start gap-3 py-8">
          <p style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>{m.saved.empty}</p>
          <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>{m.saved.emptyHint}</p>
          <Link
            href={localePath("/map", locale)}
            className="mt-1 inline-flex h-10 items-center gap-1.5 px-4 font-bold"
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
      </>
    );
  }

  return (
    <>
      <Header locale={locale} title={m.saved.title} homeLabel={m.common.home} />

      <ConnectBanner linked={view.linked} />

      {/* 모바일 — 그룹 인덱스 */}
      <SavedIndex
        lists={view.lists}
        likedCount={view.places.length}
        ungroupedCount={view.ungroupedCount}
      />

      {/* 데스크톱 — 좋아요 목록이 바로 뜬다 */}
      <div className="hidden flex-col gap-3 lg:flex">
        <div className="flex items-center justify-between gap-3">
          <h2
            className="flex items-center gap-2"
            style={{ fontSize: "var(--t-title)", fontWeight: 800 }}
          >
            <Icon.heart className="size-4" weight="fill" style={{ color: "var(--wax)" }} />
            {m.saved.likedNav}
          </h2>
          <Link
            href={localePath("/map?saved=1", locale)}
            className="inline-flex h-9 items-center gap-1.5 px-3.5 font-bold"
            style={{
              fontSize: "var(--t-meta)",
              borderRadius: "var(--r-frame)",
              background: "var(--halo)",
              color: "var(--halo-ink)",
            }}
          >
            <Icon.map className="size-4" />
            {m.saved.viewOnMap}
          </Link>
        </div>
        <PlaceRows rows={view.places} emptyText={m.saved.empty} />
      </div>
    </>
  );
}

function Header({
  locale,
  title,
  homeLabel,
}: {
  locale: Awaited<ReturnType<typeof getLocale>>;
  title: string;
  homeLabel: string;
}) {
  return (
    <header className="flex flex-col gap-3 pb-1">
      <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
        <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
          {homeLabel}
        </Link>
        <Icon.chevron className="size-2.5" />
        <span style={{ color: "var(--paper)" }}>{title}</span>
      </nav>
      <h1
        className="font-black"
        style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
      >
        {title}
      </h1>
    </header>
  );
}
