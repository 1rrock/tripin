/**
 * 장소 URL 의 내부 경로 — slug 를 **퍼센트 인코딩해서** 돌려준다.
 *
 * ⚠️ 이 함수를 거치지 않고 `/place/${slug}` 를 직접 쓰면 표기가 갈린다. 확정 장소
 *    slug 는 대부분 한글이고, Next 의 Metadata 는 canonical·hreflang 을 내보낼 때
 *    자동으로 인코딩하는데 **사이트맵의 `<loc>` 은 우리가 준 문자열을 그대로 쓴다.**
 *    그대로 두면 사이트맵은 `/place/5-오마카세-tzmw` 를, 그 페이지의 canonical 은
 *    `/place/5-%EC%98%A4%EB%A7%88%EC%B9%B4%EC%84%B8-tzmw` 를 가리켜 같은 문서를
 *    두 주소로 광고하게 된다(사이트맵 규약도 RFC 3986 인코딩을 요구한다).
 *
 * `-`·`_` 같은 unreserved 문자는 `encodeURIComponent` 가 건드리지 않으므로
 * ASCII slug 는 그대로 통과한다.
 *
 * ⚠️ **`shared/api/places.ts` 에 두지 마라.** 목록 행(`PlaceRowLink`)이 클라이언트
 *    컴포넌트라, 거기서 이 함수를 가져오면 `places.ts` → `api/cache.ts` →
 *    `revalidateTag`(서버 전용)까지 클라이언트 번들로 끌려 들어와 페이지가 500 난다.
 *    `tsc` 도 `next build` 도 못 잡고 런타임에만 터진다. 그래서 순수 문자열 함수만
 *    이 파일에 따로 둔다 — 여기에는 어떤 서버 모듈도 import 하지 않는다.
 */
export function placePath(slug: string): string {
  return `/place/${encodeURIComponent(slug)}`;
}
