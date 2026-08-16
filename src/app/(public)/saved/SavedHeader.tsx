"use client";

/**
 * 저장 화면의 머리 — **데스크톱에서만 보인다.**
 *
 * 모바일에는 공용 헤더(HeaderLead)가 이미 "저장한 곳" 을 들고 있어서 제목이
 * 두 번 서면 안 된다. 반대로 lg 부터는 그 헤더가 통째로 숨는다(layout.tsx) —
 * 지금까지 데스크톱에는 제목도, 주 행동도 없이 행 목록만 덩그러니 떠 있었다.
 *
 * 그래서 여기서 셋을 세운다: 큰 제목 · 규모 한 줄 · 새 리스트 버튼.
 * 제목은 `saved.nav`("저장")다 — 첫 행이 "저장한 곳" 이라 같은 낱말을 피한다.
 *
 * h1 은 어느 폭에서든 **살아 있다**(모바일은 sr-only). 화면에 h1 이 하나도 없으면
 * 스크린리더가 이 화면을 무엇이라 부를지 알 수 없다.
 */

import { useLocale } from "@/shared/i18n/LocaleContext";
import { NewListButton } from "./NewListButton";

export function SavedHeader({
  /** "32곳 · 그룹 4개". 빈 화면에는 셀 것이 없으니 안 준다. */
  summary,
  /** 빈 화면에서는 끈다 — 그쪽은 "지도 열기" 가 주 행동이고, 잉크 버튼이 둘이면 서로 싸운다. */
  action = true,
}: {
  summary?: string;
  action?: boolean;
}) {
  const { messages: m } = useLocale();

  /* 모바일에서는 이 덩어리가 통째로 접힌다 — sr-only 는 흐름 밖이고 나머지는 hidden
     이라 높이 0. 그래서 아래 목록이 헤더 헤어라인에 그대로 붙는다(layout 주석). */
  return (
    <div className="flex items-end justify-between gap-6 lg:mb-7">
      <div className="min-w-0">
        <h1
          className="sr-only lg:not-sr-only"
          style={{ fontSize: "var(--t-display)", fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          {m.saved.nav}
        </h1>
        {summary ? (
          <p
            className="tnum mt-1.5 hidden lg:block"
            style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}
          >
            {summary}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="hidden shrink-0 lg:block">
          <NewListButton />
        </div>
      ) : null}
    </div>
  );
}
