import { Rule } from "@/shared/ui/frame";
import { Bone, BoneAct, BoneChip, BoneCrumb, BoneDot, BoneFrame, BoneRoot, times } from "./bones";

/**
 * `/c/[creator]/v/[videoId]` 로딩 스켈레톤 — page.tsx 헤더 + Timeline.tsx 를 그대로 베낀다.
 *
 *   · page.tsx: 브레드크럼 → 썸네일(md 2단) + 제목/통계 블록
 *   · Timeline.tsx (`timelinePanel`부터 그대로): 칩 스트립 → 스크러버 레일(h-12) →
 *     지도 힌트 → 정거장 행 목록. lg 에서는 좌 타임라인 + 우 sticky 지도 2단(조각 화면과 같은 문법)
 *   · 정거장이 여러 개 + 좌표가 있는 흔한 경우를 기준으로 삼는다(스크러버 있음, 지도 있음)
 */
export function VideoSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot label={label} className="flex flex-col gap-(--block) px-(--gutter) pt-4">
      <BoneCrumb last="2.5rem" />

      <header className="grid gap-4 md:grid-cols-[3fr_2fr] md:items-center md:gap-7">
        <BoneFrame />

        <div className="flex flex-col gap-2">
          <p className="index" style={{ color: "var(--dim)" }}>
            <Bone w="9rem" />
          </p>
          {/* 한 줄로 둔다. md 부터는 2단이라 헤더 높이를 16:9 썸네일이 정하므로 제목
              줄 수가 레이아웃에 영향을 주지 않고, 1단인 모바일에서만 아래가 밀린다.
              제목 길이는 알 수 없으니 모자란 쪽으로 — 짧으면 본문이 아래로 자라지만
              길면 남은 자리가 접히며 화면이 위로 튄다 */}
          <h1
            className="font-black"
            style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.2 }}
          >
            <Bone w="92%" />
          </h1>
          <p className="index tnum" style={{ color: "var(--dim)" }}>
            <Bone w="10rem" />
          </p>
          <p style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.6 }}>
            <Bone w="16rem" />
          </p>
        </div>
      </header>

      {/* Timeline.tsx — 조각 화면과 같은 2단: 모바일 지도 위, 데스크톱 우측 sticky */}
      <div className="lg:grid lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start lg:gap-7">
        <div className="relative -mx-(--gutter) mb-(--block) lg:sticky lg:top-4 lg:order-2 lg:mx-0 lg:mb-0">
          <div
            className="on-lightbox relative h-[38dvh] w-full overflow-hidden lg:h-[calc(100dvh-2rem)]"
            style={{
              background: "var(--lightbox)",
              boxShadow: "inset 0 0 0 1px var(--hairline)",
              borderRadius: "var(--r-control)",
            }}
          >
            <span className="bone" />
          </div>
        </div>

        <div className="lg:order-1">
          <div className="flex flex-col gap-(--block)">
            <section className="flex flex-col gap-3">
              <p className="index tnum" style={{ color: "var(--dim)" }}>
                <Bone w="17rem" />
              </p>

              {/* 1차 선택 UI — 가로 칩 스트립 */}
              <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:px-0">
                {times(6).map((i) => (
                  <div key={i} className="shrink-0">
                    <BoneChip w="6rem" />
                  </div>
                ))}
              </div>

              {/* 스크러버 레일 — 마커·헤드는 실제 시각 데이터가 있어야 위치가 정해지므로
                  뼈대만 남긴다(레일선). h-12 는 실화면 트랙 높이와 같다 */}
              <div className="relative h-12 px-3">
                <div className="relative h-full">
                  <div
                    aria-hidden
                    className="absolute top-1/2 right-0 left-0 h-[3px] -translate-y-1/2 rounded-full"
                    style={{ background: "var(--hairline)" }}
                  />
                </div>
              </div>

              <p style={{ fontSize: "var(--t-meta)", lineHeight: 1.6, color: "var(--dim)" }}>
                <Bone w="14rem" />
              </p>
            </section>

            <p className="index" style={{ color: "var(--dim)" }}>
              <Bone w="10rem" />
            </p>

            <div className="flex flex-col">
              {times(5).map((i) => (
                <div key={i}>
                  <Rule />
                  <div className="-mx-2.5 flex flex-col gap-3 px-2.5 py-4 transition-colors">
                    <div className="flex items-start gap-3">
                      <BoneDot size={28} />
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
                          className="mt-1 block"
                          style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                        >
                          <Bone w="45%" />
                        </span>
                        <span
                          className="mt-0.5 block"
                          style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                        >
                          <Bone w="70%" />
                        </span>
                      </span>
                    </div>

                    <ul
                      className="flex flex-col gap-1.5 pl-10"
                      style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}
                    >
                      {times(2).map((j) => (
                        <li key={j} className="flex gap-2">
                          <span aria-hidden style={{ color: "var(--dim)" }}>
                            ·
                          </span>
                          <span>
                            <Bone w={j === 0 ? "85%" : "60%"} />
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="pl-10" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
                      <Bone w="30%" />
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pl-10">
                      <BoneAct w="5rem" />
                      <BoneAct w="4rem" />
                    </div>
                  </div>
                </div>
              ))}
              <Rule />
            </div>
          </div>
        </div>
      </div>

      <section className="flex flex-wrap gap-2">
        <BoneChip w="8rem" />
        <BoneChip w="9rem" />
      </section>
    </BoneRoot>
  );
}
