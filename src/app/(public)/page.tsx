import { supabase } from "@/shared/api/supabase";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { HomeBrowse } from "./HomeBrowse";

/**
 * 홈 = 크리에이터 명단 (CONCEPT.md 4.1) — 캐논 월드 (Explorer 와 같은 규범).
 * 세계지도를 깔지 않는다 — 빈 지도는 "아무것도 없는 서비스"로 읽힌다 (P1 원칙).
 * 타이포 히어로 + 검색(주 행동) + 레몬 티커 + 3단계 + 1px 라인 카드.
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

interface TickerItem {
  name: string;
  timestamp: string | null;
}

function formatTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function loadHome(): Promise<{
  creators: CreatorRow[];
  ticker: TickerItem[];
  totals: { places: number; cities: number; videos: number };
}> {
  const { data: creators } = await supabase
    .from("creators")
    .select("id, slug, display_name, initials, accent_color, place_count, video_count")
    .order("place_count", { ascending: false });
  if (!creators || creators.length === 0) {
    return { creators: [], ticker: [], totals: { places: 0, cities: 0, videos: 0 } };
  }

  // "간 곳"·도시 칩·티커는 방문자가 실제로 보게 될 것과 같아야 한다 — 공개·확정 장소 기준.
  const [{ data: cities }, { data: videos }, { data: links }, { data: places }] =
    await Promise.all([
      supabase.from("cities").select("id, slug, name"),
      supabase.from("videos").select("id, creator_id"),
      supabase.from("video_places").select("video_id, place_id, timestamp_sec"),
      supabase.from("places").select("id, name, map_status, city_id"),
    ]);
  const cityById = new Map((cities ?? []).map((c) => [c.id, c]));
  const creatorByVideo = new Map((videos ?? []).map((v) => [v.id, v.creator_id]));
  const confirmedById = new Map(
    (places ?? []).filter((p) => p.map_status === "confirmed").map((p) => [p.id, p]),
  );
  const byCreatorCity = new Map<string, Map<string, { places: Set<string>; videos: Set<string> }>>();
  const tickerByPlace = new Map<string, TickerItem & { cityId: string }>();
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
    if (!tickerByPlace.has(place.id)) {
      tickerByPlace.set(place.id, {
        cityId: place.city_id,
        name: place.name,
        timestamp: link.timestamp_sec !== null ? formatTimestamp(link.timestamp_sec) : null,
      });
    }
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
    ticker: [...tickerByPlace.values()]
      .filter((t) => publishedCityIds.has(t.cityId))
      .slice(0, 10)
      .map(({ name, timestamp }) => ({ name, timestamp })),
    totals: {
      places: totalPlaces,
      cities: publishedCityIds.size,
      videos: allVideoIds.size,
    },
  };
}

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 6 4.5 4.5L12.5 6" />
    </svg>
  );
}

const STEPS = [
  {
    n: "1",
    title: "채널 고르기",
    body: "구독하는 그 사람 이름으로 찾습니다.",
  },
  {
    n: "2",
    title: "지도에서 훑기",
    body: "그 사람이 간 맛집·명소가 핀으로 뜹니다.",
  },
  {
    n: "3",
    title: "영상으로 확인",
    body: "타임스탬프 달린 출처 영상으로 끝납니다.",
  },
] as const;

export default async function HomePage() {
  const { creators, ticker, totals } = await loadHome();
  const tickerLoop = ticker.length > 0 ? [...ticker, ...ticker] : [];
  const creatorCards = creators.map((c) => ({
    slug: c.slug,
    displayName: c.display_name,
    initials: c.initials,
    accentColor: c.accent_color,
    placeCount: c.place_count,
    videoCount: c.video_count,
    cities: c.cities,
  }));

  const middle = (
    <>
      {tickerLoop.length > 0 ? (
        <div
          aria-hidden
          className="mt-12 overflow-hidden border-y border-line bg-lemon py-3.5 text-[15px] font-extrabold sm:mt-14"
        >
          <div className="ticker-track">
            {tickerLoop.map((t, i) => (
              <span key={i} className="mr-10">
                {t.name}
                {t.timestamp ? <span className="tnum"> · 영상 {t.timestamp}</span> : null}
                <span className="ml-10 text-brand">✱</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4" />
      )}

      <div className="mx-auto w-full max-w-6xl px-6 md:px-8">
        <section id="how" className="border-b border-line pt-14 pb-14">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">3클릭이면 끝</h2>
          <p className="mt-2 max-w-md text-[15px] text-ink-soft">
            채널을 고르면 지도가 채워지고, 핀을 누르면 영상으로 갑니다.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="rounded-2xl border border-line bg-card p-5 sm:p-6">
                <span className="tnum inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[13px] font-extrabold text-paper">
                  {step.n}
                </span>
                <h3 className="mt-4 text-[17px] font-bold">{step.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
          {creators.length > 0 ? (
            <a
              href="#creators"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-extrabold text-paper transition hover:opacity-85 active:scale-[0.97]"
            >
              채널 고르러 가기
              <ArrowIcon size={15} />
            </a>
          ) : null}
        </section>
      </div>
    </>
  );

  return (
    <main>
      <div className="mx-auto w-full max-w-6xl px-6 md:px-8">
        <section className="pt-12 pb-2 sm:pt-16">
          <h1 className="text-[36px] leading-[1.15] font-black tracking-tight sm:text-[48px]">
            여행 유튜버가
            <br />
            <span className="hl-under">간 곳만</span>,
            <br />
            지도로.
          </h1>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
            채널을 고르면 그 사람이 다녀간 맛집·명소가 지도에 뜹니다. 모든 장소는 타임스탬프
            달린 출처 영상으로 끝납니다.
          </p>

          {creators.length > 0 ? (
            <dl className="mt-6 flex flex-wrap gap-2.5">
              <div className="inline-flex items-baseline gap-1.5 rounded-full bg-fill px-3.5 py-2 text-[13px]">
                <dt className="font-bold text-ink-soft">채널</dt>
                <dd className="tnum font-extrabold text-ink">{creators.length}</dd>
              </div>
              <div className="inline-flex items-baseline gap-1.5 rounded-full bg-fill px-3.5 py-2 text-[13px]">
                <dt className="font-bold text-ink-soft">도시</dt>
                <dd className="tnum font-extrabold text-ink">{totals.cities}</dd>
              </div>
              <div className="inline-flex items-baseline gap-1.5 rounded-full bg-fill px-3.5 py-2 text-[13px]">
                <dt className="font-bold text-ink-soft">간 곳</dt>
                <dd className="tnum font-extrabold text-ink">{totals.places}</dd>
              </div>
              {totals.videos > 0 ? (
                <div className="inline-flex items-baseline gap-1.5 rounded-full bg-fill px-3.5 py-2 text-[13px]">
                  <dt className="font-bold text-ink-soft">영상</dt>
                  <dd className="tnum font-extrabold text-ink">{totals.videos}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {creators.length === 0 ? (
            <p className="mt-10 max-w-md rounded-2xl border border-dashed border-line bg-fill px-5 py-6 text-sm text-ink-soft">
              첫 지도를 준비하고 있습니다. 곧 열립니다.
            </p>
          ) : (
            <a
              href="#how"
              className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-soft transition hover:text-ink"
            >
              어떻게 쓰나요
              <ChevronDownIcon />
            </a>
          )}
        </section>
      </div>

      {creators.length > 0 ? (
        <HomeBrowse creators={creatorCards} middle={middle} />
      ) : (
        middle
      )}
    </main>
  );
}
