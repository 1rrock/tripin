import { Rule } from "@/shared/ui/frame";
import { Bone, BoneAct, BoneChip, BoneCrumb, BoneDot, BoneRoot, times } from "./bones";

/**
 * `/c/[creator]/[city]` 로딩 스켈레톤 — Explorer.tsx(콘택트 시트) 의 마크업을 그대로 베낀다.
 *
 *   · lg 2단 그리드 — 좌 리스트 패널(order-1) + 우 sticky 지도(order-2), 모바일은 지도가 위
 *   · 헤더: 브레드크럼 → 제목 → 통계 줄 → 인트로 문단 → 필터 칩 줄
 *   · 지도는 MapView 의 `on-lightbox` 프레임과 같은 상자(같은 className·둥근 모서리)
 *   · 장소 행: FrameNo 원 + 이름/타입/주소 → Act 3개(재생·지도·담기) → 요약 불릿 → 출처 영상 제목
 *   · 하단 "다음 행동" 칩 섹션까지 포함(흔한 경우 — 다른 도시 + 다른 채널)
 */
export function PieceSkeleton({ label }: { label: string }) {
  return (
    <BoneRoot label={label}>
      <div className="lg:grid lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start lg:gap-7 lg:px-(--gutter) lg:pt-4">
        {/* 지도 = 라이트박스. MapView 가 그리는 on-lightbox 프레임과 같은 상자 */}
        <div className="relative lg:sticky lg:top-4 lg:order-2">
          <div
            className="on-lightbox relative h-[28dvh] min-h-[11.5rem] w-full overflow-hidden lg:h-[calc(100dvh-2rem)] lg:min-h-0"
            style={{
              background: "var(--lightbox)",
              boxShadow: "inset 0 0 0 1px var(--hairline)",
              borderRadius: "var(--r-control)",
            }}
          >
            <span className="bone" />
          </div>
        </div>

        <section className="lg:order-1">
          <header className="flex flex-col gap-3.5 px-(--gutter) pt-6 pb-5 lg:px-0 lg:pt-0">
            <BoneCrumb last="5rem" />

            <h1
              className="font-black"
              style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
            >
              <Bone w="65%" />
            </h1>

            <p className="index tnum" style={{ color: "var(--dim)" }}>
              <Bone w="11rem" />
            </p>

            {/* 인트로 문단·"다른 채널" 블록은 그리지 않는다 — 조건부라 실제로는 거의
                안 나온다(공개 조각 표본에서 인트로 0건). 없는 줄을 미리 깔면 본화면이
                올 때 그만큼 위로 튀어 오른다. 종류 칩 줄은 대부분 있으므로 남긴다 */}
            <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
              <BoneChip w="2.5rem" />
              {times(5).map((i) => (
                <BoneChip key={i} w="4.5rem" />
              ))}
            </div>
          </header>

          <div className="flex flex-col gap-(--block) px-(--gutter) pb-10 lg:px-0">
            <ol>
              {times(5).map((i) => (
                <li key={i}>
                  <Rule />
                  <div className="-mx-2.5 flex flex-col gap-3 px-2.5 py-4 transition-colors">
                    <div className="flex w-full items-start gap-3">
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
                          <Bone w="60%" />
                        </span>
                        <span
                          className="mt-1 block"
                          style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                        >
                          <Bone w="40%" />
                        </span>
                        <span
                          className="mt-0.5 block"
                          style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                        >
                          <Bone w="70%" />
                        </span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-10">
                      <BoneAct w="5rem" />
                      <BoneAct w="4rem" />
                      <BoneAct w="4.5rem" />
                    </div>

                    <div className="pl-10">
                      <ul
                        className="flex flex-col gap-1.5"
                        style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}
                      >
                        {times(2).map((j) => (
                          <li key={j} className="flex gap-2">
                            <span aria-hidden style={{ color: "var(--dim)" }}>
                              ·
                            </span>
                            <span>
                              <Bone w={j === 0 ? "90%" : "65%"} />
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
                        <Bone w="30%" />
                      </p>
                    </div>

                    <p
                      className="pl-10"
                      style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.5 }}
                    >
                      <Bone w="55%" />
                    </p>
                  </div>
                </li>
              ))}
              <Rule />
            </ol>

            <section className="flex flex-col gap-(--stack)">
              <div className="flex flex-col gap-3">
                <h2 className="index" style={{ color: "var(--dim)" }}>
                  <Bone w="9rem" />
                </h2>
                <div className="flex flex-wrap gap-2">
                  {times(3).map((i) => (
                    <BoneChip key={i} w="6rem" />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="index" style={{ color: "var(--dim)" }}>
                  <Bone w="9rem" />
                </h2>
                <div className="flex flex-wrap gap-2">
                  <BoneChip w="7rem" />
                  {times(3).map((i) => (
                    <BoneChip key={i} w="6rem" />
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </BoneRoot>
  );
}
