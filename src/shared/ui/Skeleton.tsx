/**
 * 페이지별 뼈대 — 실화면과 같은 섹션·리듬.
 *
 * 홈: 제목 행 → 도시 타일 6 → 선 → 조각 카드 2
 * 지역: 제목 행 → 타일 6 → 다른 도시 행
 * 채널: 제목 → 롤 3 (얼굴 + 컷 4)
 *
 * 서버 컴포넌트. 훅 없음.
 */

function TileBones({ n, className = "mt-(--stack)" }: { n: number; className?: string }) {
  return (
    <ul className={`${className} grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-4 md:gap-y-8`}>
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="min-w-0">
          <span className="mb-2 flex items-baseline justify-between gap-2">
            <span className="bone-line w-[4.5rem]" />
            <span className="bone-line w-8" />
          </span>
          <span className="frame">
            <span className="bone" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function TitleRow({ right = true }: { right?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="bone-line w-[8.6rem]" style={{ height: "1.15rem" }} />
      {right ? <span className="bone-line w-[4.2rem]" /> : null}
    </div>
  );
}

export function HomeSkeleton({ label }: { label: string }) {
  return (
    <div
      className="px-(--gutter) pt-(--stack)"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <TitleRow />
      <TileBones n={6} />
      <section
        className="mt-(--block) border-t pt-(--stack)"
        style={{ borderColor: "var(--hairline)" }}
      >
        <span className="bone-line w-[7.5rem]" style={{ height: "1.15rem" }} />
        <ul className="mt-(--stack) flex flex-col gap-8 md:grid md:grid-cols-2 md:gap-x-4">
          {Array.from({ length: 2 }, (_, i) => (
            <li key={i}>
              <span className="mb-2 flex items-center gap-2.5">
                <span className="bone-ava" />
                <span className="min-w-0 flex-1">
                  <span className="bone-line w-[6.5rem]" />
                  <span className="bone-line mt-2 w-[4.5rem]" />
                </span>
              </span>
              <span className="frame">
                <span className="bone" />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function CitySkeleton({ label }: { label: string }) {
  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col px-(--gutter) pt-4"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <span className="bone-line w-10" style={{ height: "1.25rem" }} />
      <span className="bone-line mt-1.5 w-[6.5rem]" />
      <TileBones n={6} className="mt-5" />
      <section className="mt-(--block)">
        <hr className="rule" />
        <span className="bone-line mt-(--stack) w-[3.6rem]" />
        <ul className="mt-(--stack) flex flex-col">
          {Array.from({ length: 4 }, (_, i) => (
            <li
              key={i}
              className="flex items-center gap-3.5 border-b py-3 last:border-b-0"
              style={{ borderColor: "var(--hairline)" }}
            >
              <span className="frame w-[92px] shrink-0">
                <span className="bone" />
              </span>
              <span className="bone-line w-[5.5rem]" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function ChannelsSkeleton({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col px-(--gutter) pt-(--stack)"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <span className="bone-line w-[5.5rem]" style={{ height: "1.15rem" }} />
      <ul className="mt-(--stack) flex flex-col">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i}>
            {i > 0 ? <hr className="rule" /> : null}
            <span className="block py-(--stack)">
              <span className="flex items-center gap-3.5">
                <span className="bone-ava" style={{ width: 42, height: 42 }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="bone-line w-[7rem]" />
                    <span className="bone-line w-[5.5rem]" />
                  </span>
                  <span className="bone-line mt-2 w-[12rem]" />
                </span>
              </span>
              <span className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: 4 }, (_, j) => (
                  <span key={j} className="frame">
                    <span className="bone" />
                  </span>
                ))}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
