"use client";

/**
 * 구독한 채널 — 시안 C 의 행.
 *
 * 채널 하나가 행 하나다. 이름을 누르면 채널로, 오른쪽 칩으로 해제.
 * useSaved 로 라이브 필터 — 해제한 행은 새로고침 없이 빠진다.
 */

import Link from "next/link";
import type { SubscribedCreator } from "@/shared/api/account-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useSaved } from "@/shared/ui/SavedContext";
import { Avatar } from "@/shared/ui/frame";
import { LinkRow, RowItem, RowList, RowSection, rowShellClass } from "./rows";

export function SubscriptionRows({
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
      <RowSection label={m.account.subsHeading}>
        <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>{m.account.subsEmptyHint}</p>
        <RowList>
          <LinkRow href={channelsHref} label={m.account.subsEmptyCta} />
        </RowList>
      </RowSection>
    );
  }

  return (
    <RowSection label={m.account.subsHeading}>
      <RowList>
        {rows.map((c) => (
          <RowItem key={c.id}>
            <div className={rowShellClass}>
              <Link
                href={href(`/c/${c.slug}`)}
                className="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity active:opacity-70"
              >
                <Avatar
                  initials={c.initials}
                  accent={c.accent}
                  src={c.avatarUrl}
                  size={30}
                  alt=""
                />
                <span className="min-w-0 flex-1 truncate" style={{ fontSize: "var(--t-body)", fontWeight: 600 }}>
                  {c.displayName}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void toggleSubscribed(c.id)}
                aria-label={t(m.account.unsubscribeAria, { name: c.displayName })}
                className="inline-flex h-8 shrink-0 cursor-pointer items-center px-2.5 transition-transform active:scale-95"
                style={{
                  borderRadius: "var(--r-round)",
                  fontSize: "var(--t-meta)",
                  fontWeight: 700,
                  background: "var(--hover)",
                  color: "var(--dim)",
                }}
              >
                {m.saved.subscribed}
              </button>
            </div>
          </RowItem>
        ))}
        <LinkRow href={channelsHref} label={m.account.subsEmptyCta} />
      </RowList>
    </RowSection>
  );
}
