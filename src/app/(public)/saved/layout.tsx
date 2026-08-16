/**
 * 저장 화면 골격 — 모바일은 한 단, 데스크톱은 넓은 판.
 *
 * 사이드바는 없앴다. 저장 아래에는 화면이 하나(`/saved` 인덱스)뿐이고,
 * 목록을 고르면 지도로 간다(`[list]/page.tsx`) — 오갈 곳이 없는데 항해용 레일을
 * 세워 두면 자리만 먹는다.
 *
 * 폭은 lg 부터 풀어 준다. `max-w-lg`(512px) 하나로 버티면 1400px 화면 한가운데
 * 전화기가 한 대 서 있는 꼴이 된다 — 좁은 것이 늘 조용한 것은 아니다. 대신 무한정
 * 늘리지도 않는다(5xl=1024px): 행 하나가 화면 폭만큼 길어지면 이름과 개수가 서로
 * 멀어져서 어느 개수가 어느 이름의 것인지 눈으로 이어야 한다.
 *
 * 모바일에는 위 여백이 없다 — 공용 헤더가 이미 헤어라인 하나를 긋고 있어서,
 * 여백을 두고 목록이 제 선을 또 그으면 16px 떨어진 선 두 개가 나란히 선다.
 * 헤더의 선이 곧 목록의 첫 선이다. 헤더가 숨는 lg 부터는 제목이 그 자리에 서므로
 * 위 여백이 넉넉해야 한다.
 */
export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-(--block) px-(--gutter) lg:max-w-5xl lg:pt-10">
      {children}
    </main>
  );
}
