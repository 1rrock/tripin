"use client";

/**
 * 저장 인덱스 — 구글 지도 "내 장소" 문법의 한 벌 목록.
 *
 * 라운드 프레임·섹션 라벨을 걷어내고 행만 남긴다: 원형 아이콘 · 이름 · 개수.
 * 저장한 곳 → 그룹들 → 새 리스트 → 계정.
 *
 * "그룹 없음" 행은 두지 않는다. 하트를 누르면 그 장소는 **저장한 곳에 담긴다** —
 * 저장한 곳이 곧 기본 그룹이고, 아직 어느 그룹에도 안 넣은 장소도 거기서 보인다.
 * 같은 것을 두 행으로 세면 "둘이 뭐가 다르지" 를 매번 묻게 된다.
 *
 * 어느 행을 눌러도 지도로 간다(`?saved=1` · `?list=`). ⋮ 로 이름 바꾸기·삭제.
 *
 * 데스크톱(lg+)에서는 같은 행이 **두 단**으로 접힌다. 한 단으로 두면 1400px 화면에
 * 512px 짜리 전화기 기둥이 하나 서고 오른쪽 900px 이 통째로 빈다 — 그룹이 여덟 개만
 * 되어도 스크롤이 생기는데 옆은 백지다. 가른 것은 배치뿐, 행의 문법은 그대로다.
 */

import { Suspense } from "react";
import { BookmarkSimple, Heart } from "@phosphor-icons/react";
import type { SavedListRow } from "@/shared/api/saved-server";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useSaved } from "@/shared/ui/SavedContext";
import { AccountRow } from "./AccountRow";
import { NewListButton } from "./NewListButton";
import { ListRowMenu } from "./ListRowMenu";
import { SavedHeader } from "./SavedHeader";
import { SavedRow } from "@/shared/ui/SavedRow";

export function SavedIndex({
  lists,
  likedCount,
  linked,
}: {
  lists: SavedListRow[];
  likedCount: number;
  linked: boolean;
}) {
  const { messages: m, t, href } = useLocale();
  const { lists: clientLists, countIn, ready, savedCount } = useSaved();

  /* 컨텍스트가 준비되기 전에는 서버 값이 정답이다(첫 페인트에 숫자가 비지 않는다).
     준비된 뒤에는 컨텍스트가 정답 — 방금 만든 그룹이 바로 보인다. */
  const rows: SavedListRow[] = ready
    ? clientLists.map((l) => ({ id: l.id, name: l.name, count: countIn(l.id) }))
    : lists;
  const liked = ready ? savedCount : likedCount;

  return (
    <>
      <SavedHeader summary={t(m.saved.listSummary, { p: liked, l: rows.length })} />

      {/* 위에 선을 긋지 않는다 — 공용 헤더의 헤어라인이 이미 목록의 첫 선이다(layout 주석).
          마지막 행의 아래 선도 지운다 — 조금 밑에 푸터의 border-t 가 또 한 줄 긋는다.
          목록의 선은 **행과 행 사이**에만 있으면 된다.

          lg 부터 두 단. 단 사이는 세로 헤어라인 하나 — 카드로 가르지 않는다. */}
      <ul
        className="-mx-(--gutter) lg:grid lg:grid-cols-2 lg:border-t [&>li:last-child]:border-b-0"
        style={{ borderColor: "var(--hairline)" }}
      >
        {/* 저장한 곳 전체 — 그룹 행과 같은 길로 간다. 목록만 있는 화면을 따로 두면
            같은 것을 두 벌로 그리게 된다(`[list]/page.tsx` 주석).
            두 단에서는 이 행만 통째로 한 줄을 쓴다 — 그룹들의 머리이지 그중 하나가 아니다. */}
        <SavedRow
          href={href("/map?saved=1")}
          className="lg:col-span-2"
          tone="wax"
          icon={<Heart className="size-5" weight="fill" />}
          name={m.saved.title}
          meta={t(m.saved.listCount, { n: liked })}
        />

        {/* 그룹은 **지도로** 연다 — 그룹은 여행 계획이고, 계획은 목록보다 지도에서 읽힌다
            (구글 지도 "내 장소" 도 목록을 열면 지도가 먼저 뜬다). 지도를 여기 또 두지 않고
            `/map?list=` 필터로 보내는 이유는 SavedMapChips 주석에 있다 — 지도는 하나다. */}
        {rows.map((l, i) => (
          <SavedRow
            key={l.id}
            href={href(`/map?list=${l.id}`)}
            /* 왼쪽 단만 오른쪽에 선을 세운다. ⋮ 가 그 선에 닿지 않게 여백을 더 준다. */
            className={i % 2 === 0 ? "lg:border-r lg:pr-3" : ""}
            icon={<BookmarkSimple className="size-5" weight="fill" />}
            name={l.name}
            meta={t(m.saved.listCount, { n: l.count })}
            trailing={<ListRowMenu listId={l.id} name={l.name} />}
          />
        ))}

        {/* 그룹이 홀수면 오른쪽 단의 마지막 칸이 빈다 — 그 자리에 아래 선이 없으면
            줄이 절반에서 끊긴 것처럼 보인다. 빈 칸이 선만 이어 받는다. */}
        {rows.length % 2 === 1 ? (
          <li aria-hidden className="hidden border-b lg:block" style={{ borderColor: "var(--hairline)" }} />
        ) : null}

        {/* 그룹이 하나도 없을 때만 왜 묶는지 한 줄 붙인다. 하나라도 있으면 자명하다.
            lg 부터는 같은 행동이 머리의 버튼으로 서 있다(SavedHeader) — 둘을 같이 두지 않는다. */}
        <NewListButton
          variant="row"
          className="lg:hidden"
          hint={rows.length === 0 ? m.saved.listEmptyHint : undefined}
        />

        <Suspense>
          <AccountRow linked={linked} className="lg:col-span-2" />
        </Suspense>
      </ul>
    </>
  );
}
