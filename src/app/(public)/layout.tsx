import Link from "next/link";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";

/**
 * 유저 화면 공통 골격 (CONCEPT.md 3장) — 캐논 월드.
 * 고지 문구는 전 페이지 고정 — 비공식·비제휴·삭제요청 안내가 법적 방어선의 일부다 (LEGAL.md 1.2).
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-1 text-[22px] font-black tracking-tight"
          >
            Trip
            <em className="inline-block rounded-md bg-lemon text-on-lemon px-1.5 not-italic">in</em>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="hidden rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold text-paper sm:inline">
              비공식 · 출처는 전부 영상
            </span>
            <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-paper sm:hidden">
              비공식
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="mt-16 border-t border-line bg-card">
        <div className="mx-auto max-w-6xl space-y-3 px-6 py-10 text-xs leading-relaxed text-ink-soft md:px-8">
          <p className="font-bold text-ink">고지</p>
          {/* 고지는 실제로 읽혀야 하는 문단이다 — 12px 에서 max-w-lg(512px)면
              한국어 한 줄 약 42자로, 편안한 줄길이(35~45자) 안에 들어온다.
              max-w-2xl(672px)은 56자, 폭 제한이 없으면 92자까지 늘어난다. */}
          <p className="max-w-lg">
            Tripin은 공개된 영상 정보를 정리한 <strong className="font-semibold">비공식</strong>{" "}
            디렉터리입니다. 각 크리에이터·채널과 제휴 관계가 없으며, 모든 장소 정보에는 출처 영상이
            표기됩니다. 가격·영업 정보는 영상 촬영 시점 기준으로 실제와 다를 수 있습니다.
          </p>
          <p className="max-w-lg">
            삭제·수정 요청은 접수 즉시 우선 비공개 후 검토합니다. (요청 창구 준비 중)
          </p>
        </div>
      </footer>
    </div>
  );
}
