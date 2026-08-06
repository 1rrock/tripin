import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCreatorVideos } from "@/shared/api/videos";
import { VideoList } from "./VideoList";
import { supabase } from "@/shared/api/supabase";
import type { PlaceType } from "@/shared/api/database.types";
import { MIN_CONFIRMED_PINS } from "@/shared/config/publish";
import { Box, Card, Chip, DataRow, Divider, Icon } from "@/shared/ui/sign";
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
      className="flex flex-col gap-(--stack) px-(--gutter) pt-6 pb-16"
      style={{ "--hl": creator.accent_color } as React.CSSProperties}
    >
      <nav className="flex items-center gap-1.5" style={{ fontSize: "var(--t-meta)" }}>
        <Link href="/" className="underline-offset-4 hover:underline">
          홈
        </Link>
        <Icon.chevron aria-hidden style={{ width: 9, height: 9, fill: "var(--hairline)" }} />
        <span className="font-medium">{creator.display_name}</span>
      </nav>

      <div className="flex items-center gap-4">
        {/* 프로필 사진 자리 — accent_color 가 채널 식별자다 */}
        <span
          aria-hidden
          className="ds-box ds-box--card grid place-items-center font-bold"
          style={{
            background: creator.accent_color,
            color: "#fff",
            fontSize: "calc(var(--box-card) * 0.34)",
          }}
        >
          {creator.initials}
        </span>
        <h1
          className="min-w-0 flex-1 font-bold"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          {creator.display_name}
        </h1>
      </div>

      <Card>
        <DataRow
          items={[
            { label: "간 곳", value: String(totalPlaces) },
            { label: "도시", value: String(groups.length) },
            { label: "영상", value: String(videos.length) },
          ]}
        />
      </Card>

      <section className="flex flex-col gap-(--stack)">
        <div>
          <h2 className="font-bold" style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em" }}>
            도시로 보기
          </h2>
          <p className="mt-1" style={{ fontSize: "var(--t-meta)" }}>
            도시를 고르면 지도가 열립니다.
          </p>
        </div>
        <ul className="flex flex-col gap-(--stack) md:grid md:grid-cols-2">
          {groups.map((g) => (
            <Card as="li" key={g.slug} className="flex flex-col gap-(--card-pad)">
              <Link
                href={`/c/${creatorSlug}/${g.slug}`}
                className="flex items-center gap-4"
                aria-label={`${g.name} 지도 열기`}
              >
                <Box icon="pin" size="card" />
                <span className="min-w-0 flex-1">
                  <span className="block" style={{ fontSize: "var(--t-body)" }}>
                    도시
                  </span>
                  <span
                    className="block font-bold"
                    style={{
                      fontSize: "var(--t-title)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.28,
                    }}
                  >
                    {g.name}
                  </span>
                </span>
                <Icon.chevron
                  aria-hidden
                  style={{
                    width: "var(--icon-chevron)",
                    height: "var(--icon-chevron)",
                    fill: "var(--ink)",
                    flex: "none",
                  }}
                />
              </Link>

              <Divider />

              <DataRow
                items={[
                  { label: "간 곳", value: String(g.placeCount) },
                  { label: "유형", value: String(g.types.length) },
                ]}
              />

              {/* 유형별 바로 진입 — 도시 카드 안에서 한 단계 더 좁힌다 */}
              <div className="no-scrollbar -mx-(--card-pad) flex gap-2 overflow-x-auto px-(--card-pad)">
                <Chip href={`/c/${creatorSlug}/${g.slug}`}>전체</Chip>
                {g.types.map(({ type, count }) => (
                  <Chip key={type} href={`/c/${creatorSlug}/${g.slug}?type=${type}`}>
                    {PLACE_TYPE_LABELS[type]}
                    <span className="tnum ml-1.5 opacity-60">{count}</span>
                  </Chip>
                ))}
              </div>
            </Card>
          ))}
        </ul>
      </section>

      {videos.length > 0 ? (
        <section className="flex flex-col gap-(--stack)">
          <div>
            <h2
              className="font-bold"
              style={{ fontSize: "var(--t-title)", letterSpacing: "-0.02em" }}
            >
              영상으로 보기
            </h2>
            <p className="mt-1" style={{ fontSize: "var(--t-meta)" }}>
              영상을 고르면 그 안에서 장소가 나온 시각으로 이동합니다.
            </p>
          </div>
          <VideoList videos={videos} creatorSlug={creatorSlug} />
        </section>
      ) : null}
    </main>
  );
}
