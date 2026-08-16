/**
 * 저장 화면 골격 — 가운데 한 단.
 *
 * 사이드바는 없앴다. 저장 아래에는 화면이 하나(`/saved` 인덱스)뿐이고,
 * 목록을 고르면 지도로 간다(`[list]/page.tsx`) — 오갈 곳이 없는데 항해용 레일을
 * 세워 두면 자리만 먹는다.
 */
export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) pt-4 lg:pt-8">
      {children}
    </main>
  );
}
