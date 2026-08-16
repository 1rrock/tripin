/**
 * 저장 화면 골격 — 가운데 한 단.
 *
 * 사이드바는 없앴다. 저장 아래에는 화면이 하나(`/saved` 인덱스)뿐이고,
 * 목록을 고르면 지도로 간다(`[list]/page.tsx`) — 오갈 곳이 없는데 항해용 레일을
 * 세워 두면 자리만 먹는다.
 *
 * 모바일에는 위 여백이 없다 — 공용 헤더가 이미 헤어라인 하나를 긋고 있어서,
 * 여백을 두고 목록이 제 선을 또 그으면 16px 떨어진 선 두 개가 나란히 선다.
 * 헤더의 선이 곧 목록의 첫 선이다. 헤더가 숨는 lg 부터는 여백이 다시 필요하다.
 */
export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) lg:pt-8">
      {children}
    </main>
  );
}
