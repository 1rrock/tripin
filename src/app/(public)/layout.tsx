import Link from "next/link";

/**
 * 유저 화면 공통 골격 — 콘택트 시트.
 *
 * 헤더는 시트 상단의 라벨 한 줄이다. 이 월드에서 화면을 지배해야 하는 건
 * 프레임이라 크롬은 최대한 가늘게 남긴다.
 *
 * 고지 문구는 전 페이지 고정이다 — 비공식·비제휴·삭제요청 안내가 법적 방어선의
 * 일부고(LEGAL.md 1.2), 출처가 유튜브임을 밝히는 문장은 썸네일 표시 요건이다(4.5-(3)).
 *
 * ⚠️ 테마 토글은 없다. 이 월드는 다크 하나로 커밋했다 — 사용 장면이 "밤에 영상
 *    보다가 여는 화면"이고, 라이트/다크 이중 유지가 직전 월드에서 대비 결함
 *    3건을 낳은 자리다. 밝은 면은 지도(--lightbox) 하나뿐이고 그건 테마가
 *    아니라 암실의 라이트박스, 즉 월드의 일부다.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // 모바일이 원본이고 데스크톱은 같은 시트를 넓은 판에 담는다.
    // 프레임 크기는 그리드 열 수로 변하고(1 → 2 → 3), 토큰은 globals.css 가 함께 키운다.
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col xl:max-w-6xl">
      <header className="flex items-center justify-between px-(--gutter) pt-5 pb-4">
        <Link href="/" aria-label="Tripin 홈" className="flex items-baseline gap-2">
          <span
            style={{
              fontFamily: "var(--font-archivo), sans-serif",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.22em",
            }}
          >
            TRIPIN
          </span>
          {/* 왁스 점 — 시트에 찍힌 표시 하나. 브랜드가 이 월드에 속해 있다는 서명 */}
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: "var(--r-round)",
              background: "var(--wax)",
              display: "inline-block",
            }}
          />
        </Link>
        <a
          href="#notice"
          className="index underline-offset-4 hover:underline"
          style={{ color: "var(--dim)" }}
        >
          고지
        </a>
      </header>

      <div className="flex-1">{children}</div>

      <footer id="notice" className="mt-(--block) px-(--gutter) pb-12">
        <hr className="rule mb-5" />
        <p className="index mb-3" style={{ color: "var(--dim)" }}>
          고지
        </p>
        {/* 고지는 실제로 읽혀야 하는 문단이다 — 한국어 한 줄 35~45자 안에 들어오게 폭을 캡한다 */}
        <div className="flex max-w-[42ch] flex-col gap-3">
          <p style={{ fontSize: "var(--t-meta)", lineHeight: 1.7, color: "var(--dim)" }}>
            Tripin은 공개된 영상 정보를 정리한{" "}
            <strong className="font-bold" style={{ color: "var(--paper)" }}>
              비공식
            </strong>{" "}
            디렉터리입니다. 각 크리에이터·채널과 제휴 관계가 없으며, 모든 장소 정보에는 출처 영상이
            표기됩니다. 가격·영업 정보는 영상 촬영 시점 기준으로 실제와 다를 수 있습니다.
          </p>
          {/* 썸네일·제목을 띄우는 이상 출처 표시는 선택이 아니다 (LEGAL.md 4.5-(3)) */}
          <p style={{ fontSize: "var(--t-meta)", lineHeight: 1.7, color: "var(--dim)" }}>
            영상 썸네일과 제목은 YouTube 원본을 변형 없이 표시하며, 저작권은 각 채널에 있습니다.
          </p>
          <p style={{ fontSize: "var(--t-meta)", lineHeight: 1.7, color: "var(--dim)" }}>
            삭제·수정 요청은 접수 즉시 우선 비공개 후 검토합니다. (요청 창구 준비 중)
          </p>
        </div>
      </footer>
    </div>
  );
}
