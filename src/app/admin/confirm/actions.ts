"use server";

/**
 * /admin/confirm 서버 액션 — 수동 입력 모드 (docs/ADMIN.md 10장 3번).
 *
 * 파이프라인(INGEST.md)이 붙기 전까지 손으로 조각을 만드는 경로다.
 * 보호: proxy.ts 가 /admin/* POST(서버 액션 포함)에 쿠키를 요구한다.
 *
 * 확정 잠금 규칙(docs/ADMIN.md 5장)은 서버에서 최종 검증한다:
 *   confirmed 는 좌표 + 근거(source_note) 없이는 저장되지 않는다.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { resolveGoogleCoords } from "@/shared/lib/resolve-google-place";

export interface ActionResult {
  ok?: string;
  error?: string;
}

const slugSchema = z
  .string()
  .min(2, "슬러그는 2자 이상")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "슬러그는 영소문자·숫자·하이픈만 (예: marushichi-tonkatsu)");

function fail(error: string): ActionResult {
  return { error };
}

function isUniqueViolation(message: string): boolean {
  return message.includes("duplicate key");
}

/** "35.6812, 139.7671" 한 칸 입력 → 좌표. 지도에서 복사해 붙여넣는 흐름 전제. */
function parseLatLng(raw: string): { lat: number; lng: number } | null {
  const m = raw.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** "12:40" / "1:02:03" / "760" → 초. */
function parseTimestamp(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const parts = t.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  return null;
}

/** watch?v= / youtu.be / shorts / live URL → videoId. */
function parseYoutubeId(raw: string): string | null {
  const t = raw.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  const m = t.match(/(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1]! : null;
}

// ── 크리에이터 ─────────────────────────────────────────

export async function createCreator(_: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      slug: slugSchema,
      displayName: z.string().min(1, "이름을 입력하세요"),
      youtubeChannelId: z.string().min(1, "채널 ID 또는 @핸들을 입력하세요"),
      initials: z.string().min(1).max(3, "이니셜은 1~3자"),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상 형식 오류"),
    })
    .safeParse({
      slug: form.get("slug"),
      displayName: form.get("displayName"),
      youtubeChannelId: form.get("youtubeChannelId"),
      initials: form.get("initials"),
      accentColor: form.get("accentColor"),
    });
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  const d = parsed.data;

  const { error } = await getSupabaseAdmin()
    .from("creators")
    .insert({
      slug: d.slug,
      display_name: d.displayName,
      youtube_channel_id: d.youtubeChannelId,
      youtube_handle: d.youtubeChannelId.startsWith("@") ? d.youtubeChannelId : null,
      initials: d.initials.toUpperCase(),
      accent_color: d.accentColor,
      languages: ["ko"],
    });
  if (error) {
    return fail(isUniqueViolation(error.message) ? "이미 있는 슬러그 또는 채널입니다" : error.message);
  }
  revalidatePath("/admin/confirm");
  return { ok: `크리에이터 "${d.displayName}" 생성됨` };
}

// ── 도시 ───────────────────────────────────────────────

export async function createCity(_: ActionResult, form: FormData): Promise<ActionResult> {
  const coords = parseLatLng(String(form.get("latlng") ?? ""));
  const parsed = z
    .object({
      slug: slugSchema,
      name: z.string().min(1, "도시 이름(한글)을 입력하세요"),
      nameEn: z.string().min(1, "도시 영문명을 입력하세요"),
      countryCode: z.string().length(2, "국가 코드는 2자 (예: JP)"),
    })
    .safeParse({
      slug: form.get("slug"),
      name: form.get("name"),
      nameEn: form.get("nameEn"),
      countryCode: form.get("countryCode"),
    });
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  if (!coords) return fail('도시 중심 좌표를 "위도, 경도" 형식으로 입력하세요');
  const d = parsed.data;

  const { error } = await getSupabaseAdmin().from("cities").insert({
    slug: d.slug,
    name: d.name,
    name_en: d.nameEn,
    country_code: d.countryCode.toUpperCase(),
    lat: coords.lat,
    lng: coords.lng,
  });
  if (error) {
    return fail(isUniqueViolation(error.message) ? "이미 있는 도시 슬러그입니다" : error.message);
  }
  revalidatePath("/admin/confirm");
  return { ok: `도시 "${d.name}" 생성됨` };
}

