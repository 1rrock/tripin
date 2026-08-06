import { supabase } from "@/shared/api/supabase";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { Card, Divider } from "@/shared/ui/sign";
import { HomeBrowse } from "./HomeBrowse";

/**
 * 홈 = 크리에이터 명단 (CONCEPT.md 4.1) — 공항 사인 시스템.
 *
 * 세계지도를 깔지 않는다 — 빈 지도는 "아무것도 없는 서비스"로 읽힌다 (P1 원칙).
 * 화면 구성은 승인 컴프(.impeccable/mocks/m-home.png): 맥락 → 검색 → 도시 축 → 채널 목록.
 * anon 클라이언트 → RLS 가 is_published=true 만 내려준다.
 */
export const revalidate = 3600;

interface CreatorRow {
  slug: string;
  display_name: string;
  initials: string;
  accent_color: string;
  place_count: number;
  video_count: number;
  cities: { slug: string; name: string }[];
}

async function loadHome(): Promise<{
  creators: CreatorRow[];
  totals: { places: number; cities: number; videos: number };
}> {
  const { data: creators } = await supabase
    .from("creators")
    .select("id, slug, display_name, initials, accent_color, place_count, video_count")
    .order("place_count", { ascending: false });
  if (!creators || creators.length === 0) {
    return { creators: [], totals: { places: 0, cities: 0, videos: 0 } };
  }

  // "간 곳"·도시 목록은 방문자가 실제로 보게 될 것과 같아야 한다 — 공개·확정 장소 기준.
  const [{ data: cities }, { data: videos }, { data: links }, { data: places }] = await Promise.all([
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
  const byCreatorCity = new Map<string, Map<string, { places: Set<string>; videos: Set<string> }>>();
  for (const link of links ?? []) {
    const place = confirmedById.get(link.place_id);
    if (!place) continue;
    const creatorId = creatorByVideo.get(link.video_id);
    if (!creatorId) continue;
    let byCity = byCreatorCity.get(creatorId);
    if (!byCity) {
      byCity = new Map();
      byCreatorCity.set(creatorId, byCity);
    }
    let bucket = byCity.get(place.city_id);
    if (!bucket) {
      bucket = { places: new Set(), videos: new Set() };
      byCity.set(place.city_id, bucket);
    }
    bucket.places.add(place.id);
    bucket.videos.add(link.video_id);
  }

  const publishedCityIds = new Set<string>();
  const allVideoIds = new Set<string>();
  let totalPlaces = 0;
  const rows: CreatorRow[] = [];
  for (const c of creators) {
    const publishedCities: { slug: string; name: string }[] = [];
    const videoIds = new Set<string>();
    let placeCount = 0;
    for (const [cityId, bucket] of byCreatorCity.get(c.id) ?? []) {
      if (bucket.places.size < MIN_CONFIRMED_PINS) continue;
      const city = cityById.get(cityId);
      if (!city) continue;
      publishedCityIds.add(cityId);
      publishedCities.push({ slug: city.slug, name: city.name });
      placeCount += bucket.places.size;
      for (const videoId of bucket.videos) {
        videoIds.add(videoId);
        allVideoIds.add(videoId);
      }
    }
    if (publishedCities.length === 0) continue;

    totalPlaces += placeCount;
    rows.push({
      slug: c.slug,
      display_name: c.display_name,
      initials: c.initials,
      accent_color: c.accent_color,
      place_count: placeCount,
      video_count: videoIds.size,
      cities: publishedCities,
    });
  }

  return {
    creators: rows,
    totals: { places: totalPlaces, cities: publishedCityIds.size, videos: allVideoIds.size },
  };
}

const STEPS = [
  { n: "1", title: "채널 고르기", body: "구독하는 그 사람 이름으로 찾습니다." },
  { n: "2", title: "지도에서 훑기", body: "그 사람이 간 맛집·명소가 핀으로 뜹니다." },
  { n: "3", title: "영상으로 확인", body: "타임스탬프 달린 출처 영상으로 끝납니다." },
] as const;

export default async function HomePage() {
  const { creators, totals } = await loadHome();

  if (creators.length === 0) {
    return (
      <main className="px-(--gutter) pt-4">
        <h1
          className="font-bold"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          곧 열립니다
        </h1>
        <Card className="mt-(--stack)">
          <p style={{ fontSize: "var(--t-body)" }}>
            첫 지도를 준비하고 있습니다. 확정된 장소가 쌓이는 대로 채널이 열립니다.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main>
      <HomeBrowse
        creators={creators.map((c) => ({
          slug: c.slug,
          displayName: c.display_name,
          initials: c.initials,
          accentColor: c.accent_color,
          placeCount: c.place_count,
          videoCount: c.video_count,
          cities: c.cities,
        }))}
        totals={totals}
      />

      {/* 처음 온 사람에게 이 제품이 무엇인지 — 목록을 가리지 않게 아래에 둔다 */}
      <section className="mt-(--stack) flex flex-col gap-(--stack) px-(--gutter)">
        <h2 className="font-bold" style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em" }}>
          3번이면 끝
        </h2>
        <ol className="flex flex-col gap-(--stack) md:grid md:grid-cols-3">
          {STEPS.map((step) => (
            <Card as="li" key={step.n} className="flex flex-col gap-3">
              <span
                aria-hidden
                className="ds-box ds-box--avatar tnum grid place-items-center font-bold"
                style={{ color: "var(--on-ink)", fontSize: "calc(var(--box-avatar) * 0.42)" }}
              >
                {step.n}
              </span>
              <Divider />
              <div>
                <h3
                  className="font-bold"
                  style={{ fontSize: "var(--t-body)", letterSpacing: "-0.01em" }}
                >
                  {step.title}
                </h3>
                <p className="mt-1" style={{ fontSize: "var(--t-meta)", lineHeight: 1.6 }}>
                  {step.body}
                </p>
              </div>
            </Card>
          ))}
        </ol>
      </section>
    </main>
  );
}
