import Link from "next/link";

/**
 * 유저 화면 공통 골격 (CONCEPT.md 3장) — 편집자막 월드.
 * 고지 문구는 전 페이지 고정 — 비공식·비제휴·삭제요청 안내가 법적 방어선의 일부다 (LEGAL.md 1.2).
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b-2 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="subtitle-face text-xl">
            <span className="hl-pen">TRIPIN</span>
          </Link>
          <span className="meta-label">비공식 · 출처는 전부 영상</span>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="mt-16 border-t border-neutral-200">
        <div className="mx-auto max-w-5xl space-y-3 px-5 py-8 text-xs leading-relaxed text-ink-soft">
          <p className="meta-label">고지</p>
          <p>
            Tripin은 공개된 영상 정보를 정리한 <strong className="font-semibold">비공식</strong>{" "}
            디렉터리입니다. 각 크리에이터·채널과 제휴 관계가 없으며, 모든 장소 정보에는 출처 영상이
            표기됩니다. 가격·영업 정보는 영상 촬영 시점 기준으로 실제와 다를 수 있습니다.
          </p>
          <p>삭제·수정 요청은 접수 즉시 우선 비공개 후 검토합니다. (요청 창구 준비 중)</p>
        </div>
      </footer>
    </div>
  );
}
