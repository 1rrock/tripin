import type { Metadata } from "next";
import Link from "next/link";
import { publicEnv } from "@/shared/config/env";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { publicMeta } from "@/shared/seo/page-meta";
import { Icon } from "@/shared/ui/icons";


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

/**
 * 전용 주소는 hello@eatripin.com 이지만, apex MX 가 비어 있어 지금은
 * 도착하지 않는다. mailto 를 내밀면 창구가 있는 척이 된다 — 그게 없는 것보다 나쁘다.
 * 가비아에서 포워딩(MX) 을 걸면 이 함수와 아래 접수 문구를 같이 되돌린다.
 */
function contactEmail(): string {
  let host = "eatripin.com";
  try {
    const parsed = new URL(publicEnv.siteUrl);
    if (parsed.hostname !== "localhost") host = parsed.hostname;
  } catch {
    // publicEnv.siteUrl 파싱 실패 시 기본값 유지
  }
  return `hello@${host}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "ko" ? "삭제 요청" : "Report an issue";
  const description =
    locale === "ko"
      ? "장소 정보 오류 신고, 삭제·수정 요청 접수 절차."
      : "How to report incorrect information or request removal.";
  return publicMeta({ locale, title, description, bare: "/takedown" });
}

export default async function TakedownPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const title = locale === "ko" ? "삭제 요청" : "Report an issue";
  const email = contactEmail();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4">
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
              <h2 style={h2}>무엇을 요청할 수 있나요</h2>
              <p style={body}>
                장소 정보가 사실과 다르거나, 엉뚱한 지점으로 표시되었거나, 삭제를 원하시는 경우
                접수해 주세요. 크리에이터 본인이시라면 채널 전체를 즉시 비공개로 전환해 드릴 수도
                있습니다.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>접수 방법</h2>
              <p style={body}>
                전용 메일함({email})은 아직 수신이 연결되지 않았습니다. 지금 그 주소로 보내시면
                도착하지 않습니다. 창구를 연결하는 대로 이 페이지에 주소를 올리겠습니다.
              </p>
              <p style={body}>
                그때 보내주실 내용은 세 가지입니다 — 해당 채널 또는 장소의 URL, 요청 사유,
                회신받을 연락처.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>처리 절차</h2>
              <ul className="flex flex-col gap-2.5">
                {[
                  "접수 — 메일을 받으면 신청 내용을 확인합니다.",
                  "조치 — 지체 없이 해당 정보를 비공개로 전환하거나 수정합니다. 판단이 바로 서지 않는 경우에도 우선 비공개로 돌린 뒤 검토합니다.",
                  "통지 — 신청하신 분과 게시된 정보의 대상(크리에이터·채널) 양쪽 모두에게 처리 결과를 알려드립니다.",
                  "결론 — 임시로 비공개 처리한 경우, 30일 안에 복원하거나 영구 삭제할지 결론을 냅니다.",
                ].map((line, i) => (
                  <li key={line} className="flex gap-2.5" style={body}>
                    <span className="tnum shrink-0" style={{ color: "var(--wax)" }}>
                      {i + 1}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>콘텐츠 정책</h2>
              <p style={body}>
                어떤 정보를 어떻게 다루는지는{" "}
                <Link
                  href={localePath("/policy", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  콘텐츠 정책
                </Link>
                에 정리되어 있습니다.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 style={h2}>What you can request</h2>
              <p style={body}>
                Let us know if a place is factually wrong, mapped to the wrong branch, or if
                you&rsquo;d like it removed. If you&rsquo;re the creator, we can also take an entire
                channel down immediately at your request.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>How to submit</h2>
              <p style={body}>
                The dedicated mailbox ({email}) is not receiving mail yet. Messages sent there
                now will not arrive. We&rsquo;ll put a working address on this page as soon as
                it&rsquo;s connected.
              </p>
              <p style={body}>
                When it is, please include three things: the channel or place URL, the reason
                for your request, and a contact for a reply.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>What happens next</h2>
              <ul className="flex flex-col gap-2.5">
                {[
                  "Received — we log the request as soon as it arrives.",
                  "Action — the item is unpublished or corrected without delay. If it isn't immediately clear-cut, we still unpublish first and review after.",
                  "Notice — both you and the party the content is about (the creator/channel) are notified of the outcome.",
                  "Resolution — if something was temporarily unpublished, we decide within 30 days whether to restore it or remove it permanently.",
                ].map((line, i) => (
                  <li key={line} className="flex gap-2.5" style={body}>
                    <span className="tnum shrink-0" style={{ color: "var(--wax)" }}>
                      {i + 1}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 style={h2}>Content policy</h2>
              <p style={body}>
                See our{" "}
                <Link
                  href={localePath("/policy", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  content policy
                </Link>{" "}
                for how information is handled.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
