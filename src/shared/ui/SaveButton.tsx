"use client";

/**
 * 하트(저장) · 체크(갔던 곳).
 *
 * 로그인 UI 를 절대 띄우지 않는다. 누르면 그냥 저장된다 —
 * 익명 세션은 `ensureSession()` 이 뒤에서 만든다(PRODUCT.md 원칙 5 "게이트는 없다").
 *
 * 하이드레이션 주의: 서버에는 유저의 저장 상태가 없다. 그래서 첫 렌더는 항상 "안 켜짐"
 * 이고, 컨텍스트가 다 읽은 뒤(`ready`) 켜진다. 그 사이 전환이 튀지 않게 색만 바뀐다.
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
}: {
  placeId: string;
  placeName: string;
  className?: string;
}) {
  const { messages: m, t } = useLocale();
  const { isSaved, toggleSaved } = useSaved();
  const on = isSaved(placeId);

  return (
    <button
      type="button"
      onClick={(e) => {
        /* 행·카드 전체가 클릭 대상인 자리에 들어가므로 부모 핸들러를 막는다.
           안 막으면 하트를 누를 때 장소 상세가 같이 열린다. */
        e.stopPropagation();
        e.preventDefault();
        void toggleSaved(placeId);
      }}
      aria-pressed={on}
      aria-label={t(on ? m.saved.removeAria : m.saved.addAria, { name: placeName })}
      className={`grid size-9 shrink-0 cursor-pointer place-items-center transition-transform active:scale-90 ${className}`}
      style={{
        borderRadius: "var(--r-frame)",
        boxShadow: "inset 0 0 0 1px var(--hairline)",
        color: on ? "var(--wax)" : "var(--dim)",
      }}
    >
      <Icon.heart className="size-[18px]" weight={on ? "fill" : "regular"} />
    </button>
  );
}

/**
 * 그룹 담기 — 하트 옆에 선다.
 *
 * 하트와 따로 두는 이유: 하트는 한 손가락으로 끝나야 한다. 그룹 고르기를
 * 하트에 묶으면 "그냥 저장" 이 두 단계가 된다. 대충 담아두는 사람이 대부분이고,
 * 정리하는 사람만 이 버튼을 누른다.
 */
export function ListButton({
  placeId,
  placeName,
  className = "",
}: {
  placeId: string;
  placeName: string;
  className?: string;
}) {
  const { messages: m, t } = useLocale();
  const { listsOf } = useSaved();
  const [open, setOpen] = useState(false);
  const count = listsOf(placeId).size;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        aria-label={t(m.saved.listAddAria, { name: placeName })}
        aria-haspopup="dialog"
        className={`grid size-9 shrink-0 cursor-pointer place-items-center transition-transform active:scale-90 ${className}`}
        style={{
          borderRadius: "var(--r-frame)",
          boxShadow: "inset 0 0 0 1px var(--hairline)",
          color: count > 0 ? "var(--paper)" : "var(--dim)",
        }}
      >
        {/* 담긴 그룹이 있으면 개수를, 없으면 아이콘을 보인다 —
            "이미 어디 담겨 있나" 가 한눈에 보이는 게 아이콘보다 쓸모 있다 */}
        {count > 0 ? (
          <span className="tnum" style={{ fontSize: "var(--t-meta)", fontWeight: 800 }}>
            {count}
          </span>
        ) : (
          <Icon.menu className="size-[18px]" />
        )}
      </button>

      {open ? (
        <ListPicker placeId={placeId} placeName={placeName} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

/** '갔던 곳' 체크 — 저장 목록 안에서만 쓴다. */
export function VisitedButton({
  placeId,
  placeName,
  className = "",
}: {
  placeId: string;
  placeName: string;
  className?: string;
}) {
  const { messages: m, t } = useLocale();
  const { isVisited, toggleVisited } = useSaved();
  const on = isVisited(placeId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void toggleVisited(placeId);
      }}
      aria-pressed={on}
      aria-label={t(on ? m.saved.unvisitAria : m.saved.visitAria, { name: placeName })}
      className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 px-3 transition-transform active:scale-95 ${className}`}
      style={{
        borderRadius: "var(--r-frame)",
        fontSize: "var(--t-meta)",
        fontWeight: 600,
        boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)",
        background: on ? "var(--paper)" : "transparent",
        color: on ? "var(--sheet)" : "var(--dim)",
      }}
    >
      <Icon.check className="size-4" weight={on ? "bold" : "regular"} />
      {on ? m.saved.visited : m.saved.markVisited}
    </button>
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
