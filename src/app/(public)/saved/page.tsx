import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { loadSavedView } from "@/shared/api/saved-server";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Icon } from "@/shared/ui/icons";
import { ConnectBanner } from "./ConnectBanner";
import { SavedIndex } from "./SavedIndex";

/**
 * 저장 첫 화면 — 시안 D.
 *
 *   모바일·데스크톱 둘 다 엽서 인덱스(좋아요 컷 + 그룹 스택)
 *   상세는 `/saved/liked` · `/saved/[id]`
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
        <Header
          locale={locale}
          title={m.saved.title}
          homeLabel={m.common.home}
          extra={
            !view.linked ? (
              <p className="hidden lg:block" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
                {m.saved.restore}{" "}
                <Link
                  href={`${localePath("/login", locale)}?next=${encodeURIComponent(localePath("/saved", locale))}`}
                  className="font-bold underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  {m.saved.restoreCta}
                </Link>
              </p>
            ) : null
          }
        />
        <div className="flex flex-col items-start gap-3 py-8 lg:max-w-md lg:py-14">
          <p style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>{m.saved.empty}</p>
          <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>{m.saved.emptyHint}</p>
          <Link
            href={localePath("/map", locale)}
            className="mt-1 inline-flex h-10 items-center gap-1.5 px-4 font-bold lg:h-11"
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

          {!view.linked ? (
            <p className="mt-(--stack) lg:hidden" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              {m.saved.restore}{" "}
              <Link
                href={`${localePath("/login", locale)}?next=${encodeURIComponent(localePath("/saved", locale))}`}
                className="underline underline-offset-4"
                style={{ color: "var(--paper)", fontWeight: 700 }}
              >
                {m.saved.restoreCta}
              </Link>
            </p>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        locale={locale}
        title={m.saved.title}
        homeLabel={m.common.home}
        extra={
          <div className="hidden lg:block">
            <Suspense>
              <ConnectBanner linked={view.linked} />
            </Suspense>
          </div>
        }
      />
      <div className="lg:hidden">
        <Suspense>
          <ConnectBanner linked={view.linked} />
        </Suspense>
      </div>
      <SavedIndex
        lists={view.lists}
        places={view.places}
        membership={view.membership}
        likedCount={view.places.length}
        ungroupedCount={view.ungroupedCount}
      />
    </>
  );
}

function Header({
  locale,
  title,
  homeLabel,
  extra,
}: {
  locale: Awaited<ReturnType<typeof getLocale>>;
  title: string;
  homeLabel: string;
  extra?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 pb-1">
      <nav className="index flex items-center gap-1.5 lg:hidden" style={{ color: "var(--dim)" }}>
        <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
          {homeLabel}
        </Link>
        <Icon.chevron className="size-2.5" />
        <span style={{ color: "var(--paper)" }}>{title}</span>
      </nav>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {title}
        </h1>
        {extra}
      </div>
    </header>
  );
}