// ── 영상 ───────────────────────────────────────────────

export async function createVideo(_: ActionResult, form: FormData): Promise<ActionResult> {
  const creatorId = String(form.get("creatorId") ?? "");
  const url = String(form.get("url") ?? "");
  const title = String(form.get("title") ?? "").trim();

  if (!creatorId) return fail("크리에이터를 먼저 선택하세요");
  const videoId = parseYoutubeId(url);
  if (!videoId) return fail("YouTube URL 또는 11자 영상 ID를 인식하지 못했습니다");
  if (!title) return fail("영상 제목을 입력하세요");

  const { error } = await getSupabaseAdmin().from("videos").insert({
    creator_id: creatorId,
    youtube_video_id: videoId,
    title,
  });
  if (error) {
    return fail(isUniqueViolation(error.message) ? "이미 등록된 영상입니다" : error.message);
  }
  revalidatePath("/admin/confirm");
  return { ok: `영상 등록됨 (${videoId})` };
}

// ── 조각 통계 재계산 ────────────────────────────────────

/** creator×city 의 place_count 를 재계산하고 creator_cities 를 upsert 한다. */
async function recountPiece(creatorId: string, cityId: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: videos } = await db.from("videos").select("id").eq("creator_id", creatorId);
  const videoIds = (videos ?? []).map((v) => v.id);

  let placeIds: string[] = [];
  if (videoIds.length > 0) {
    const { data: links } = await db
      .from("video_places")
      .select("place_id")
      .in("video_id", videoIds);
    placeIds = [...new Set((links ?? []).map((l) => l.place_id))];
  }

  let count = 0;
  if (placeIds.length > 0) {
    const { count: c } = await db
      .from("places")
      .select("id", { count: "exact", head: true })
      .in("id", placeIds)
      .eq("city_id", cityId);
    count = c ?? 0;
  }

  await db
    .from("creator_cities")
    .upsert({ creator_id: creatorId, city_id: cityId, place_count: count });

  // 크리에이터 전체 통계 캐시 갱신 — 홈 카드가 이 값을 읽는다 (런타임 집계 금지 원칙)
  const { data: pieces } = await db
    .from("creator_cities")
    .select("place_count")
    .eq("creator_id", creatorId);
  const totalPlaces = (pieces ?? []).reduce((sum, p) => sum + p.place_count, 0);
  const cityCount = (pieces ?? []).filter((p) => p.place_count > 0).length;
  const { count: videoCount } = await db
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorId);
  await db
    .from("creators")
    .update({ place_count: totalPlaces, city_count: cityCount, video_count: videoCount ?? 0 })
    .eq("id", creatorId);
}

// ── 장소 ───────────────────────────────────────────────

