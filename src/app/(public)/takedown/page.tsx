import type { Metadata } from "next";
import Link from "next/link";
import { publicEnv } from "@/shared/config/env";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { getLocale, localePath } from "@/shared/i18n/locale";
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

/** siteUrl 이 아직 로컬(localhost)이면 브랜드 도메인으로 대체 — 실제 배포 도메인이 정해지면 자연히 그 값을 쓴다. */
function contactEmail(): string {
  let host = "greatripin.app";
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
  return {
    title,
    description,
    alternates: {
      canonical: localePath("/takedown", locale),
      languages: { ko: "/takedown", en: "/en/takedown" },
    },
  };
}

export default async function TakedownPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const title = locale === "ko" ? "삭제 요청" : "Report an issue";
  const email = contactEmail();
  const subject =
    locale === "ko" ? "[삭제 요청] 채널/장소:" : "[Removal request] Channel/place:";
  const bodyTemplate =
    locale === "ko"
      ? "해당 채널 또는 장소 URL:\n사유:\n연락처(회신용):"
      : "Channel or place URL:\nReason:\nContact (for reply):";
  const mailtoHref = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyTemplate)}`;

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
                아래 메일로 다음 세 가지를 적어 보내주세요 — 해당 채널 또는 장소의 URL, 요청 사유,
                회신받을 연락처. 버튼을 누르면 양식이 채워진 메일이 열립니다.
              </p>
              <a
                href={mailtoHref}
                className="inline-flex w-fit items-center gap-2 px-4 py-2.5 transition-colors"
                style={{
                  fontSize: "var(--t-body)",
                  fontWeight: 500,
                  color: "var(--paper)",
                  borderRadius: "var(--r-control)",
                  boxShadow: "inset 0 0 0 1px var(--wax)",
                }}
              >
                <Icon.out className="size-4 shrink-0" style={{ color: "var(--wax)" }} />
                {email}
              </a>
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
                Email us with three things: the channel or place URL, the reason for your request,
                and a contact for a reply. The button below opens a pre-filled email.
              </p>
              <a
                href={mailtoHref}
                className="inline-flex w-fit items-center gap-2 px-4 py-2.5 transition-colors"
                style={{
                  fontSize: "var(--t-body)",
                  fontWeight: 500,
                  color: "var(--paper)",
                  borderRadius: "var(--r-control)",
                  boxShadow: "inset 0 0 0 1px var(--wax)",
                }}
              >
                <Icon.out className="size-4 shrink-0" style={{ color: "var(--wax)" }} />
                {email}
              </a>
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
