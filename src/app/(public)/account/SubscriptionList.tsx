"use client";

/**
 * 구독한 채널 목록.
 *
 * 구독 자체는 `0009_accounts.sql` 의 `subscriptions` 와 `SubscribeButton` 으로
 * 예전부터 됐다. 없던 것은 **모아 볼 화면**이다 — 구독해 놓고 어디서 확인하는지
 * 알 수 없었으니 기능이 있어도 없는 것과 같았다.
 *
 * 문법은 `/channels` 인덱스와 같다(큰 원형 프로필 + 이름 + 핸들). 두 화면이
 * 답하는 질문이 "누구를 따라갈까 / 누구를 따라가고 있나" 로 나란해서다.
 *
 * 목록은 서버가 준 것으로 그리되, 구독 해제는 `SavedContext` 를 통과한다 —
 * 낙관적 갱신이 거기 있고, 같은 채널의 하트가 다른 화면에도 떠 있을 수 있다.
 */

import Link from "next/link";
import type { SubscribedCreator } from "@/shared/api/account-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useSaved } from "@/shared/ui/SavedContext";
import { Avatar } from "@/shared/ui/frame";
import { Icon } from "@/shared/ui/icons";

export function SubscriptionList({
  creators,
  channelsHref,
}: {
  creators: SubscribedCreator[];
  channelsHref: string;
}) {
  const { messages: m, t, href } = useLocale();
  const { isSubscribed, toggleSubscribed, ready } = useSaved();

  /* 서버 목록이 기준이고, 컨텍스트는 **해제된 것을 빼는 데만** 쓴다.
     컨텍스트에는 채널 이름·아바타가 없어서 그걸로 목록을 만들 수는 없다.
     ready 전에는 컨텍스트가 비어 있으므로 거르지 않는다 — 안 그러면
     목록이 한 번 통째로 사라졌다가 돌아온다. */
  const rows = ready ? creators.filter((c) => isSubscribed(c.id)) : creators;

  const heading = (
    <div className="flex items-baseline justify-between gap-3">
      <h2 style={{ fontSize: "var(--t-title)", fontWeight: 800 }}>{m.account.subsHeading}</h2>
      {rows.length > 0 ? (
        <span className="tnum" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
          {t(m.account.subsCount, { n: rows.length })}
        </span>
      ) : null}
    </div>
  );

  if (rows.length === 0) {
    return (
      <section className="flex flex-col gap-2.5">
        {heading}
        <div className="flex flex-col items-start gap-3 py-6">
          <p style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>{m.account.subsEmpty}</p>
          <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>{m.account.subsEmptyHint}</p>
          <Link
            href={channelsHref}
            className="mt-1 inline-flex h-10 items-center gap-1.5 px-4 font-bold"
            style={{
              fontSize: "var(--t-body)",
              borderRadius: "var(--r-frame)",
              background: "var(--paper)",
              color: "var(--sheet)",
            }}
          >
            <Icon.channel className="size-4" />
            {m.account.subsEmptyCta}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2.5">
      {heading}
      <ul className="flex flex-col gap-2">
        {rows.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-3 py-2.5 pr-2.5 pl-3"
            style={{
              borderRadius: "var(--r-control)",
              boxShadow: "inset 0 0 0 1px var(--hairline)",
            }}
          >
            <Link
              href={href(`/c/${c.slug}`)}
              className="flex min-w-0 flex-1 items-center gap-3 transition-opacity active:opacity-70"
            >
              <Avatar
                initials={c.initials}
                accent={c.accent}
                src={c.avatarUrl}
                size={38}
                alt={c.displayName}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate" style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>
                  {c.displayName}
                </span>
                {c.handle ? (
                  <span
                    className="truncate"
                    style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                  >
                    {c.handle}
                  </span>
                ) : null}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => void toggleSubscribed(c.id)}
              aria-label={t(m.account.unsubscribeAria, { name: c.displayName })}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center px-3.5 transition-transform active:scale-95"
              style={{
                borderRadius: "var(--r-frame)",
                fontSize: "var(--t-meta)",
                fontWeight: 700,
                background: "var(--hover)",
                color: "var(--dim)",
              }}
            >
              {m.saved.subscribed}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
