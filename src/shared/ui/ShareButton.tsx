"use client";

/**
 * 공유 버튼 — 방문자가 배포자가 되는 유일한 통로.
 *
 * 모바일은 `navigator.share` 가 카카오톡을 포함한 시스템 공유 시트를 띄우므로
 * 카카오 SDK 없이도 같은 효과다. 데스크톱(share 미지원)은 클립보드 복사로
 * 물러나고, 버튼 안에서 체크로 2초 답한다 — 토스트를 따로 띄울 만큼 큰 일이
 * 아니다. URL 은 지금 보고 있는 주소 그대로다(로케일 경로 포함).
 */

import { useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { Icon } from "@/shared/ui/icons";
import { useLocale } from "@/shared/i18n/LocaleContext";

export function ShareButton({
  title,
  className = "",
  bare = false,
}: {
  /** 공유 시트 제목 — 상호명 */
  title: string;
  className?: string;
  /** 행 끝 아이콘 무리 — 상자 없이 아이콘만(SaveButton 과 같은 문법) */
  bare?: boolean;
}) {
  const { messages: m, t } = useLocale();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
          } catch {
            return; // 시트를 닫은 것 — 실패도 공유도 아니다
          }
        } else {
          try {
            await navigator.clipboard.writeText(url);
          } catch {
            return;
          }
          setCopied(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 2000);
        }
        /* Hobby 플랜은 커스텀 이벤트를 대시보드에 안 보여 준다(Pro 필요).
           호출은 플랜과 무관하게 둔다 — OutboundA 와 같은 이유. */
        track("share");
      }}
      aria-label={copied ? m.common.linkCopied : t(m.common.shareAria, { name: title })}
      className={`grid size-9 shrink-0 cursor-pointer place-items-center transition-transform active:scale-90 ${className}`}
      style={{
        borderRadius: bare ? undefined : "999px",
        boxShadow: bare ? "none" : "inset 0 0 0 1px var(--hairline)",
        color: copied ? "var(--wax)" : "var(--dim)",
      }}
    >
      {copied ? (
        <Icon.check className="size-[18px]" />
      ) : (
        <Icon.share className="size-[18px]" />
      )}
      {/* 복사 완료를 보조기기에도 알린다 — aria-label 교체만으론 재낭독이 안 된다 */}
      <span aria-live="polite" className="sr-only">
        {copied ? m.common.linkCopied : ""}
      </span>
    </button>
  );
}
