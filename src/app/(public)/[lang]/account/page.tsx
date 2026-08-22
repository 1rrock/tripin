import type { Metadata } from "next";
import { loadAccount } from "@/shared/api/account-server";
import type { Locale } from "@/shared/i18n/config";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/locale";
import { LinkRow, RowList, RowSection } from "./rows";
import { SessionRows } from "./SessionRows";
import { SubscriptionRows } from "./SubscriptionRows";

/**
 * 마이페이지 — 시안 C. **설정 줄.**
 *
 * 화면 전체가 iOS 설정 문법의 헤어라인 행이다:
 *   저장   저장한 곳 · 그룹
 *   구독   채널 행들 (해제는 행 안의 칩)
 *   계정   이메일 · 로그아웃 · 탈퇴 (익명이면 LoginPanel)
 *
 * 컷·썸네일은 여기 없다 — 얼굴은 /saved 와 /map 이 맡는다.
 * 약관 링크는 푸터가 맡는다. 게이트는 없다.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  return { title: m.account.title, robots: { index: false, follow: false } };
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang: locale } = await params;
  const m = getDictionary(locale);
  const view = await loadAccount();

  const raw = (await searchParams).auth_error;
  const authError = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-(--gutter) pt-4 pb-(--block) lg:max-w-3xl lg:gap-9 lg:pt-10">
      {/* 모바일에서는 제목을 헤더가 든다(HeaderLead) — 여기서는 sr-only.
          화면에 h1 이 하나도 없으면 스크린리더가 이 화면을 못 부른다.
          lg 부터는 그 헤더가 통째로 숨으므로(layout.tsx) 제목이 여기 선다.
          라벨 단과 같은 왼쪽 선에 맞춰 서서 화면이 한 축으로 읽힌다(RowSection). */}
      <h1
        className="sr-only lg:not-sr-only"
        style={{ fontSize: "var(--t-display)", fontWeight: 700, letterSpacing: "-0.02em" }}
      >
        {m.account.title}
      </h1>

      <RowSection label={m.account.savedHeading}>
        <RowList>
          <LinkRow
            href={localePath("/map?saved=1", locale)}
            label={m.account.savedPlaces}
            value={t(m.account.countPlaces, { n: view.savedCount })}
          />
          <LinkRow
            href={localePath("/saved", locale)}
            label={m.account.savedLists}
            value={t(m.account.countLists, { n: view.listCount })}
          />
        </RowList>
      </RowSection>

      <SubscriptionRows creators={view.creators} channelsHref={localePath("/channels", locale)} />

      <SessionRows
        linked={view.linked}
        email={view.email}
        savedCount={view.savedCount}
        authError={authError}
      />
    </main>
  );
}
