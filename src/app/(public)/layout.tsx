import Link from "next/link";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { LocaleProvider } from "@/shared/i18n/LocaleContext";
import { Mark } from "@/shared/ui/Mark";
import { Wordmark } from "@/shared/ui/Wordmark";
import { SavedProvider } from "@/shared/ui/SavedContext";
import { AuthHashRescue } from "./AuthHashRescue";
import { HeaderLead } from "./HeaderLead";
import { DesktopRail, Nav, TabDock } from "./Nav";
import { SearchBar } from "./SearchBar";

/**
 * 유저 화면 공통 골격 — 흰 종이, 핀 하나만 산호.
 *
 * 로케일: proxy 가 x-tripin-locale 을 심고, 여기 딕셔너리·링크 접두사에 반영한다.
 * 어드민은 (public) 밖이라 ko 고정.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const home = localePath("/", locale);

  return (
    <LocaleProvider locale={locale} messages={m}>
      {/* 저장 상태는 화면 전체가 공유한다. 세션 쿠키가 없으면 이 프로바이더는
          네트워크를 타지 않는다 — 비로그인 방문자에게 비용이 붙지 않는다. */}
      <SavedProvider>
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
              헤더 폭이 1152px 인데 좌우 요소가 650px 밖에 안 써서 가운데가 비어 있었다.
              언어는 proxy 가 Accept-Language 로 첫 진입 시 정한다 — KO/EN 토글 UI 없음. */}
          <SearchBar />

          {/* 내비를 감싸는 div 를 두지 않는다 — 모바일에서 그 안이 통째로 비는데
              (데스크톱 내비는 hidden, 탭바는 fixed 라 흐름 밖) 껍데기가 헤더 gap 을
              한 칸 더 먹어서 검색 버튼이 우측 여백 18px 이 아니라 30px 에 섰다. */}
          <Nav />
          <a href="#notice" className="nav-link index hidden shrink-0 md:inline">
            {m.nav.notice}
          </a>

          {/* 계정 아이콘은 여기 없다 — 탭바 맨 오른쪽 칸으로 내렸다(TabDock).
              헤더 우측은 브랜드·검색과 한 줄이라 크롬처럼 읽히는데, 마이페이지는
              엄지로 눌러 들어가는 목적지다. 데스크톱(lg+)에서는 이 헤더가 숨고
              DesktopRail 맨 아래가 같은 일을 한다. */}
        </header>

        <div className="flex-1">{children}</div>

        {/*
          푸터 = 시트의 **가장자리 인화**. 필름 여백에 찍히는 롤 이름·프레임 번호처럼,
          본편이 끝난 자리에 재료 자신의 정보가 작게 남는다. UI 크롬 바가 아니다.

          두 단으로만 나눈다:
            · 가장자리 — 왼쪽 랩 스탬프(마크), 오른쪽 정책 색인
            · 여백 인화 — 고지 본문. 왁스는 이 화면에서 딱 하나, "요청 보내기"에만 찍힌다
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
              ].map((it) => (
                <Link
                  key={it.href}
                  href={localePath(it.href, locale)}
                  className="nav-link"
                >
                  {it.label}
                </Link>
              ))}
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
  );
}
