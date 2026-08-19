/**
 * 캔버스(지도 + 패널) 화면의 뼈대 — `/map`, `/city/[city]`, `/c/[creator]`.
 *
 * 이 세 화면은 `.canvas-page` 한 벌을 공유하는데, 그 CSS 가 브레이크포인트에서
 * 레이아웃을 **통째로 갈아끼운다**(globals.css):
 *   모바일 /map — 지도 전면 + 목록 바텀시트(`--map-sheet-h`)
 *   ≥1024 — `.canvas-page` 가 `position:fixed inset-0`, 지도가 전면, 패널이 왼쪽 400px 카드
 * 스켈레톤이 이 클래스를 그대로 쓰지 않으면 데스크톱에서 로딩과 본화면이 딴 데 선다.
 * 그래서 새로 짜지 않고 실화면 마크업을 베낀다.
 *
 * 모바일 전용 헤더(`lg:hidden`)도 실화면 그대로 — 데스크톱에서는 패널 안쪽 제목이
 * 대신 서기 때문에 두 벌을 다 들고 있어야 한다.
 */

import {
  Bone,
  BoneAct,
  BoneChip,
  BoneCrumb,
  BoneDot,
  BoneFrame,
  BoneMap,
  BoneRoot,
  times,
} from "./bones";

/** 칩 한 줄 — CityExplorer·CreatorExplorer 의 가로 스크롤 필터 줄 */
function ChipRow({ widths }: { widths: string[] }) {
  return (
    <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
      {widths.map((w, i) => (
        <BoneChip key={i} w={w} />
      ))}
    </div>
  );
}

/** 번호 핀 — `<FrameNo>` 와 같은 size-7 원 */
function BoneNo() {
  return <BoneDot size={28} className="mt-0.5" />;
}

