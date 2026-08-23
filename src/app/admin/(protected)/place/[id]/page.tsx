import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { fetchAll } from "@/shared/api/chunked-in";
import { PlaceEditForm } from "../../_ui/PlaceEditForm";
import { SummaryEditor } from "./SummaryEditor";

/**
 * 요약문 작성 에디터 (docs/ADMIN.md 6장).
 * 남는 병목 — 장소당 2~3분. "저장 후 다음"으로 미작성 장소를 연속 처리한다.
 */
export const metadata: Metadata = {
  title: "요약 작성 — Eatripin 어드민",
};

export const dynamic = "force-dynamic";

function hasSummary(p: { summary: string | null; summary_bullets: string[] }): boolean {
  return !!p.summary?.trim() || p.summary_bullets.length > 0;
}

async function loadEditorData(placeId: string) {
  const db = getSupabaseAdmin();
  const { data: place } = await db.from("places").select("*").eq("id", placeId).single();
  if (!place) return null;

  const [{ data: link }, { data: city }] = await Promise.all([
    db
      .from("video_places")
      .select("video_id, timestamp_sec, mention_note")
      .eq("place_id", placeId)
      .limit(1)
      .maybeSingle(),
    db.from("cities").select("name, slug").eq("id", place.city_id).single(),
  ]);

  const { data: video } = link
    ? await db
        .from("videos")
        .select("title, youtube_video_id, published_at, creator_id")
        .eq("id", link.video_id)
        .single()
    : { data: null };

  const { data: creator } = video
    ? await db.from("creators").select("slug").eq("id", video.creator_id).single()
    : { data: null };

  // 미작성 큐: 전체 장소 중 요약(불릿/문단 모두) 없는 곳 — "저장 후 다음" 대상
  // places 는 1857행이라 PostgREST 기본 1000행 절단에 걸린다 — fetchAll 로 이어 받는다.
  const places = await fetchAll<{ id: string; summary: string | null; summary_bullets: string[] }>(
    (from, to) =>
      db
        .from("places")
        .select("id, summary, summary_bullets")
        .order("created_at", { ascending: true })
        .range(from, to),
  );
  const done = places.filter(hasSummary).length;
  const missing = places.filter((p) => !hasSummary(p) && p.id !== placeId);
  const nextId = missing[0]?.id ?? null;

  return {
    place,
    cityName: city?.name ?? "",
    citySlug: city?.slug ?? "",
    creatorSlug: creator?.slug ?? "",
    creatorId: video?.creator_id ?? null,
    videoTitle: video?.title ?? null,
    youtubeVideoId: video?.youtube_video_id ?? null,
    videoPublishedAt: video?.published_at ?? null,
    timestampSec: link?.timestamp_sec ?? null,
    mentionNote: link?.mention_note ?? null,
    progressDone: done,
    progressTotal: places.length,
    nextId,
  };
}

export default async function PlaceSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadEditorData(id);
  if (!data) notFound();

  const shotYm = data.videoPublishedAt ? data.videoPublishedAt.slice(0, 7) : "";
  const publicPath =
    data.creatorSlug && data.citySlug ? `/c/${data.creatorSlug}/${data.citySlug}` : "";

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-baseline justify-between">
        <nav className="text-sm text-neutral-500">
          <Link href="/admin/places" className="hover:text-neutral-900 hover:underline">
            ← 장소 목록으로
          </Link>
        </nav>
        <p className="text-sm tabular-nums text-neutral-500">
          요약 작성 <strong className="font-semibold text-neutral-900">{data.progressDone}</strong>{" "}
          / {data.progressTotal}
        </p>
      </div>

      <h1 className="mt-3 text-xl font-bold tracking-tight">
        {data.place.name}
        {data.place.name_local ? (
          <span className="ml-2 font-normal text-neutral-500">{data.place.name_local}</span>
        ) : null}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {data.cityName} · {data.place.address ?? "주소 미입력"}
      </p>

      {data.creatorId ? (
        <details className="mt-5 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-800">
            장소 정보 수정 — 이름·타입·좌표·지도 링크·확정 상태
          </summary>
          <div className="mt-3">
            <PlaceEditForm
              creatorId={data.creatorId}
              place={{
                id: data.place.id,
                cityId: data.place.city_id,
                name: data.place.name,
                nameLocal: data.place.name_local,
                placeType: data.place.place_type,
                mapStatus: data.place.map_status,
                lat: data.place.lat,
                lng: data.place.lng,
                address: data.place.address,
                googleMapsUrl: data.place.google_maps_url,
                googlePlaceId: data.place.google_place_id,
                kakaoPlaceId: data.place.kakao_place_id,
                naverPlaceId: data.place.naver_place_id,
                sourceNote: data.place.source_note,
                timestampSec: data.timestampSec,
              }}
            />
          </div>
        </details>
      ) : null}

      <SummaryEditor
        placeId={data.place.id}
        initialBullets={data.place.summary_bullets}
        initialPriceHint={data.place.price_hint}
        videoTitle={data.videoTitle}
        youtubeVideoId={data.youtubeVideoId}
        timestampSec={data.timestampSec}
        mentionNote={data.mentionNote}
        sourceNote={data.place.source_note}
        shotYm={shotYm}
        publicPath={publicPath}
        nextId={data.nextId}
      />
    </main>
  );
}
