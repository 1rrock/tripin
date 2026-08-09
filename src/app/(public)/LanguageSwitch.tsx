"use client";

/**
 * KO | EN — 같은 페이지의 다른 로케일 URL로 이동.
 *
 * /en/* 는 proxy rewrite 로 내부 페이지 트리가 ko 와 같아져서, Next <Link>
 * 소프트 네비게이션만 하면 RSC·LocaleProvider 가 새 로케일로 다시 안 그려진다.
 * → 일반 <a> 풀 도큐먼트 이동으로 헤더·딕셔너리를 다시 받는다.
 */

import { usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { switchLocalePath } from "@/shared/i18n/paths";

export function LanguageSwitch() {
  const { locale, messages } = useLocale();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const search = searchParams?.toString();
  const q = search ? `?${search}` : "";

  const koHref = switchLocalePath(pathname, q, "ko");
  const enHref = switchLocalePath(pathname, q, "en");

  return (
    <div
      className="index flex items-center gap-1"
      style={{ color: "var(--dim)" }}
      aria-label={messages.common.language}
    >
      <a
        href={koHref}
        hrefLang="ko"
        aria-current={locale === "ko" ? "true" : undefined}
        className="px-1 py-1 underline-offset-4 hover:underline"
        style={{ color: locale === "ko" ? "var(--paper)" : "var(--dim)" }}
      >
        KO
      </a>
      <span aria-hidden>/</span>
      <a
        href={enHref}
        hrefLang="en"
        aria-current={locale === "en" ? "true" : undefined}
        className="px-1 py-1 underline-offset-4 hover:underline"
        style={{ color: locale === "en" ? "var(--paper)" : "var(--dim)" }}
      >
        EN
      </a>
    </div>
  );
}
