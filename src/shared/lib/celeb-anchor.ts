/**
 * /celebs 인물 섹션 앵커 — 이름의 공백을 접어 fragment 로 쓸 수 있게 한다.
 * ("이 름" → "#p-이-름". 지금 인물들은 공백이 없지만, 그룹명·팀명이 들어오는
 * 순간 깨지는 잠복 결함이라 링크를 만드는 쪽과 id 를 붙이는 쪽이 같은 함수를 쓴다.)
 *
 * api/celebs.ts 가 아니라 lib 에 있는 이유: PlaceSheet("use client")도 쓰는데,
 * celebs.ts 는 supabase 를 물고 있어 클라이언트 번들에 끌려 들어가면 안 된다.
 */
export function celebAnchor(name: string): string {
  return `p-${name.replace(/\s+/g, "-")}`;
}
