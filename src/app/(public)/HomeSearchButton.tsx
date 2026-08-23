"use client";

import { MagnifyingGlassIcon as MagnifyingGlass } from "@phosphor-icons/react";

function openSearch() {
  window.dispatchEvent(new Event("tripin:open-search"));
}

/** 히어로 검색 알약 — 클릭만 클라이언트. 나머지 홈은 서버가 그린다. */
export function HomeSearchButton({
  mobile,
  desktop,
}: {
  mobile: string;
  desktop: string;
}) {
  return (
    <button
      type="button"
      id="home-hero-search"
      onClick={openSearch}
      className="mt-5 flex h-[52px] w-full items-center gap-2.5 rounded-full bg-white pr-2 pl-4 text-left lg:mt-7 lg:h-14 lg:pr-2 lg:pl-5"
      /* globals.css 의 "카드에 그림자를 얹지 않는다"에 대한 **명시적 예외**다.
         이건 카드가 아니라 히어로 사진 위에 실제로 떠 있는 컨트롤이라, 그림자가
         장식이 아니라 "이건 지면이 아니라 물건"이라는 사실을 말한다.
         값은 손으로 적지 않고 `--lift` 토큰을 쓴다 — 뜬 것은 전부 같은 높이로 뜬다. */
      style={{ boxShadow: "var(--lift), 0 0 0 1px var(--hairline)" }}
    >
      <MagnifyingGlass aria-hidden className="size-[17px] shrink-0 text-(--dim) lg:size-[19px]" />
      <span className="min-w-0 flex-1 truncate text-[15px] text-(--dim) lg:text-base">
        <span className="lg:hidden">{mobile}</span>
        <span className="hidden lg:inline">{desktop}</span>
      </span>
      <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-(--wax) text-white lg:size-[42px]">
        <MagnifyingGlass className="size-4 lg:size-[18px]" weight="bold" />
      </span>
    </button>
  );
}
