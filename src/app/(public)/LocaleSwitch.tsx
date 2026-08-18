"use client";

/**
 * KO/EN 전환 — 푸터 정책 색인 옆 한 칸.
 *
 * 로케일은 proxy 가 Accept-Language 로 첫 진입 때 정하는데, 그 판정이 틀린 사람
 * (한국 브라우저의 영어 화자, EN 공유 링크로 온 한국어 화자)에게는 되돌릴 길이
 * 없었다. 라벨은 **넘어갈 언어를 그 언어로** 적는다 — 지금 화면 언어를 못 읽는
 * 사람이 눌러야 하는 버튼이다.
 */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { switchLocalePath } from "@/shared/i18n/paths";

export function LocaleSwitch() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const { locale } = useLocale();
  const next = locale === "en" ? "ko" : "en";
  const search = sp.toString();
  return (
    <Link
      href={switchLocalePath(pathname, search ? `?${search}` : "", next)}
      className="nav-link"
      lang={next}
      aria-label={next === "en" ? "Switch to English" : "한국어로 보기"}
    >
      {next === "en" ? "English" : "한국어"}
    </Link>
  );
}
