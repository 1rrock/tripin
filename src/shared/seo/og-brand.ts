/**
 * OG 카드의 브랜드색 — 리터럴이 **여기 한 곳에만** 있다.
 *
 * satori(`ImageResponse`)는 CSS 커스텀 프로퍼티를 못 읽는다. `var(--wax)` 를
 * 넘기면 색이 통째로 빠지므로 OG 트리에서만은 리터럴이 강제다. 문제는 그 리터럴을
 * `opengraph-image.tsx` 11곳이 각자 들고 있었다는 것이다 — 브랜드색을 바꾸면
 * 11곳을 따로 고쳐야 하고, 하나를 빠뜨리면 그 카드만 옛 색으로 공유된다.
 *
 * 🔴 `globals.css` 의 `--wax` 와 **같은 값을 유지할 것.** 둘 중 하나만 바꾸면
 *    화면과 공유 카드의 브랜드색이 갈린다. (`src/app/icon.svg` 와
 *    `shared/ui/mark-geom.ts` 의 `MARK_WAX` 도 같은 값이다 — 각각 정적 파일과
 *    마크 기하라 성격이 달라 따로 둔다.)
 */
export const OG_WAX = "#c9441a";
