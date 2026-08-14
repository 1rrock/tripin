import type { Metadata } from "next";
import Link from "next/link";
import { loadSavedView } from "@/shared/api/saved-server";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Icon } from "@/shared/ui/icons";
import { ConnectBanner } from "./ConnectBanner";
import { SavedList } from "./SavedList";

/**
 * 저장한 곳.
 *
 * 이 화면만 로그인을 권한다(`ConnectBanner`). 홈·지도·상세에는 권유가 없다 —
 * ROADMAP.md "로그인 권유 위치: /saved 목록 화면 상단 배너에서만".
 *
 * 색인하지 않는다. 유저별 화면이라 크롤러에게 보일 것이 없고,
 * 색인되면 빈 페이지가 검색 결과에 뜬다.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return {
    title: m.saved.title,
    robots: { index: false, follow: false },
  };
}

export default async function SavedPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const view = await loadSavedView();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4">
      <header className="flex flex-col gap-3 pb-1">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
            {m.common.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{m.saved.title}</span>
        </nav>
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {m.saved.title}
        </h1>
      </header>

      {/* 저장한 것이 있을 때만 연결을 권한다 — 빈 목록에서 로그인부터 묻지 않는다 */}
      {view.places.length > 0 ? <ConnectBanner linked={view.linked} /> : null}

      <SavedList rows={view.places} />
    </main>
  );
}
