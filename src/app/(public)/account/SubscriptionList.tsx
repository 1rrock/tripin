"use client";

/**
 * 구독한 채널 — 시안 D 레일.
 *
 * 상자 행이 아니다. 아바타+이름이 가로로 흐른다. 해제는 이름 옆의 작은 칩.
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

  const rows = ready ? creators.filter((c) => isSubscribed(c.id)) : creators;

  if (rows.length === 0) {
    return (
      <section className="flex flex-col gap-2.5">
        <h2 style={{ fontSize: "var(--t-title)", fontWeight: 800 }}>{m.account.subsHeading}</h2>
        <div className="flex flex-col items-start gap-3 py-2">
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
      <h2 style={{ fontSize: "var(--t-title)", fontWeight: 800 }}>{m.account.subsHeading}</h2>
      <ul className="flex gap-4 overflow-x-auto no-scrollbar lg:flex-wrap lg:overflow-visible">
        {rows.map((c) => (
          <li key={c.id} className="flex shrink-0 items-center gap-2">
            <Link
              href={href(`/c/${c.slug}`)}
              className="flex items-center gap-2 transition-opacity active:opacity-70"
            >
              <Avatar
                initials={c.initials}
                accent={c.accent}
                src={c.avatarUrl}
                size={38}
                alt={c.displayName}
              />
              <span className="max-w-[7.5rem] truncate" style={{ fontSize: "var(--t-body)", fontWeight: 700 }}>
                {c.displayName}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void toggleSubscribed(c.id)}
              aria-label={t(m.account.unsubscribeAria, { name: c.displayName })}
              className="inline-flex h-8 shrink-0 cursor-pointer items-center px-2.5 transition-transform active:scale-95"
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
