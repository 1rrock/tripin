import type { Metadata } from "next";
import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import { publicMeta } from "@/shared/seo/page-meta";
import { Icon } from "@/shared/ui/icons";
import { ApplyForm, type ApplyFormCopy } from "./ApplyForm";

/**
 * 채널 등록 신청 — 크리에이터가 들어오는 문.
 *
 * 신청만 받고 셀프 퍼블리시는 없다. 등록은 운영자가 기존 인제스트 파이프라인과
 * 어드민 확정 큐로 처리한다("유저 참여는 폼이지 게시판이 아니다" — ROADMAP).
 * 그래서 이 화면의 약속도 "검토 후 순차 등록"까지다 — 받아놓고 처리가 밀리면
 * 신뢰를 잃으므로, 즉시 등록을 약속하지 않는다.
 */

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang: locale } = await params;
  const title = locale === "ko" ? "채널 등록 신청" : "Add your channel";
  const description =
    locale === "ko"
      ? "여행 유튜브 채널의 영상 속 장소를 지도로 정리해 드립니다. 채널 주소만 남기면 검토 후 순차 등록됩니다."
      : "We map the places in your travel videos. Leave your channel URL and we'll review and add it.";
  return publicMeta({ locale, title, description, bare: "/apply" });
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  const ko = locale === "ko";
  const title = ko ? "채널 등록 신청" : "Add your channel";

  const copy: ApplyFormCopy = ko
    ? {
        channelLabel: "유튜브 채널 주소",
        channelPlaceholder: "https://www.youtube.com/@channel",
        emailLabel: "회신받을 이메일",
        emailPlaceholder: "you@example.com",
        videosLabel: "대표 영상 링크 (선택, 2~3개)",
        videosPlaceholder: "장소가 나오는 영상이면 검토가 빨라져요",
        noteLabel: "하고 싶은 말 (선택)",
        submit: "신청하기",
        submitting: "보내는 중…",
        doneTitle: "신청을 받았어요.",
        doneBody:
          "검토 후 순차적으로 등록하고 있어요. 등록되거나 어려운 경우 남겨주신 이메일로 알려드릴게요.",
        errorInvalid: "유튜브 채널 주소와 이메일을 확인해 주세요.",
        errorFailed: "잠시 후 다시 시도해 주세요.",
      }
    : {
        channelLabel: "YouTube channel URL",
        channelPlaceholder: "https://www.youtube.com/@channel",
        emailLabel: "Email for replies",
        emailPlaceholder: "you@example.com",
        videosLabel: "Sample video links (optional, 2–3)",
        videosPlaceholder: "Videos that feature places speed up the review",
        noteLabel: "Anything else (optional)",
        submit: "Submit",
        submitting: "Sending…",
        doneTitle: "Application received.",
        doneBody:
          "We review and add channels in order. We'll email you when it's live — or if we can't add it.",
        errorInvalid: "Please check the YouTube channel URL and email.",
        errorFailed: "Something went wrong. Please try again shortly.",
      };

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
        <section className="flex flex-col gap-3">
          <p style={body}>
            {ko
              ? "여행 영상 속 장소들을 상호명·타임스탬프·지도 링크로 정리해, 도시·장소 검색으로 영상이 계속 발견되게 합니다. 채널 주소만 남겨주시면 영상 설명란을 바탕으로 저희가 직접 정리해 등록합니다."
              : "We turn the places in your travel videos into a map — verified names, timestamps, and map links — so your videos keep getting discovered through city and place searches. Just leave your channel URL and we'll do the rest from your video descriptions."}
          </p>
        </section>

        <ApplyForm copy={copy} />

        <section className="flex flex-col gap-3">
          <h2 style={h2}>{ko ? "등록 절차" : "How it works"}</h2>
          <ul className="flex flex-col gap-2.5">
            {(ko
              ? [
                  "접수 — 채널과 영상을 확인합니다. 장소가 나오는 여행 콘텐츠인지가 기준입니다.",
                  "정리 — 영상 설명란을 바탕으로 장소를 추출하고, 상호·주소·지도 링크를 하나하나 확인합니다.",
                  "등록 — 확인이 끝난 장소만 공개됩니다. 등록되면 이메일로 알려드립니다.",
                ]
              : [
                  "Review — we check that the channel is travel content that features places.",
                  "Mapping — we extract places from video descriptions and verify each name, address, and map link.",
                  "Live — only verified places are published. We'll email you when it's up.",
                ]
            ).map((line, i) => (
              <li key={line} className="flex gap-2.5" style={body}>
                <span className="tnum shrink-0" style={{ color: "var(--wax)" }}>
                  {i + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p style={{ ...body, fontSize: "var(--t-meta)" }}>
            {ko ? (
              <>
                등록 후 언제든{" "}
                <Link
                  href={localePath("/takedown", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  삭제 요청
                </Link>
                으로 채널 전체를 내릴 수 있습니다.
              </>
            ) : (
              <>
                You can take your channel down at any time via{" "}
                <Link
                  href={localePath("/takedown", locale)}
                  className="underline underline-offset-4"
                  style={{ color: "var(--paper)" }}
                >
                  removal request
                </Link>
                .
              </>
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
