"use client";

/**
 * 하트(저장) · 그룹 담기 · 채널 구독.
 *
 * 로그인 UI 를 절대 띄우지 않는다. 누르면 그냥 저장된다 —
 * 익명 세션은 `ensureSession()` 이 뒤에서 만든다(PRODUCT.md 원칙 5 "게이트는 없다").
 *
 * 하트는 한 번에 저장된다. **켠 직후** 그룹 시트를 연다 — 지도에서 담는 사람이
 * "어디 묶지" 를 그 자리에서 고르게. 끄면 시트를 열지 않고 분류도 같이 지운다.
 *
 * 이미 저장된 곳의 그룹 이동은 행의 `⋯`(`PlaceMenu`)가 맡는다.
 */

import { useState } from "react";
import { Icon } from "@/shared/ui/icons";
import { ListPicker } from "@/shared/ui/ListPicker";
import { useSaved } from "@/shared/ui/SavedContext";
import { useLocale } from "@/shared/i18n/LocaleContext";

/** 하트 하나 — 지도 시트·목록 행 어디에나 들어간다. */
export function SaveButton({
  placeId,
  placeName,
  className = "",
  bare = false,
}: {
  placeId: string;
  placeName: string;
  className?: string;
  /** 행 끝 아이콘 무리 — 상자 없이 하트만 */
  bare?: boolean;
}) {
  const { messages: m, t } = useLocale();
  const { isSaved, toggleSaved } = useSaved();
  const [picking, setPicking] = useState(false);
  const on = isSaved(placeId);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          /* 행·카드 전체가 클릭 대상인 자리에 들어가므로 부모 핸들러를 막는다.
             안 막으면 하트를 누를 때 장소 상세가 같이 열린다. */
          e.stopPropagation();
          e.preventDefault();
          const wasSaved = on;
          void toggleSaved(placeId).then(() => {
            if (!wasSaved) setPicking(true);
          });
        }}
        aria-pressed={on}
        aria-label={t(on ? m.saved.removeAria : m.saved.addAria, { name: placeName })}
        className={`grid size-9 shrink-0 cursor-pointer place-items-center transition-transform active:scale-90 ${className}`}
        style={{
          borderRadius: "var(--r-frame)",
          boxShadow: bare ? "none" : "inset 0 0 0 1px var(--hairline)",
          color: on ? "var(--wax)" : "var(--dim)",
        }}
      >
        <Icon.heart className="size-[18px]" weight={on ? "fill" : "regular"} />
      </button>

      {picking ? (
        <ListPicker placeId={placeId} placeName={placeName} onClose={() => setPicking(false)} />
      ) : null}
    </>
  );
}

/** 채널 구독 토글. */
export function SubscribeButton({
  creatorId,
  creatorName,
  className = "",
}: {
  creatorId: string;
  creatorName: string;
  className?: string;
}) {
  const { messages: m, t } = useLocale();
  const { isSubscribed, toggleSubscribed } = useSaved();
  const on = isSubscribed(creatorId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void toggleSubscribed(creatorId);
      }}
      aria-pressed={on}
      aria-label={t(on ? m.saved.unsubscribeAria : m.saved.subscribeAria, {
        name: creatorName,
      })}
      className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 px-3.5 transition-transform active:scale-95 ${className}`}
      style={{
        borderRadius: "var(--r-frame)",
        fontSize: "var(--t-meta)",
        fontWeight: 700,
        boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)",
        background: on ? "var(--hover)" : "transparent",
        color: on ? "var(--dim)" : "var(--paper)",
      }}
    >
      {on ? m.saved.subscribed : m.saved.subscribe}
    </button>
  );
}
