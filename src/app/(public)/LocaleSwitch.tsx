"use client";

/**
 * KO/EN 전환 — 푸터 정책 색인 옆 한 칸.
 *
 * 로케일은 proxy 가 Accept-Language 로 첫 진입 때 정하는데, 그 판정이 틀린 사람
 * (한국 브라우저의 영어 화자, EN 공유 링크로 온 한국어 화자)에게는 되돌릴 길이
 * 없었다. 라벨은 **넘어갈 언어를 그 언어로** 적는다 — 지금 화면 언어를 못 읽는
 * 사람이 눌러야 하는 버튼이다.
 *
 * **링크는 JS 없이도 HTML 에 있어야 한다.** 예전에는 이 조각이 통째로
 * `useSearchParams()` 를 썼고 layout 이 `<Suspense fallback={null}>` 로 감쌌다.
 * 정적 렌더에서는 그 fallback(null) 이 그대로 굳어서, 홈·/map·/about 같은 SSG
 * 페이지의 HTML 에는 전환 링크가 **아예 없었다**(프로덕션 실측: `/`·`/map`·
 * `/about` 0개, 런타임 SSR 인 `/city/[city]` 만 1개). 되돌릴 길이 JS 에 걸려
 * 있으면 proxy.ts 가 적어 둔 설계 근거("영어 브라우저 사용자가 푸터에서 한국어로
 * 바꾼다")가 성립하지 않는다.
 *
 * 그래서 **경로만 읽는 링크 본체는 경계 밖**에 두고, 쿼리스트링을 얹는 조각만
 * Suspense 안으로 내렸다. 로케일은 서버(layout)가 세그먼트에서 읽어 prop 으로
 * 내려준다 — 라벨과 목적지 언어는 클라이언트 상태에 기대지 않는다.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/shared/i18n/config";
import { switchLocalePath } from "@/shared/i18n/paths";

/**
 * 정적 렌더의 pathname 은 **라우트 경로**(`/ko`·`/ko/map`)고, 런타임 SSR 과
 * 브라우저는 **주소창 경로**(`/`·`/map`)다 — proxy 가 ko 를 `/ko/*` 로 rewrite
 * 하기 때문이다. `stripLocalePrefix` 는 `/en` 만 걷어내므로 `/ko` 는 여기서 한 번
 * 더 벗긴다. 안 벗기면 SSG 페이지의 전환 링크가 `/en/ko/map` 으로 굳어, JS 가
 * 붙기 전에 누른 사람이 404 로 간다.
 *
 * (같은 이유로 ko 정적 페이지에서는 Nav 의 `aria-current` 도 서버 HTML 에 안
 * 붙는다 — 근본 고침은 `stripLocalePrefix` 가 `/ko` 를 함께 걷는 것이고, 그
 * 파일은 i18n 소유다. 여기서는 이 링크만 스스로 막는다.)
 */
function addressPath(pathname: string): string {
  if (pathname === "/ko") return "/";
  if (pathname.startsWith("/ko/")) return pathname.slice(3);
  return pathname;
}

export function LocaleSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  /* 쿼리는 하이드레이션 뒤에야 온다. 그 전에도 href 는 유효한 경로여야 한다 —
     빈 문자열이 곧 "경로만" 이다. */
  const [search, setSearch] = useState("");
  const next: Locale = locale === "en" ? "ko" : "en";

  return (
    <>
      <Link
        href={switchLocalePath(addressPath(pathname), search, next)}
        className="nav-link"
        lang={next}
        aria-label={next === "en" ? "Switch to English" : "한국어로 보기"}
      >
        {next === "en" ? "English" : "한국어"}
      </Link>
      {/* useSearchParams() 는 정적 렌더에서 CSR 로 빠진다(missing-suspense-with-
          csr-bailout). 경계를 이 한 조각에만 둬야 링크 본체가 HTML 에 남는다 —
          경계가 링크를 감싸면 fallback(null) 이 그대로 정적 산출물이 된다. */}
      <Suspense fallback={null}>
        <SearchQuery onChange={setSearch} />
      </Suspense>
    </>
  );
}

/** 현재 쿼리스트링을 링크로 올린다 — 지도 필터를 켠 채 언어만 바꾸는 길. */
function SearchQuery({ onChange }: { onChange: (search: string) => void }) {
  const sp = useSearchParams();
  const query = sp.toString();
  useEffect(() => {
    onChange(query ? `?${query}` : "");
  }, [query, onChange]);
  return null;
}
