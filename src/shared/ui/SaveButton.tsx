"use client";

/**
 * 하트(저장) · 그룹 담기 · 채널 구독.
 *
 * 로그인 UI 를 절대 띄우지 않는다. 누르면 그냥 저장된다 —
 * 익명 세션은 `ensureSession()` 이 뒤에서 만든다(PRODUCT.md 원칙 5 "게이트는 없다").
 *
 * 하트는 **리스트 시트**를 연다(네이버 지도). 미저장이면 먼저 저장한 뒤 연다.
 * 저장 해제는 시트 안의 "저장 해제"로. `⋯` 메뉴는 두지 않는다.
 */

import { useState } from "react";
import { track } from "@vercel/analytics";
import { Chip } from "@/shared/ui/frame";
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
          if (on) {
            setPicking(true);
            return;
          }
          /* 저장 발생 세션 비율이 1단계의 관측 지표다(ROADMAP). 해제는 안 센다.
             Hobby 플랜은 커스텀 이벤트를 대시보드에 안 보여 준다 — OutboundA 와 같은 이유로
             호출은 플랜과 무관하게 둔다. */
          track("save");
          void toggleSaved(placeId).then(() => setPicking(true));
        }}
        aria-pressed={on}
        aria-label={t(on ? m.saved.listAddAria : m.saved.addAria, { name: placeName })}
        className={`grid size-9 shrink-0 cursor-pointer place-items-center transition-transform active:scale-90 ${className}`}
        style={{
          borderRadius: bare ? undefined : "999px",
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

/**
 * 채널 구독 토글.
 *
 * 예전에는 이것만 `r-frame`(둥근 사각)이라, 알약들 사이에서 혼자 다른 몸을
 * 하고 있었다. 지금은 봉인된 `Chip`(size="md", tone="quiet") 이다 —
 * quiet 인 이유: 켜진 상태("구독중")는 이미 끝난 일이라 잉크로 타오르면
 * 목록에서 읽을 순서가 뒤집힌다. 켜지면 회색으로 물러난다.
 */
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
    <Chip
      size="md"
      tone="quiet"
      active={on}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void toggleSubscribed(creatorId);
      }}
      ariaLabel={t(on ? m.saved.unsubscribeAria : m.saved.subscribeAria, {
        name: creatorName,
      })}
      className={className}
    >
      {on ? m.saved.subscribed : m.saved.subscribe}
    </Chip>
  );
}