export async function createPlace(_: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      creatorId: z.string().min(1, "크리에이터를 선택하세요"),
      cityId: z.string().min(1, "도시를 선택하세요"),
      videoId: z.string().min(1, "출처 영상을 선택하세요 — 출처 없는 장소는 공개할 수 없습니다"),
      slug: slugSchema,
      name: z.string().min(1, "장소 이름을 입력하세요"),
      placeType: z.enum([
        "restaurant",
        "cafe",
        "attraction",
        "hotel",
        "bar",
        "shop",
        "viewpoint",
        "other",
        "unknown",
      ]),
      countryCode: z.string().length(2),
      mapStatus: z.enum(["confirmed", "candidate"]),
    })
    .safeParse({
      creatorId: form.get("creatorId"),
      cityId: form.get("cityId"),
      videoId: form.get("videoId"),
      slug: form.get("slug"),
      name: form.get("name"),
      placeType: form.get("placeType"),
      countryCode: form.get("countryCode"),
      mapStatus: form.get("mapStatus"),
    });
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  const d = parsed.data;

  const nameLocal = String(form.get("nameLocal") ?? "").trim() || null;
  const address = String(form.get("address") ?? "").trim() || null;
  const sourceNote = String(form.get("sourceNote") ?? "").trim() || null;
  // 지도 앱 딥링크 — 운영자는 링크를 붙여넣는 게 자연스러우므로 URL/ID 둘 다 받는다.
  // 구글: 공유 링크(가게 페이지로 열림)가 최우선, ChIJ… 는 place_id 로 저장.
  const googleRaw = String(form.get("googleMaps") ?? "").trim();
  const googleMapsUrl = /^https?:\/\//.test(googleRaw) ? googleRaw : null;
  const googlePlaceId = !googleMapsUrl && googleRaw ? googleRaw : null;
  // 카카오/네이버: URL 이면 숫자 ID 를 추출, 아니면 입력값 그대로 ID 로.
  const kakaoRaw = String(form.get("kakaoPlace") ?? "").trim();
  const kakaoPlaceId = kakaoRaw
    ? (kakaoRaw.match(/place\.map\.kakao\.com\/(\d+)/)?.[1] ?? kakaoRaw)
    : null;
  const naverRaw = String(form.get("naverPlace") ?? "").trim();
  const naverPlaceId = naverRaw
    ? (naverRaw.match(/(?:place|entry\/place)\/(\d+)/)?.[1] ?? naverRaw)
    : null;
  const latlngRaw = String(form.get("latlng") ?? "").trim();
  let coords = latlngRaw ? parseLatLng(latlngRaw) : null;
  const timestampRaw = String(form.get("timestamp") ?? "").trim();
  const timestampSec = parseTimestamp(timestampRaw);

  if (latlngRaw && !coords) return fail('좌표는 "위도, 경도" 형식입니다 (예: 35.6812, 139.7671)');
  if (timestampRaw && timestampSec === null) return fail('타임스탬프는 "12:40" 또는 초 단위 숫자');

  // 구글에 등록된 가게면 좌표를 손으로 안 넣어도 된다 — 공유 링크에서 자동 해석
  if (!coords && googleMapsUrl) coords = await resolveGoogleCoords(googleMapsUrl);

  // ★ 확정 잠금 (docs/ADMIN.md 5장 / LEGAL.md 4.6)
  if (d.mapStatus === "confirmed") {
    if (!coords) {
      return fail(
        "확정하려면 좌표가 필요합니다 — 구글 공유 링크(maps.app.goo.gl)를 넣으면 자동으로 채워집니다",
      );
    }
    if (!sourceNote) {
      return fail("확정하려면 근거가 필요합니다 (영상 속 간판 / 지역 언급 / 타임스탬프)");
    }
  }

  const db = getSupabaseAdmin();
  const { data: place, error } = await db
    .from("places")
    .insert({
      slug: d.slug,
      name: d.name,
      name_local: nameLocal,
      city_id: d.cityId,
      country_code: d.countryCode.toUpperCase(),
      place_type: d.placeType,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      address,
      google_place_id: googlePlaceId,
      google_maps_url: googleMapsUrl,
      kakao_place_id: kakaoPlaceId,
      naver_place_id: naverPlaceId,
      map_status: d.mapStatus,
      is_published: d.mapStatus === "confirmed", // 확정 = 공개 (updatePlace 와 동일 규칙)
      source_note: sourceNote,
    })
    .select("id")
    .single();
  if (error || !place) {
    return fail(
      error && isUniqueViolation(error.message)
        ? "이미 있는 장소 슬러그입니다"
        : (error?.message ?? "저장 실패"),
    );
  }

  const { error: linkError } = await db.from("video_places").insert({
    video_id: d.videoId,
    place_id: place.id,
    timestamp_sec: timestampSec,
  });
  if (linkError) {
    // 링크 실패 시 장소만 남는 고아를 만들지 않는다
    await db.from("places").delete().eq("id", place.id);
    return fail(`영상 연결 실패: ${linkError.message}`);
  }

  await recountPiece(d.creatorId, d.cityId);
  revalidatePath("/admin/confirm");
  revalidatePath("/admin");
  return { ok: `"${d.name}" ${d.mapStatus === "confirmed" ? "확정" : "보류"} 저장됨` };
}

