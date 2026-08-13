import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { publicMeta } from "@/shared/seo/page-meta";
import { Icon } from "@/shared/ui/frame";


const h2 = {
  fontSize: "var(--t-title)",
  fontWeight: 700,
  color: "var(--paper)",
  letterSpacing: "-0.02em",
} as const;

const body = {
  fontSize: "var(--t-body)",
  color: "var(--dim)",
  lineHeight: 1.7,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "ko" ? "개인정보처리방침" : "Privacy";
  const description =
    locale === "ko"
      ? "Eatripin이 수집하는 개인정보와 쿠키에 대한 안내."
      : "What personal data and cookies Eatripin collects.";
  return publicMeta({ locale, title, description, bare: "/privacy" });
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const title = locale === "ko" ? "개인정보처리방침" : "Privacy";

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <header className="flex flex-col gap-3 pb-1">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
            {m.common.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{title}</span>
        </nav>
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {title}
        </h1>
      </header>

      <div className="flex max-w-[64ch] flex-col gap-(--block)">
        {locale === "ko" ? (
          <>
            <section className="flex flex-col gap-3">
              <h2 style={h2}>수집하는 개인정보</h2>
              <p style={body}>
                일반 방문자를 위한 화면(홈, 채널, 도시, 장소 페이지 등)에는 회원가입·로그인이
                없고, 별도로 이름·이메일 같은 개인정보를 입력받거나 저장하지 않습니다. 삭제 요청을
                이메일로 보내주시면 그 메일 내용(연락처 포함)만 요청 처리를 위해 보관합니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>쿠키</h2>
              <p style={body}>
                한국어·영어 화면 전환은 URL 경로(`/en` 접두사)로 처리되어 언어 설정을 쿠키에
                저장하지 않습니다. 사이트에서 쿠키를 발급하는 곳은 저희 내부 운영 도구인 어드민
                로그인뿐이며, 이 쿠키는 운영자 본인 인증용으로만 쓰이고 방문자 추적과 무관합니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>광고</h2>
              <p style={body}>
                현재 이 사이트는 광고를 게재하지 않습니다. 이후 광고(예: Google AdSense)를 도입하면
                광고 사업자가 맞춤 광고를 위해 쿠키나 기기 식별자를 사용할 수 있으며, 그 시점에 이
                문서에 구체적인 광고 쿠키 고지와 선택 방법을 추가하겠습니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>문의</h2>
              <p style={body}>
                개인정보 처리와 관련해 궁금하신 점이 있으면{" "}
                <Link
                  href={localePath("/takedown", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  삭제 요청
                </Link>{" "}
                페이지의 연락처로 문의해 주세요.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 style={h2}>What personal data we collect</h2>
              <p style={body}>
                Public pages (home, channel, city, and place pages) require no account or login,
                and we don&rsquo;t collect or store personal information like your name or email
                through them. If you email us a removal request, we keep only that email (including
                any contact info you include) to process the request.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>Cookies</h2>
              <p style={body}>
                Switching between Korean and English is handled by URL path (an `/en` prefix), so
                we don&rsquo;t store your language choice in a cookie. The only cookie this site
                sets is for our internal admin login, used solely to authenticate the operator — it
                has nothing to do with tracking visitors.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>Advertising</h2>
              <p style={body}>
                This site does not currently run ads. If we add advertising (for example, Google
                AdSense) in the future, the ad provider may use cookies or device identifiers for
                personalized ads — we&rsquo;ll add specific ad-cookie disclosure and opt-out
                information here at that point.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>Contact</h2>
              <p style={body}>
                If you have questions about how we handle personal data, please reach us through
                the contact on the{" "}
                <Link
                  href={localePath("/takedown", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  report an issue
                </Link>{" "}
                page.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
