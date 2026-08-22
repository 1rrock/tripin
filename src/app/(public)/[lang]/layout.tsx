import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicEnv } from "@/shared/config/env";
import { locales, isLocale, type Locale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/paths";
import { LocaleProvider } from "@/shared/i18n/LocaleContext";
import { siteOrigin, RSS_ALTERNATE } from "@/shared/seo/page-meta";
import { JsonLd, organizationNode, websiteNode } from "@/shared/seo/json-ld";
import { Mark } from "@/shared/ui/Mark";
import { Wordmark } from "@/shared/ui/Wordmark";
import { SavedProvider } from "@/shared/ui/SavedContext";
import { fontClasses } from "@/app/fonts";
import { SiteAnalytics } from "@/app/SiteAnalytics";
import { AuthHashRescue } from "../AuthHashRescue";
import { HeaderLead } from "../HeaderLead";
import { LocaleSwitch } from "../LocaleSwitch";
import { DesktopRail, Nav, TabDock } from "../Nav";
import { SearchBar } from "../SearchBar";
import { MapRouteChrome } from "../MapRouteChrome";
import "@/app/globals.css";

/**
 * 공개 화면의 **루트 레이아웃** — html 셸과 유저 화면 공통 골격(흰 종이, 핀 하나만 산호).
 *
 * 로케일이 헤더가 아니라 **URL 세그먼트**다. proxy 가 ko 경로를 `/ko/*` 로 rewrite
 * 하고(브라우저 주소는 그대로), `/en/*` 은 세그먼트가 이미 맞아 그대로 통과한다.
 * `headers()` 를 읽지 않으므로 이 트리는 정적(ISR) 렌더가 가능하다 — 이게 이 구조의
 * 존재 이유다. 여기서 `headers()`·`cookies()` 를 읽는 순간 공개 페이지 전체가
 * 요청마다 렌더되는 옛 구조(Vercel Active CPU 소진)로 되돌아간다.
 *
 * 어드민은 이 트리 밖 — `admin/layout.tsx` 가 제 몫의 html 셸을 따로 갖는다(ko 고정).
 */

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

type LangParams = { params: Promise<{ lang: string }> };

/**
 * 루트 폴백 메타데이터 — 페이지가 자기 `generateMetadata`에서 `openGraph`를
 * 명시적으로 오버라이드하지 않으면 여기로 떨어진다. 로케일은 세그먼트에서 온다 —
 * 정적으로 "ko_KR"·한국어 문구를 고정하면 EN 공유 카드가 전부 한국어로 나간다.
 */
export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ko";
  const m = getDictionary(locale);
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: {
      default: m.meta.homeTitle,
      template: `%s | ${m.brand}`,
    },
    description: m.meta.homeDescription,
    /* 공유 카드 기본값 — images 는 opengraph-image.tsx 파일 규약이 자동으로 채운다 */
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "ko_KR",
      siteName: m.brand,
      title: m.meta.homeTitle,
      description: m.meta.homeDescription,
    },
    twitter: {
      card: "summary_large_image",
    },
    /* RSS 자동 발견 — 브라우저·리더·크롤러가 <head> 에서 집어 간다. */
    alternates: {
      types: {
        ...RSS_ALTERNATE,
      },
    },
    robots: {
      googleBot: {
        "max-image-preview": "large",
      },
    },
    /**
     * 검색엔진 소유 확인.
     *
     * ⚠️ **정규 호스트는 apex(`eatripin.com`)다.** www 는 308 로 apex 에 모인다.
     *    canonical·사이트맵·RSS·hreflang 이 전부 apex 를 가리키므로 검색엔진 콘솔의
     *    사이트 등록도 apex 여야 한다. (경위는 git history 의 옛 루트 layout.tsx 주석)
     */
    verification: {
      google: "lkxLO-HERLGf1WGk8DEGktQW_kCeCwXphuEsfj8NGog",
      other: {
        "naver-site-verification": "e06f7aa88418cdf08644308d588d602640b773b8",
      },
    },
  };
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const m = getDictionary(locale);
  const site = siteOrigin();
  const home = localePath("/", locale);

  return (
    <html lang={locale} className={fontClasses}>
      <body className="flex min-h-full flex-col">
        <JsonLd
          data={[
            websiteNode(site, m.brand, m.meta.homeDescription),
            organizationNode(site, m.brand, m.meta.homeDescription),
          ]}
        />
        {/* 방향 계약 — 빌드 산출물에 HTML 주석으로 남아야 감사 가능 (JSX 주석은 스트립됨) */}
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: 유튜브에서 본 가게를 상호와 지도로 연결한다. 흰 종이 위의 사실 목록이고, 산호는 핀 하나로만 켜진다. 거부하는 배치: 웜 페이퍼 콘택트 시트, 베이지 그레인, 인덱스 자간 코스튬, 지도 퍼스트 여행 앱.
OWN-WORLD: 순백 #fff + 무채 잉크 #171717. 산호 #c9441a 는 마크·활성·주 CTA 만. 구분은 1px 헤어라인. 카드 크롬 없음. Phosphor weight 가 상태. Paperlogy 구조/본문 + 숫자 tabular. 16:9 프레임만 원본 비율.
STORY: 여행 영상을 보던 사람이 "그 가게 어디였지"로 들어와, 프레임을 훑고 → 그 아래 실제 상호명을 보고 → 타임코드가 붙은 영상과 지도로 나간다.
FIRST VIEWPORT: 홈 — 검색 한 칸, 도시 타일, 채널×도시 조각. 썸네일 아래 상호명이 헤드라인.
FORM: 핀 하나만 산호 (hidden-spot 시스템 규율, Eatripin 브랜드). 유저 지정.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        <LocaleProvider locale={locale} messages={m}>
          {/* 저장 상태는 화면 전체가 공유한다. 세션 쿠키가 없으면 이 프로바이더는
              네트워크를 타지 않는다 — 비로그인 방문자에게 비용이 붙지 않는다. */}
          <SavedProvider>
            <MapRouteChrome />
            <AuthHashRescue />
            {/* 모바일은 하단 탭바(Nav)가 fixed 로 떠 있다 — 그 높이만큼 지면을 비워 두지
                않으면 푸터 마지막 줄이 바 밑으로 들어간다. 바 높이 60px + 홈 인디케이터 */}
            <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0 lg:max-w-none lg:pl-[88px]">
              <DesktopRail />
              <header
                /* site-header — 지도 화면에서 통째로 감춘다(globals.css) */
                className="site-header sticky top-0 z-30 flex items-center gap-3 border-b bg-(--ground)/95 px-(--gutter) pt-3 pb-2.5 backdrop-blur lg:hidden"
                style={{ borderColor: "var(--hairline)" }}
              >
                {/* 브랜드 자리 — 지도·저장·마이에서는 화면 제목이 대신 선다(HeaderLead) */}
                <HeaderLead />

                {/* 검색은 브랜드와 내비 사이를 채우며 가운데 선다(유튜브 문법).
                    언어는 proxy 가 Accept-Language 로 첫 진입 시 정한다 — 되돌리는 길은
                    푸터의 LocaleSwitch. */}
                <SearchBar />

                {/* 내비를 감싸는 div 를 두지 않는다 — 모바일에서 그 안이 통째로 비는데
                    껍데기가 헤더 gap 을 한 칸 더 먹어서 검색 버튼이 우측 여백 18px 이
                    아니라 30px 에 섰다. */}
                <Nav />
                <a href="#notice" className="nav-link index hidden shrink-0 md:inline">
                  {m.nav.notice}
                </a>

                {/* 계정 아이콘은 여기 없다 — 탭바 맨 오른쪽 칸으로 내렸다(TabDock). */}
              </header>

              <div className="flex-1">{children}</div>

              {/*
                푸터 = 시트의 **가장자리 인화**. 필름 여백에 찍히는 롤 이름·프레임 번호처럼,
                본편이 끝난 자리에 재료 자신의 정보가 작게 남는다. UI 크롬 바가 아니다.
              */}
              <footer
                id="notice"
                aria-labelledby="notice-h"
                className="mt-(--block) border-t px-(--gutter) pt-(--stack) pb-(--block)"
                style={{ borderColor: "var(--hairline)" }}
              >
                <div className="flex flex-col gap-(--stack) md:flex-row md:items-center md:justify-between">
                  <Link
                    href={home}
                    aria-label={m.brandAria}
                    className="flex w-fit items-center gap-2.5 transition-opacity hover:opacity-70"
                  >
                    <Mark className="size-6 shrink-0" />
                    <Wordmark style={{ fontSize: "12px" }} />
                  </Link>

                  {/* flex-wrap 필수 — 없으면 EN 라벨 4개가 375px 화면 밖으로 나간다 */}
                  <nav
                    aria-label={m.notice.linksAria}
                    className="index flex flex-wrap gap-x-5 gap-y-2.5"
                  >
                    {[
                      { href: "/about", label: m.common.about },
                      { href: "/policy", label: m.common.policy },
                      { href: "/privacy", label: m.common.privacy },
                      { href: "/takedown", label: m.common.takedown },
                      { href: "/apply", label: m.common.apply },
                    ].map((it) => (
                      <Link
                        key={it.href}
                        href={localePath(it.href, locale)}
                        className="nav-link"
                      >
                        {it.label}
                      </Link>
                    ))}
                    {/* useSearchParams() 사용 — Suspense 없이는 정적 프리렌더가
                        통째로 CSR 로 빠진다(missing-suspense-with-csr-bailout). */}
                    <Suspense fallback={null}>
                      <LocaleSwitch />
                    </Suspense>
                  </nav>
                </div>

                <h2 id="notice-h" className="index mt-(--block)" style={{ color: "var(--dim)" }}>
                  {m.notice.title}
                </h2>

                {/*
                  폭은 ch 로 재지 않는다 — ch 는 "0" 글리프 폭(≈7px)이라 42ch 가 294px 밖에
                  안 되고, 전각인 한글은 한 줄 22자에서 끊겨 국수 가락 컬럼이 된다.
                  한글 13px × 40자 ≈ 520px 기준으로 34rem 을 직접 준다.
                */}
                <div
                  className="mt-(--stack) flex max-w-[34rem] flex-col gap-2.5"
                  style={{ fontSize: "var(--t-meta)", lineHeight: 1.75, color: "var(--dim)" }}
                >
                  <p>
                    {m.notice.p1Before}
                    <strong className="font-bold" style={{ color: "var(--paper)" }}>
                      {m.notice.p1Strong}
                    </strong>
                    {m.notice.p1After}
                  </p>
                  <p>{m.notice.p2}</p>
                  <p>
                    {m.notice.p3}{" "}
                    <Link
                      href={localePath("/takedown", locale)}
                      className="font-medium underline underline-offset-4"
                      style={{ color: "var(--wax)" }}
                    >
                      {m.notice.p3LinkLabel}
                    </Link>
                  </p>
                </div>
              </footer>
            </div>
            <TabDock />
          </SavedProvider>
        </LocaleProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
