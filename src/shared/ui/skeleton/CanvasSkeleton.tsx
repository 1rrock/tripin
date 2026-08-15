/**
 * 캔버스(지도 + 패널) 화면의 뼈대 — `/map`, `/city/[city]`, `/c/[creator]`.
 *
 * 이 세 화면은 `.canvas-page` 한 벌을 공유하는데, 그 CSS 가 브레이크포인트에서
 * 레이아웃을 **통째로 갈아끼운다**(globals.css):
 *   모바일 — 지도가 42dvh(`/map` 은 46dvh) 블록, 패널이 그 아래로 흐른다
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
  BoneBlock,
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

export function MapSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot label={label}>
      <div className="canvas-page canvas-root">
        <BoneMap />

        <section className="canvas-panel">
          {/* 검색 알약 h-10 */}
          <div className="px-4 pt-4 pb-3">
            <div className="relative flex h-10 w-full items-center">
              <BoneBlock h={40} radius="var(--r-frame)" className="min-w-0 flex-1" />
            </div>
          </div>

          {/* CanvasFilters — 지역·종류·채널 트리거 3개 (h-9 알약) */}
          <div className="relative px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {["5.5rem", "4.5rem", "5rem"].map((w, i) => (
                <BoneBlock key={i} w={w} h={36} />
              ))}
            </div>
          </div>

          {/* 개수 줄 */}
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
        </section>
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
