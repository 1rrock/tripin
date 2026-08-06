import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCreatorVideos } from "@/shared/api/videos";
import { VideoList } from "./VideoList";
import { supabase } from "@/shared/api/supabase";
import type { PlaceType } from "@/shared/api/database.types";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { isDarkHex } from "@/shared/lib/color";
import { PLACE_TYPE_LABELS } from "@/shared/ui/place-types";

/**
 * 채널 허브 — 홈 카드의 화살표가 도착하는 곳 (캐논 월드, Explorer 와 같은 규범).
 * 도시를 고르고, 도시 안에서 카테고리(장소 유형)까지 바로 골라 들어갈 수 있다.
 * 도시가 1개뿐이면 그 조각으로 즉시 리다이렉트 — 고를 게 없는 화면은 보여주지 않는다.
 * anon 클라이언트 → RLS 가 is_published=true 만 내려준다.
 */
export const revalidate = 3600;

interface CityGroup {
  slug: string;
  name: string;
  placeCount: number;
  types: { type: PlaceType; count: number }[];
}

async function loadCreatorHub(creatorSlug: string) {
  const { data: creator } = await supabase
    .from("creators")
    .select("id, slug, display_name, initials, accent_color")
    .eq("slug", creatorSlug)
    .single();
  if (!creator) return null;

  const { data: videos } = await supabase
    .from("videos")
    .select("id")
    .eq("creator_id", creator.id);
  const videoIds = (videos ?? []).map((v) => v.id);
  const { data: links } = videoIds.length
    ? await supabase.from("video_places").select("video_id, place_id").in("video_id", videoIds)
    : { data: [] };
  const placeIds = [...new Set((links ?? []).map((l) => l.place_id))];
  const { data: places } = placeIds.length
    ? await supabase
        .from("places")
        .select("id, city_id, place_type, map_status")
        .in("id", placeIds)
        .eq("map_status", "confirmed")
    : { data: [] };

  const cityIds = [...new Set((places ?? []).map((p) => p.city_id))];
  const { data: cities } = cityIds.length
    ? await supabase.from("cities").select("id, slug, name").in("id", cityIds)
    : { data: [] };

  const groups: CityGroup[] = (cities ?? [])
    .map((city) => {
      const cityPlaces = (places ?? []).filter((p) => p.city_id === city.id);
      const typeCount = new Map<PlaceType, number>();
      for (const p of cityPlaces) {
        typeCount.set(p.place_type, (typeCount.get(p.place_type) ?? 0) + 1);
      }
      return {
        slug: city.slug,
        name: city.name,
        placeCount: cityPlaces.length,
        types: [...typeCount.entries()]
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
      };
    })
    // 공개 게이트 — 확정 핀이 모자란 조각은 허브 그리드에서도 뺀다
    .filter((g) => g.placeCount >= MIN_CONFIRMED_PINS)
    .sort((a, b) => b.placeCount - a.placeCount);
  // 남은 조각이 하나도 없으면 이 채널은 아직 공개되지 않은 것 → 호출부에서 notFound()
  if (groups.length === 0) return null;

  return { creator, groups };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string }>;
}): Promise<Metadata> {
  const data = await loadCreatorHub((await params).creator);
  if (!data) return { title: "찾을 수 없는 페이지" };
  const cityNames = data.groups.map((g) => g.name).join(", ");
  return {
    title: `${data.creator.display_name} 여행 지도 — ${cityNames}`,
    description: `${data.creator.display_name}이(가) 다녀간 도시 ${data.groups.length}곳(${cityNames})의 맛집·명소 지도. 모든 장소에 출처 영상 링크 포함.`,
  };
}

export default async function CreatorHubPage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator: creatorSlug } = await params;
  const [data, videoData] = await Promise.all([
    loadCreatorHub(creatorSlug),
    loadCreatorVideos(creatorSlug),
  ]);
  if (!data) notFound();
  // 예전엔 도시가 하나면 조각으로 직행했다. 이제는 영상 축이 생겨서
  // 도시가 하나여도 이 화면에 볼 것(영상 목록)이 있으므로 리다이렉트하지 않는다.

  const { creator, groups } = data;
  const videos = videoData?.videos ?? [];
  const totalPlaces = groups.reduce((sum, g) => sum + g.placeCount, 0);

  return (
    <main
      className="mx-auto w-full max-w-6xl px-6 md:px-8"
      style={{ "--hl": creator.accent_color } as React.CSSProperties}
    >
      <section className="pt-12 pb-8">
        <nav className="flex items-center text-xs text-ink-soft">
          <Link href="/" className="font-medium transition hover:text-ink">
            홈
          </Link>
          <svg
            aria-hidden
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-1 inline text-line"
          >
            <path d="m6 3.5 4.5 4.5L6 12.5" />
          </svg>
          <span className="text-ink">{creator.display_name}</span>
        </nav>

        <div className="mt-5 flex items-center gap-5">
          <span
            aria-hidden
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-line text-3xl font-black"
            style={{
              backgroundColor: creator.accent_color,
              color: isDarkHex(creator.accent_color) ? "#ffffff" : "var(--ink)",
            }}
          >
            {creator.initials}
          </span>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{creator.display_name}</h1>
            <p className="tnum mt-2 text-[15px] text-ink-soft">
              간 곳 {totalPlaces} · 도시 {groups.length} · 영상 {videos.length}
            </p>
          </div>
        </div>
      </section>

      {videos.length > 0 ? (
        <section className="pb-14">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">영상으로 보기</h2>
          <p className="mt-1.5 mb-6 text-[15px] text-ink-soft">
            영상을 고르면 그 안에서 장소가 나온 시각으로 이동합니다.
          </p>
          <VideoList videos={videos} creatorSlug={creatorSlug} />
        </section>
      ) : null}

      <h2 className="mb-6 text-xl font-bold tracking-tight sm:text-2xl">도시로 보기</h2>
      <section className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 pb-16">
        {groups.map((g) => (
          <article
            key={g.slug}
            className="group relative rounded-2xl border border-line bg-card p-6 transition hover:bg-fill"
          >
            <Link
              href={`/c/${creatorSlug}/${g.slug}`}
              className="absolute inset-0 rounded-2xl"
              aria-label={`${g.name} 지도 열기`}
            />
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">{g.name}</h2>
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
                </svg>
              </span>
            </div>
            <p className="tnum mt-2 text-[13px] text-ink-soft">간 곳 {g.placeCount}</p>

            {/* 카테고리 바로 선택 — 카드 오버레이 링크 위에 떠 있는 실제 링크들.
                칩 간격을 벌리고 min-height 로 터치 타깃을 확보한다 */}
            <div className="relative mt-5 flex flex-wrap gap-2.5">
              <Link
                href={`/c/${creatorSlug}/${g.slug}`}
                className="inline-flex min-h-10 items-center rounded-full bg-lemon px-4 text-[13px] font-extrabold transition hover:bg-ink hover:text-lemon active:scale-[0.97]"
              >
                전체
              </Link>
              {g.types.map(({ type, count }) => (
                <Link
                  key={type}
                  href={`/c/${creatorSlug}/${g.slug}?type=${type}`}
                  className="inline-flex min-h-10 items-center gap-1 rounded-full bg-fill px-3.5 text-[13px] font-bold transition hover:bg-line active:scale-[0.97]"
                >
                  {PLACE_TYPE_LABELS[type]}
                  <span className="tnum text-ink-soft">{count}</span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
