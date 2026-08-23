"use client";

/**
 * 헤더 왼쪽 — 브랜드 또는 **화면 제목**.
 *
 * 저장·마이는 목적지지 랜딩이 아니다. 이미 들어와 있는 사람에게 워드마크는
 * 매번 같은 자리에서 아무 말도 하지 않으므로, 그 자리를 제목에 준다(구글 지도·유튜브
 * 문법). 제목은 `AppBarTitle` 로 세운다 — 장소 전체화면 머리말과 같은 조각이라
 * 화면이 바뀌어도 제목의 크기·자리가 흔들리지 않는다.
 *
 * `/map` 은 여기 없다 — globals.css 가 `html.is-map .site-header` 를 통째로 감춰서
 * 지도에서는 헤더 자체가 서지 않는다. 분기를 남겨 둬도 화면에 나오지 않는다.
 *
 * 나머지 화면(홈·채널·도시·영상)은 브랜드가 그대로 선다. 검색으로 들어오는 문서형
 * 페이지라 "여기가 어디인가" 를 브랜드가 말해 주는 편이 낫다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { stripLocalePrefix } from "@/shared/i18n/paths";
import { AppBarTitle } from "@/shared/ui/AppBar";
import { Mark } from "@/shared/ui/Mark";
import { Wordmark } from "@/shared/ui/Wordmark";

/** 제목을 다는 화면. 하위 경로(`/saved/...`)도 같은 제목을 쓴다. */
const TITLED = ["/saved", "/account"] as const;

export function HeaderLead() {
  const { messages: m, href } = useLocale();
  const bare = stripLocalePrefix(usePathname() ?? "/");
  const screen = TITLED.find((p) => bare === p || bare.startsWith(`${p}/`));

  if (screen) {
    const title = screen === "/saved" ? m.saved.title : m.account.title;
    return <AppBarTitle fill={false}>{title}</AppBarTitle>;
  }

  return (
    <Link
      href={href("/")}
      aria-label={m.brandAria}
      className="flex shrink-0 items-center gap-2.5"
      style={{ color: "var(--paper)" }}
    >
      <Mark className="size-7 shrink-0" />
      <Wordmark />
    </Link>
  );
}
