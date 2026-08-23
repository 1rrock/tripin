import type { Metadata } from "next";
import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import { publicMeta } from "@/shared/seo/page-meta";
import { Icon } from "@/shared/ui/icons";
import { ApplyForm } from "./ApplyForm";

/**
 * 채널 등록 신청 — 크리에이터가 들어오는 문.
 *
 * 신청만 받고 셀프 퍼블리시는 없다. 등록은 운영자가 기존 인제스트 파이프라인과
 * 어드민 확정 큐로 처리한다("유저 참여는 폼이지 게시판이 아니다" — ROADMAP).
 * 그래서 이 화면의 약속도 "검토 후 순차 등록"까지다 — 받아놓고 처리가 밀리면
 * 신뢰를 잃으므로, 즉시 등록을 약속하지 않는다.
 *
 * 카피는 전부 `messages/{ko,en}.ts` 의 `apply` 네임스페이스다. 예전엔 이 파일이
 * 인라인 사전 + `ko ? … : …` 삼항으로 문구를 들고 있어, /about·/policy 와 달리
 * 이 화면만 사전 밖에 있었다.
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
  const m = getDictionary(locale);
  return publicMeta({
    locale,
    title: m.apply.title,
    description: m.apply.metaDescription,
    bare: "/apply",
  });
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang: locale } = await params;
  const m = getDictionary(locale);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4">
      <header className="flex flex-col gap-3 pb-1">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href={localePath("/", locale)} className="underline-offset-4 hover:underline">
            {m.common.home}
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{m.apply.title}</span>
        </nav>
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {m.apply.title}
        </h1>
      </header>

      <div className="flex max-w-[64ch] flex-col gap-(--block)">
        <section className="flex flex-col gap-3">
          <p style={body}>{m.apply.intro}</p>
        </section>

        <ApplyForm />

        <section className="flex flex-col gap-3">
          <h2 style={h2}>{m.apply.stepsHeading}</h2>
          <ul className="flex flex-col gap-2.5">
            {m.apply.steps.map((line, i) => (
              <li key={line} className="flex gap-2.5" style={body}>
                {/* 순번은 자릿수지 강조가 아니다 — 산호는 주 CTA(신청하기)에만 남긴다 */}
                <span className="tnum shrink-0" style={{ color: "var(--dim)" }}>
                  {i + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p style={{ ...body, fontSize: "var(--t-meta)" }}>
            {m.apply.takedownBefore}
            <Link
              href={localePath("/takedown", locale)}
              className="underline underline-offset-4"
              style={{ color: "var(--paper)" }}
            >
              {m.apply.takedownLink}
            </Link>
            {m.apply.takedownAfter}
          </p>
        </section>
      </div>
    </main>
  );
}
