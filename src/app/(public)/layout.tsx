import { Suspense } from "react";
import Link from "next/link";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { LocaleProvider } from "@/shared/i18n/LocaleContext";
import { Nav } from "./Nav";
import { LanguageSwitch } from "./LanguageSwitch";

/**
 * 유저 화면 공통 골격 — 콘택트 시트.
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
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col xl:max-w-6xl">
        <header className="flex items-center justify-between px-(--gutter) pt-5 pb-4">
          <Link href={home} aria-label={m.brandAria} className="flex items-baseline gap-2">
            <span
              style={{
                fontFamily: "var(--font-archivo), sans-serif",
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "0.22em",
              }}
            >
              TRIPIN
            </span>
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: "var(--r-round)",
                background: "var(--wax)",
                display: "inline-block",
              }}
            />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Suspense fallback={null}>
              <LanguageSwitch />
            </Suspense>
            <Nav />
            <a
              href="#notice"
              className="index hidden underline-offset-4 hover:underline md:inline"
              style={{ color: "var(--dim)" }}
            >
              {m.nav.notice}
            </a>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer id="notice" className="mt-(--block) px-(--gutter) pb-12">
          <hr className="rule mb-5" />
          <p className="index mb-3" style={{ color: "var(--dim)" }}>
            {m.notice.title}
          </p>
          <div className="flex max-w-[42ch] flex-col gap-3">
            <p style={{ fontSize: "var(--t-meta)", lineHeight: 1.7, color: "var(--dim)" }}>
              {locale === "ko" ? (
                <>
                  Tripin은 공개된 영상 정보를 정리한{" "}
                  <strong className="font-bold" style={{ color: "var(--paper)" }}>
                    {m.notice.p1Strong}
                  </strong>{" "}
                  디렉터리입니다. 각 크리에이터·채널과 제휴 관계가 없으며, 모든 장소 정보에는 출처
                  영상이 표기됩니다. 가격·영업 정보는 영상 촬영 시점 기준으로 실제와 다를 수
                  있습니다.
                </>
              ) : (
                <>
                  Tripin is an{" "}
                  <strong className="font-bold" style={{ color: "var(--paper)" }}>
                    {m.notice.p1Strong}
                  </strong>{" "}
                  directory of publicly available video information. It is not affiliated with any
                  creator or channel. Every place links back to a source video. Prices and hours are
                  as of filming and may be outdated.
                </>
              )}
            </p>
            <p style={{ fontSize: "var(--t-meta)", lineHeight: 1.7, color: "var(--dim)" }}>
              {m.notice.p2}
            </p>
            <p style={{ fontSize: "var(--t-meta)", lineHeight: 1.7, color: "var(--dim)" }}>
              {m.notice.p3}
            </p>
          </div>
        </footer>
      </div>
    </LocaleProvider>
  );
}
