import Link from "next/link";
import { Icon } from "@/shared/ui/sign";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";

/**
 * 유저 화면 공통 골격 — 공항 사인 시스템.
 *
 * 고지 문구는 전 페이지 고정이다. 비공식·비제휴·삭제요청 안내가 법적 방어선의 일부다 (LEGAL.md 1.2).
 *
 * ⚠️ 시안에는 하단 탭 내비가 있지만 여기엔 없다 — 시안은 5개 섹션을 가진 앱이고
 *    Tripin 은 홈 → 채널 → 조각으로 내려가는 드릴다운이라 탭으로 오갈 대상이 없다.
 *    없는 목적지로 가는 탭을 만드는 건 시안 흉내지 번역이 아니다.
 *    검정 하단 바라는 장치 자체는 조각 화면의 "담은 목록 바"가 이어받는다.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // 모바일이 원본이고 데스크톱은 같은 시스템을 넓은 컨테이너에 담는다.
    // 폭만 넓히면 사인이 헤어라인으로 무너지므로 globals.css 가 md/xl 에서 값도 함께 키운다.
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col xl:max-w-6xl">
      {/* 브랜드 바 — 사인 밴드가 아니라 얇은 식별선. 화면의 주인공은 각 페이지 헤더다 */}
      <header className="flex items-center justify-between px-(--gutter) pt-4 pb-1">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Tripin 홈">
          <span className="ds-box ds-box--avatar" aria-hidden>
            <Icon.plane />
          </span>
          <span className="font-bold" style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em" }}>
            Tripin
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1">{children}</div>

      <footer id="notice" className="mt-12 px-(--gutter) pb-10">
        <div
          className="flex flex-col gap-3 p-(--card-pad)"
          style={{
            border: "var(--stroke-card) solid var(--hairline)",
            borderRadius: "var(--r-card)",
          }}
        >
          <p className="ds-label">고지</p>
          {/* 고지는 실제로 읽혀야 하는 문단이다 — 한국어 한 줄 35~45자 안에 들어오게 폭을 캡한다 */}
          <p className="max-w-[42ch]" style={{ fontSize: "var(--t-meta)", lineHeight: 1.65 }}>
            Tripin은 공개된 영상 정보를 정리한 <strong className="font-bold">비공식</strong>{" "}
            디렉터리입니다. 각 크리에이터·채널과 제휴 관계가 없으며, 모든 장소 정보에는 출처 영상이
            표기됩니다. 가격·영업 정보는 영상 촬영 시점 기준으로 실제와 다를 수 있습니다.
          </p>
          <p className="max-w-[42ch]" style={{ fontSize: "var(--t-meta)", lineHeight: 1.65 }}>
            삭제·수정 요청은 접수 즉시 우선 비공개 후 검토합니다. (요청 창구 준비 중)
          </p>
        </div>
      </footer>
    </div>
  );
}
