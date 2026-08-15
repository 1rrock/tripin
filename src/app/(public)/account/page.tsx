import type { Metadata } from "next";
import Link from "next/link";
import { loadAccount } from "@/shared/api/account-server";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Frame } from "@/shared/ui/frame";
import { Icon } from "@/shared/ui/icons";
import { Thumb } from "@/shared/ui/Thumb";
import { IdentityCard } from "./IdentityCard";
import { SubscriptionList } from "./SubscriptionList";
import { DangerZone } from "./DangerZone";

/**
 * 마이페이지 — 시안 D. **모아 둔 컷이 프로필이다.**
 *
 * 모바일은 한 줄로 쌓는다. 데스크톱(lg+)은 책상이다 —
 *   왼쪽  저장·구독 (얼굴)
 *   오른쪽 로그인·로그아웃·탈퇴 (서랍)
 *
 * 약관 링크는 푸터가 맡는다. 게이트는 없다.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return { title: m.account.title, robots: { index: false, follow: false } };
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const view = await loadAccount();

  const raw = (await searchParams).auth_error;
  const authError = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4 lg:max-w-5xl lg:pt-8">
      <header className="flex flex-col gap-2 pb-1">
        <nav className="index flex items-center gap-1.5 lg:hidden" style={{ color: "var(--dim)" }}>
          <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
            {m.common.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{m.account.title}</span>
        </nav>
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {m.account.title}
        </h1>
      </header>

      <div className="flex flex-col gap-(--block) lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-16">
        <div className="flex flex-col gap-(--block)">
          <section className="flex flex-col gap-3">
            <p className="index" style={{ color: "var(--dim)" }}>
              {m.account.deviceList}
            </p>

            {view.cuts.length > 0 ? (
              <Link
                href={localePath("/saved/liked", locale)}
                className="flex gap-1.5 overflow-x-auto no-scrollbar lg:grid lg:grid-cols-4 lg:gap-2 lg:overflow-visible"
                aria-label={t(m.account.savedLine, { n: view.savedCount })}
              >
                {view.cuts.map((cut, i) => (
                  <Frame key={`${cut.youtubeId}-${i}`} className="w-[112px] shrink-0 lg:w-auto">
                    <Thumb youtubeId={cut.youtubeId} alt={cut.videoTitle} eager={i < 4} />
                  </Frame>
                ))}
              </Link>
            ) : null}

            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <Link
                href={localePath("/saved/liked", locale)}
                className="font-extrabold"
                style={{ fontSize: "var(--t-title)" }}
              >
                {t(m.account.savedLine, { n: view.savedCount })}
              </Link>
              <span
                className="tnum flex flex-wrap items-baseline gap-x-1.5"
                style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
              >
                <Link href={localePath("/saved", locale)} className="hover:underline">
                  {m.account.savedLists} {t(m.account.countLists, { n: view.listCount })}
                </Link>
                <span aria-hidden>·</span>
                <Link href={localePath("/map?saved=1", locale)} className="hover:underline">
                  {m.saved.viewOnMap}
                </Link>
              </span>
            </div>
          </section>

          <SubscriptionList creators={view.creators} channelsHref={localePath("/channels", locale)} />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-8">
          <hr className="rule lg:hidden" />
          <IdentityCard linked={view.linked} email={view.email} authError={authError} />
          {view.userId ? (
            <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              <DangerZone savedCount={view.savedCount} />
            </p>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
