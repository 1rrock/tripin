import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadAccount } from "@/shared/api/account-server";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Icon } from "@/shared/ui/icons";
import { LoginPanel } from "@/shared/ui/LoginPanel";

/**
 * 로그인 도착점. 게이트가 아니다 — 하트를 막지 않는다.
 *
 * 새 기기 · "다른 기기에서 저장하셨나요" · 북마크가 여기로 온다.
 * 이미 신원이 있으면 마이로 보낸다.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return { title: m.account.loginPageTitle, robots: { index: false, follow: false } };
}

function one(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function safeNext(raw: string | undefined): string {
  if (!raw) return "/account";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const view = await loadAccount();
  const params = await searchParams;
  const rawNext = safeNext(one(params.next));
  const next =
    rawNext.startsWith("/en") || locale === "ko" ? rawNext : localePath(rawNext, locale);
  const authError = one(params.auth_error);

  if (view.linked) {
    redirect(next === "/login" || next === "/en/login" ? localePath("/account", locale) : next);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4 lg:max-w-5xl lg:pt-8">
      <nav className="index flex items-center gap-1.5 lg:hidden" style={{ color: "var(--dim)" }}>
        <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
          {m.common.home}
        </Link>
        <Icon.chevron className="size-2.5" />
        <span style={{ color: "var(--paper)" }}>{m.account.loginPageTitle}</span>
      </nav>
      <div className="flex flex-col gap-(--block) lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-16 lg:pt-4">
        <div className="lg:pt-1">
          <h1
            className="font-black"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
          >
            {m.account.loginTitle}
          </h1>
          <p className="mt-2 max-w-md" style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
            {m.account.loginHint}
          </p>
        </div>
        <LoginPanel backTo={next} authError={authError} hideHeading />
      </div>
    </main>
  );
}
