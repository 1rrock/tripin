import { supabase } from "@/shared/api/supabase";

/**
 * 이 장소를 다녀간 연예인 — 장소 상세의 "간 곳 전부 보기" 역링크 재료.
 *
 * (a) 출처 채널 중 celebrity_name 등록 채널 + (b) 승인된 언급(RLS 가
 * is_published 를 건다) 합집합. 홈 로더(home.ts 2.5단계)와 같은 인물 정의다.
 *
 * 캐시하지 않는다 — 장소당 인덱스 걸린 단건 조회 2개뿐이고, slug 별 캐시
 * 항목을 1,900개 만드는 쪽이 손해다(places.ts 상단 주석과 같은 계산).
 */
export interface PlaceCelebrity {
  name: string;
  nameEn: string | null;
}

/**
 * /celebs 인물 섹션 앵커 — 이름의 공백을 접어 fragment 로 쓸 수 있게 한다.
 * ("이 름" → "#p-이-름". 지금 인물들은 공백이 없지만, 그룹명·팀명이 들어오는
 * 순간 깨지는 잠복 결함이라 링크를 만드는 쪽과 id 를 붙이는 쪽이 같은 함수를 쓴다.)
 */
export function celebAnchor(name: string): string {
  return `p-${name.replace(/\s+/g, "-")}`;
}

export async function loadPlaceCelebrities(
  placeId: string,
  creatorSlugs: string[],
): Promise<PlaceCelebrity[]> {
  const [mentions, creators] = await Promise.all([
    supabase
      .from("place_celebrity_mentions")
      .select("person_name, person_name_en")
      .eq("place_id", placeId),
    creatorSlugs.length > 0
      ? supabase
          .from("creators")
          .select("celebrity_name, celebrity_name_en")
          .in("slug", creatorSlugs)
          .not("celebrity_name", "is", null)
      : Promise.resolve({ data: [] as { celebrity_name: string | null; celebrity_name_en: string | null }[] }),
  ]);

  const byName = new Map<string, PlaceCelebrity>();
  for (const c of creators.data ?? []) {
    if (c.celebrity_name) byName.set(c.celebrity_name, { name: c.celebrity_name, nameEn: c.celebrity_name_en });
  }
  // 언급(b)이 나중 — 같은 인물이면 언급의 영문 표기가 이긴다(시드가 손으로 쓴 값)
  for (const m of mentions.data ?? []) {
    byName.set(m.person_name, { name: m.person_name, nameEn: m.person_name_en });
  }
  return [...byName.values()];
}
