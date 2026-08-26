import { Rule } from "@/shared/ui/frame";
import { Bone, BoneChip, BoneCrumb, BoneDot, BoneRoot, times } from "./bones";

/**
 * 지도 + 장소 목록 문서의 뼈대 — `/c/[creator]/[city]` 와 `/city/[city]` 가 **같이** 쓴다.
 *
 * 두 화면이 껍데기를 공유하게 되면서 뼈대도 하나로 합쳤다. 예전에는 도시 쪽이
 * `CanvasSkeleton.CitySkeleton`(= `/map` 의 `.canvas-page`)을 썼는데, 본화면이
 * 이 그리드로 오면서 로딩과 본화면이 딴 레이아웃으로 갈렸다.
 *
 *   · lg 2단 그리드 — 좌 목록(order-1) + 우 sticky 지도(order-2), 모바일은 지도가 위
 *   · 헤더: 빵부스러기 → 제목 → 통계 줄 → 필터 칩 줄(도시는 종류+채널 두 줄)
 *   · 지도는 MapView 의 `on-lightbox` 프레임과 같은 상자(같은 className·둥근 모서리)
 *
 * ⚠️ **행에는 하트 하나뿐이다.** 예전 뼈는 행마다 알약 3개 + 요약 불릿 2줄 + 출처
 *    제목까지 그렸는데, 그건 목록이 요약·아웃링크를 싣던 시절의 모양이다. 지금
 *    실화면 행은 이름·종류·주소 + 하트가 전부고, 아웃링크는 **고른 행에서만** 편다
 *    (`Explorer`·`CityExplorer` 의 행동 줄 주석). 뼈가 더 그리면 본화면이 오는 순간
 *    목록이 그만큼 위로 튄다. 실화면 행을 바꾸면 여기도 같이 바꿔라.
 */
function MapListSkeleton({
  label,
  chipRows,
  crumbLast,
}: {
  label: string;
  /** 필터 칩 줄 — 조각은 종류 한 줄, 도시는 종류+채널 두 줄 */
  chipRows: string[][];
  crumbLast: string;
}) {
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
            <BoneCrumb last={crumbLast} />

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
                올 때 그만큼 위로 튀어 오른다. 필터 칩 줄은 대부분 있으므로 남긴다 */}
            {chipRows.map((widths, r) => (
              <div
                key={r}
                className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0"
              >
                {widths.map((w, i) => (
                  <BoneChip key={i} w={w} />
                ))}
              </div>
            ))}
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

                    {/* 하트 하나 — `SaveButton`(비-bare)이 `size-9` = 36px 원이다 */}
                    <div className="flex flex-wrap items-center gap-2 pl-10">
                      <BoneDot size={36} />
                    </div>
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
            </section>
          </div>
        </section>
      </div>
    </BoneRoot>
  );
}

/** `/c/[creator]/[city]` — 종류 칩 한 줄. 빵부스러기는 홈 › 채널 › 도시. */
export function PieceSkeleton({ label }: { label: string }) {
  return (
    <MapListSkeleton
      label={label}
      crumbLast="5rem"
      chipRows={[["2.5rem", "4.5rem", "4.5rem", "4.5rem", "4.5rem", "4.5rem"]]}
    />
  );
}

/** `/city/[city]` — 종류 + 채널 두 줄. 빵부스러기는 홈 › 지도 › 도시. */
export function CitySkeleton({ label }: { label: string }) {
  return (
    <MapListSkeleton
      label={label}
      crumbLast="4.5rem"
      chipRows={[
        ["3.5rem", "4rem", "3.5rem", "4.5rem", "3.75rem"],
        ["4.5rem", "6rem", "5.5rem", "6.5rem"],
      ]}
    />
  );
}
