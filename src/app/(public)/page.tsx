import Link from "next/link";
import { supabase } from "@/shared/api/supabase";
import { isDarkHex } from "@/shared/lib/color";

/**
 * 홈 = 크리에이터 명단 (CONCEPT.md 4.1) — 편집자막 월드.
 * 세계지도를 깔지 않는다 — 빈 지도는 "아무것도 없는 서비스"로 읽힌다 (P1 원칙).
 * 카드 그리드가 아니라 출연진 자막 명단: 채널명이 곧 화면이다. 각 행의 형광펜은
 * 그 크리에이터의 액센트색 (--hl 주입).
 * anon 클라이언트 → RLS 가 is_published=true 만 내려준다.
 */
export const revalidate = 3600;

interface CreatorRow {
  slug: string;
  display_name: string;
  display_name_en: string | null;
  initials: string;
  accent_color: string;
  place_count: number;
  video_count: number;
  cities: { slug: string; name: string }[];
}

async function loadCreators(): Promise<CreatorRow[]> {
  const { data: creators } = await supabase
    .from("creators")
    .select(
      "id, slug, display_name, display_name_en, initials, accent_color, place_count, video_count",
    )
    .order("place_count", { ascending: false });
  if (!creators || creators.length === 0) return [];

  // "간 곳" 수와 도시 칩은 방문자가 실제로 보게 될 것과 같아야 한다 — 공개·확정 장소 기준.
  // anon RLS 가 is_published=false 를 걸러주므로, 보이는 places 중 confirmed 만 집계한다.
  // 도시 칩도 확정 장소가 있는 도시만 — 빈 조각으로 가는 링크를 만들지 않는다 (P1 원칙).
  const [{ data: cities }, { data: videos }, { data: links }, { data: places }] =
    await Promise.all([
      supabase.from("cities").select("id, slug, name"),
      supabase.from("videos").select("id, creator_id"),
      supabase.from("video_places").select("video_id, place_id"),
      supabase.from("places").select("id, map_status, city_id"),
    ]);
  const cityById = new Map((cities ?? []).map((c) => [c.id, c]));
  const creatorByVideo = new Map((videos ?? []).map((v) => [v.id, v.creator_id]));
  const confirmedById = new Map(
    (places ?? []).filter((p) => p.map_status === "confirmed").map((p) => [p.id, p]),
  );
  const confirmedByCreator = new Map<string, Set<string>>();
  const cityIdsByCreator = new Map<string, Set<string>>();
  for (const link of links ?? []) {
    const place = confirmedById.get(link.place_id);
    if (!place) continue;
    const creatorId = creatorByVideo.get(link.video_id);
    if (!creatorId) continue;
    if (!confirmedByCreator.has(creatorId)) confirmedByCreator.set(creatorId, new Set());
    confirmedByCreator.get(creatorId)!.add(place.id);
    if (!cityIdsByCreator.has(creatorId)) cityIdsByCreator.set(creatorId, new Set());
    cityIdsByCreator.get(creatorId)!.add(place.city_id);
  }

  return creators.map((c) => ({
    slug: c.slug,
    display_name: c.display_name,
    display_name_en: c.display_name_en,
    initials: c.initials,
    accent_color: c.accent_color,
    place_count: confirmedByCreator.get(c.id)?.size ?? 0,
    video_count: c.video_count,
    cities: [...(cityIdsByCreator.get(c.id) ?? [])]
      .map((cityId) => cityById.get(cityId))
      .filter((city): city is { id: string; slug: string; name: string } => Boolean(city))
      .map((city) => ({ slug: city.slug, name: city.name })),
  }));
}

export default async function HomePage() {
  const creators = await loadCreators();

  return (
    <main className="mx-auto max-w-3xl px-5">
      <section className="pt-16 pb-12">
        <h1 className="subtitle-face text-4xl leading-tight sm:text-5xl">
          여행 유튜버가
          <br />
          간 곳만, <span className="hl-pen">지도로.</span>
        </h1>
        <p className="mt-4 max-w-md text-ink-soft">
          채널을 고르면 그 사람이 다녀간 맛집·명소가 지도에 뜹니다. 모든 장소는 타임스탬프 달린
          출처 영상으로 끝납니다.
        </p>
      </section>

      {creators.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-soft">
          첫 지도를 준비하고 있습니다. 곧 열립니다.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 border-t border-neutral-200 pb-16">
          {creators.map((creator) => (
            <li
              key={creator.slug}
              className="py-8"
              style={{ "--hl": creator.accent_color } as React.CSSProperties}
            >
              <div className="flex items-start gap-4">
                {/* 이니셜 뱃지 — 프로필 사진 사용 금지 (LEGAL.md 1.3). 자막 외곽선 스타일 */}
                <span
                  aria-hidden
                  className="subtitle-face mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-ink text-lg"
                  style={{
                    backgroundColor: creator.accent_color,
                    color: isDarkHex(creator.accent_color) ? "#ffffff" : "#111111",
                  }}
                >
                  {creator.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="subtitle-face text-2xl sm:text-3xl">
                    <span className="hl-pen">{creator.display_name}</span>
                  </h2>
                  <p className="timecode-face mt-1.5 text-sm text-ink-soft">
                    간 곳 {creator.place_count} · 도시 {creator.cities.length} · 영상{" "}
                    {creator.video_count}
                  </p>

                  {creator.cities.length === 0 ? (
                    <p className="meta-label mt-4">첫 지도 준비 중</p>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {creator.cities.map((city) => (
                        <Link
                          key={city.slug}
                          href={`/c/${creator.slug}/${city.slug}`}
                          className="inline-flex items-center gap-1.5 border-2 border-ink px-3.5 py-1.5 text-sm font-bold transition hover:bg-ink hover:text-white"
                        >
                          {city.name}
                          <svg
                            aria-hidden
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="square"
                          >
                            <path d="M1.5 8.5 8.5 1.5M3 1.5h5.5V7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