/** 기존 장소 수정 — 후보(candidate)를 검수해 확정으로 올리는 핵심 경로. */
export async function updatePlace(_: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      placeId: z.string().min(1, "잘못된 요청"),
      creatorId: z.string().min(1, "잘못된 요청"),
      cityId: z.string().min(1, "잘못된 요청"),
      name: z.string().min(1, "장소 이름을 입력하세요"),
      placeType: z.enum([
        "restaurant",
        "cafe",
        "attraction",
        "hotel",
        "bar",
        "shop",
        "viewpoint",
        "other",
        "unknown",
      ]),
      mapStatus: z.enum(["confirmed", "candidate"]),
    })
    .safeParse({
      placeId: form.get("placeId"),
      creatorId: form.get("creatorId"),
      cityId: form.get("cityId"),
      name: form.get("name"),
      placeType: form.get("placeType"),
      mapStatus: form.get("mapStatus"),
    });
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  const d = parsed.data;

  const nameLocal = String(form.get("nameLocal") ?? "").trim() || null;
  const address = String(form.get("address") ?? "").trim() || null;
  const sourceNote = String(form.get("sourceNote") ?? "").trim() || null;
  const googleRaw = String(form.get("googleMaps") ?? "").trim();
  const googleMapsUrl = /^https?:\/\//.test(googleRaw) ? googleRaw : null;
  const googlePlaceId = !googleMapsUrl && googleRaw ? googleRaw : null;
  const kakaoRaw = String(form.get("kakaoPlace") ?? "").trim();
  const kakaoPlaceId = kakaoRaw
    ? (kakaoRaw.match(/place\.map\.kakao\.com\/(\d+)/)?.[1] ?? kakaoRaw)
    : null;
  const naverRaw = String(form.get("naverPlace") ?? "").trim();
  const naverPlaceId = naverRaw
    ? (naverRaw.match(/(?:place|entry\/place)\/(\d+)/)?.[1] ?? naverRaw)
    : null;
  const latlngRaw = String(form.get("latlng") ?? "").trim();
  let coords = latlngRaw ? parseLatLng(latlngRaw) : null;
  const timestampRaw = String(form.get("timestamp") ?? "").trim();
  const timestampSec = parseTimestamp(timestampRaw);

  if (latlngRaw && !coords) return fail('좌표는 "위도, 경도" 형식입니다 (예: 35.6812, 139.7671)');
  if (timestampRaw && timestampSec === null) return fail('타임스탬프는 "12:40" 또는 초 단위 숫자');

  // 구글에 등록된 가게면 좌표를 손으로 안 넣어도 된다 — 공유 링크에서 자동 해석
  if (!coords && googleMapsUrl) coords = await resolveGoogleCoords(googleMapsUrl);

  // ★ 확정 잠금 (docs/ADMIN.md 5장 / LEGAL.md 4.6) — 수정 경로에서도 동일하게 적용
  if (d.mapStatus === "confirmed") {
    if (!coords) {
      return fail(
        "확정하려면 좌표가 필요합니다 — 구글 공유 링크(maps.app.goo.gl)를 넣으면 자동으로 채워집니다",
      );
    }
    if (!sourceNote) {
      return fail("확정하려면 근거가 필요합니다 (영상 속 간판 / 지역 언급 / 타임스탬프)");
    }
  }

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("places")
    .update({
      name: d.name,
      name_local: nameLocal,
      place_type: d.placeType,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      address,
      google_place_id: googlePlaceId,
      google_maps_url: googleMapsUrl,
      kakao_place_id: kakaoPlaceId,
      naver_place_id: naverPlaceId,
      map_status: d.mapStatus,
      // 확정 = 공개 — 조각 단위 공개 게이트(/admin/publish)가 생기기 전까지의 운영 규칙.
      // RLS 가 is_published 만 익명에 노출하므로 이 동기화가 없으면 확정해도 웹에 안 뜬다.
      is_published: d.mapStatus === "confirmed",
      source_note: sourceNote,
    })
    .eq("id", d.placeId);
  if (error) return fail(error.message);

  // 언급 타임스탬프는 video_places 에 산다 — 이 장소의 링크(통상 1개)를 갱신
  if (timestampRaw) {
    await db.from("video_places").update({ timestamp_sec: timestampSec }).eq("place_id", d.placeId);
  }

  // 조각·크리에이터 통계 갱신 (홈 카드·도시 칩이 이 값을 읽는다)
  await recountPiece(d.creatorId, d.cityId);

  revalidatePath("/admin/confirm");
  revalidatePath("/admin");
  revalidatePath("/", "layout"); // 공개 화면(홈·조각) ISR 즉시 갱신
  return { ok: `"${d.name}" ${d.mapStatus === "confirmed" ? "확정·공개" : "보류(비공개)"}로 수정됨` };
}

// deletePlace 는 `admin/actions.ts` 의 deletePlaceById 로 옮겼다 —
// 목록 화면(/admin/places)에서 부르고, 통계 재계산도 recount_stats() 하나로 통일했다.