/** 요약 불릿 — `<SummaryBlock className="pl-10">` 의 자리 */
function BoneSummary() {
  return (
    <div className="pl-10">
      <ul
        className="flex flex-col gap-1.5"
        style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}
      >
        {["92%", "68%"].map((w, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden style={{ color: "var(--dim)" }}>
              ·
            </span>
            <span>
              <Bone w={w} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   /map — HomeCanvas (surface="page", lead="home")
   ──────────────────────────────────────────────────────────────── */

/**
 * 검색 알약 — `HomeCanvas` 의 `searchField(floating)` 을 그대로 베낀다.
 * 상자는 진짜로 그리고 아이콘·글자 자리에만 뼈를 넣는다. 상자가 단색·그림자라
 * LCP 후보가 아니고(후보는 url() 배경·<img>·텍스트 블록), 본화면이 오면
 * 알약은 그 자리에 그대로 있고 안쪽만 채워진다.
 *
 * floating = 지도 위(모바일). sheet = 시트 안(데스크톱). 바탕색이 다르다.
 */
function BoneSearchPill({ floating = false }: { floating?: boolean }) {
  return (
    <div className="relative flex h-11 w-full items-center lg:h-10">
      <span
        className="relative flex h-full min-w-0 flex-1 items-center rounded-xl pr-3 pl-9"
        style={{
          background: floating ? "var(--sheet)" : "var(--hover)",
          boxShadow: floating ? "0 4px 16px rgb(0 0 0 / 0.14)" : undefined,
        }}
      >
        {/* 돋보기 자리 — h-4 w-4, left-3 세로 가운데.
            `.bone-ava` 가 position:relative 라 클래스로 absolute 를 덧대면
            특이도가 같아 순서 싸움이 난다. 감싸는 span 에 자리를 준다. */}
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
          <BoneDot size={16} radius="4px" />
        </span>
        <span className="truncate text-base">
          <Bone w="6.5rem" />
        </span>
      </span>
    </div>
  );
}

/** 필터 알약 — `CanvasFilters` 의 `Trigger`. h-9 · rounded-full · px-3.5 · 13px */
function BoneFilterTrigger({ w }: { w: string }) {
  return (
    <span
      className="flex h-9 min-w-0 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold tracking-[-0.02em]"
      style={{ background: "var(--ground)", boxShadow: "inset 0 0 0 1px var(--hairline)" }}
    >
      <span className="truncate">
        <Bone w={w} />
      </span>
      <BoneDot size={14} radius="3px" className="shrink-0" />
    </span>
  );
}

/**
 * 필터 세 개 — 지역 · 카테고리 · 채널. 저장 칩은 저장한 곳이 있어야 서므로 뼈에 없다.
 * 글자 폭은 실화면을 재서 넣었다(칩 68.4 / 90.7 / 68.4px − 알약 고정분 46px).
 */
const FILTER_WIDTHS = ["1.4rem", "2.8rem", "1.4rem"];

/**
 * `/map` 뼈대.
 *
 * 🔴 모바일과 데스크톱이 **다른 자리**에 검색·필터를 세운다. 실화면과 같아야 한다:
 *   모바일 — 지도 위 `.canvas-topbar` (헤더가 없는 화면이라 그 자리를 받는다)
 *   ≥1024  — 왼쪽 400px 패널 안. `.canvas-topbar` 는 `lg:hidden`
 * 예전 뼈는 모바일에서도 검색·필터를 시트 안에 뒀다. 본화면이 오는 순간
 * 검색창이 시트에서 지도 위로 튀어 올라갔다.
 */
export function MapSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot label={label}>
      <div className="canvas-page canvas-root">
        <BoneMap />

        {/* 지도 위 첫 줄 — 모바일 전용. HomeCanvas 의 같은 상자를 그대로 */}
        <div className="canvas-topbar lg:hidden">
          <BoneSearchPill floating />
          <div className="relative pt-2">
            {/* 칩은 접히지 않는다 — 넘치면 옆으로 흐른다(실화면 floating 과 같다) */}
            <div className="no-scrollbar flex gap-2 overflow-x-auto [&>*]:shrink-0">
              {FILTER_WIDTHS.map((w, i) => (
                <BoneFilterTrigger key={i} w={w} />
              ))}
            </div>
          </div>
        </div>

        <div className="canvas-sheet-clip">
          <section className="canvas-panel">
            {/* 손잡이 — 모바일에서 시트 첫 줄을 천장에서 떼어 놓는 h-5.
                데스크톱은 CSS 가 display:none 으로 지우고 여백이 대신 받는다.
                빼면 그 아래 모든 줄이 20px 씩 올라가 앉는다. */}
            <div className="canvas-panel-handle" />

            {/* 실화면과 같은 스크롤 상자 — 데스크톱 padding-top:12px 이 여기 걸린다 */}
            <div className="canvas-panel-scroll">
              {/* 검색·필터는 데스크톱에서만 시트 안에 선다 */}
              <div className="hidden px-4 pt-1 pb-3 lg:block">
                <BoneSearchPill />
              </div>
              <div className="hidden lg:block">
                <div className="relative px-4 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {FILTER_WIDTHS.map((w, i) => (
                      <BoneFilterTrigger key={i} w={w} />
                    ))}
                  </div>
                </div>
              </div>

              {/* 개수 줄 — 오른쪽 "필터 지우기" 는 필터가 있어야 서므로 뼈에 없다 */}
              <div className="flex items-center justify-between gap-3 px-4 pb-2">
                <p className="index tnum">
                  <Bone w="4.5rem" />
                </p>
              </div>

              {/* 결과 카드 — 컷 + 이름 + 종류·도시 */}
              <ul className="px-4 pb-6">
                {times(6).map((i) => (
                  <li key={i} className={i > 0 ? "mt-5" : ""}>
                    {/* 실화면은 `<button>` 이라 li 가 버튼보다 6px 크다 — 버튼은 안쪽
                        baseline 을 내놓지 않아 아래 모서리가 baseline 이 되고, 그 밑으로
                        부모 strut 의 descender 가 붙는다. block div 로 두면 카드마다
                        6px 씩 짧아져 목록 끝에서 36px 어긋난다.
                        `inline-block + overflow-hidden` 이 같은 baseline 을 만든다
                        (버튼을 그대로 쓰면 로딩 중에 포커스 잡히는 빈 버튼이 6개 생긴다) */}
                    <span className="inline-block w-full overflow-hidden text-left">
                      <BoneFrame className="block w-full" />
                      <span className="mt-2.5 block text-[15px] font-semibold tracking-[-0.01em]">
                        <Bone w="60%" />
                      </span>
                      <span className="mt-0.5 block text-[13px]">
                        <Bone w="45%" />
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </BoneRoot>
  );
}

/* ────────────────────────────────────────────────────────────────
   /city/[city] — 모바일 헤더 + CityExplorer
   ──────────────────────────────────────────────────────────────── */

export function CitySkeleton({ label }: { label: string }) {
  return (
    <BoneRoot label={label}>
      {/* 모바일 전용 머리 — 데스크톱은 패널 안 제목이 대신한다 */}
      <header className="flex flex-col gap-3 px-(--gutter) pt-4 pb-1 lg:hidden">
        <BoneCrumb last="4.5rem" />
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          <Bone w="72%" />
        </h1>
        <p className="index tnum">
          <Bone w="8rem" />
        </p>
      </header>

      <div className="canvas-page">
        <BoneMap />

        <section className="canvas-panel">
          {/* 데스크톱 전용 제목 */}
          <div className="hidden px-(--gutter) pt-4 pb-1 lg:block">
            <h1
              className="font-black"
              style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
            >
              <Bone w="55%" />
            </h1>
          </div>

          <div className="flex flex-col gap-3 px-(--gutter) pt-5 pb-4 lg:pt-3">
            <ChipRow widths={["3.5rem", "4rem", "3.5rem", "4.5rem", "3.75rem"]} />
            <ChipRow widths={["4.5rem", "6rem", "5.5rem", "6.5rem"]} />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="index tnum">
                <Bone w="10rem" />
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-(--block) px-(--gutter) pb-10">
            <ol>
              {times(5).map((i) => (
                <li key={i}>
                  <hr className="rule" />
                  <div className="-mx-2.5 flex flex-col gap-3 px-2.5 py-4">
                    <div className="flex w-full items-start gap-3 text-left">
                      <BoneNo />
                      <span className="min-w-0 flex-1">
                        <span
                          className="block font-bold"
                          style={{
                            fontSize: "var(--t-title)",
                            letterSpacing: "-0.025em",
                            lineHeight: 1.3,
                          }}
                        >
                          <Bone w="58%" />
                        </span>
                        <span
                          className="mt-1 block"
                          style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                        >
                          <Bone w="38%" />
                        </span>
                        <span
                          className="mt-0.5 block"
                          style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                        >
                          <Bone w="76%" />
                        </span>
                      </span>
                    </div>

                    <BoneSummary />

                    <div className="flex flex-wrap items-center gap-2 pl-10">
                      <BoneAct w="7.5rem" />
                      <BoneAct w="5rem" />
                    </div>
                  </div>
                </li>
              ))}
              <hr className="rule" />
            </ol>

            {/* 이 도시에 간 채널 */}
            <section className="flex flex-col gap-3">
              <h2 className="index">
                <Bone w="9rem" />
              </h2>
              <div className="flex flex-wrap gap-2">
                {["5rem", "6.5rem", "5.5rem"].map((w, i) => (
                  <BoneChip key={i} w={w} />
                ))}
              </div>
            </section>

            <span className="index inline-flex items-center gap-1.5">
              <BoneDot size={14} radius="3px" />
              <Bone w="5.5rem" />
            </span>
          </div>
        </section>
      </div>
    </BoneRoot>
  );
}

/* ────────────────────────────────────────────────────────────────
   /c/[creator] — 모바일 헤더 + CreatorExplorer + 영상 목록
   ──────────────────────────────────────────────────────────────── */

export function CreatorSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot label={label} className="flex flex-col gap-(--stack)">
      {/* 지도가 없다 — 허브는 목록 화면이다(`CreatorExplorer` 주석).
          여기에 BoneMap 을 남겨두면 로딩 중엔 지도가 있다가 사라진다. */}
      <header className="mx-auto flex w-full max-w-lg flex-col gap-2.5 px-(--gutter) pt-4 pb-0 lg:max-w-3xl">
        <BoneCrumb last="5.5rem" />
        <div className="flex items-center gap-4">
          <BoneDot size={54} />
          <div className="min-w-0 flex-1">
            <h1
              className="font-black"
              style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
            >
              <Bone w="60%" />
            </h1>
            <p className="index tnum mt-1.5">
              <Bone w="11rem" />
            </p>
            <div className="mt-2">
              <BoneAct w="7rem" />
            </div>
          </div>
        </div>
      </header>

      <div>
        <section className="mx-auto flex w-full max-w-lg flex-col px-(--gutter) lg:max-w-3xl">
          <div className="flex flex-col gap-2 pt-1 pb-2">
            <ChipRow widths={["4rem", "5.5rem", "5rem", "6rem", "4.5rem"]} />
            <ChipRow widths={["3.5rem", "4rem", "3.5rem", "4.5rem"]} />
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p className="index tnum">
                <Bone w="10rem" />
              </p>
              {/* 지도 열기 버튼 — h-9 알약 */}
              <BoneAct w="6rem" />
            </div>
          </div>

          <div className="flex flex-col pb-10">
            <ol>
              {times(7).map((i) => (
                <li key={i}>
                  <hr className="rule" />
                  <div className="-mx-2.5 flex items-start gap-3 rounded-(--r-control) px-2.5 py-2.5">
                    <BoneNo />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block font-bold"
                        style={{
                          fontSize: "var(--t-title)",
                          letterSpacing: "-0.025em",
                          lineHeight: 1.3,
                        }}
                      >
                        <Bone w="55%" />
                      </span>
                      <span
                        className="mt-0.5 block"
                        style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                      >
                        <Bone w="72%" />
                      </span>
                    </span>
                    <BoneDot size={16} radius="4px" className="mt-1 shrink-0" />
                  </div>
                </li>
              ))}
              <hr className="rule" />
            </ol>
          </div>
        </section>
      </div>

      {/* 영상 목록 — VideoList */}
      <section className="mx-auto flex w-full max-w-lg flex-col gap-(--stack) px-(--gutter) lg:max-w-3xl">
        <h2 className="index">
          <Bone w="7rem" />
        </h2>

        <div className="flex flex-col gap-(--stack)">
          {/* 검색 필드 — field px-3.5 py-3, 입력 16px */}
          <div className="field flex items-center gap-2.5 px-3.5 py-3">
            <BoneDot size={18} radius="4px" className="shrink-0" />
            <span className="w-full" style={{ fontSize: "16px" }}>
              <Bone w="9rem" />
            </span>
          </div>

          <ChipRow widths={["4rem", "5.5rem", "5rem", "6rem"]} />
          <ChipRow widths={["3.5rem", "4rem", "3.5rem", "4.5rem"]} />

          <ul className="grid grid-cols-1 gap-(--block) md:grid-cols-2 xl:grid-cols-3">
            {times(6).map((i) => (
              <li key={i}>
                <div className="grid gap-3.5">
                  <BoneFrame />
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="index truncate">
                        <Bone w="8rem" />
                      </span>
                    </div>
                    <h3
                      className="flex items-start gap-1.5 font-bold"
                      style={{
                        fontSize: "var(--t-title)",
                        letterSpacing: "-0.03em",
                        lineHeight: 1.3,
                      }}
                    >
                      <BoneDot size={13} radius="3px" className="mt-[0.18em] shrink-0" />
                      <span>
                        <Bone w="9rem" />
                      </span>
                    </h3>
                    <p
                      style={{
                        fontSize: "var(--t-meta)",
                        color: "var(--dim)",
                        lineHeight: 1.55,
                      }}
                    >
                      <Bone w="95%" />
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </BoneRoot>
  );
}
