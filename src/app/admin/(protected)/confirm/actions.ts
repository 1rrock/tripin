"use server";

/**
 * /admin/confirm 서버 액션 — 손입력·후보 수정 보조 경로.
 *
 * 대량 수집은 scripts/ingest·Orca 동기화. 여기는 수동 보정·확정.
 * 보호: proxy.ts 가 /admin/* POST(서버 액션 포함)에 쿠키를 요구한다.
 *
 * 확정 잠금(docs/ADMIN.md 5장): confirmed 는 좌표 + 근거(source_note) 없이 저장 불가.
 */

import { revalidatePath } from "next/cache";
import { purgePublicData } from "@/shared/api/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { isNaverShortLink, parseKakaoPlaceId, parseNaverPlaceId } from "@/shared/lib/place-link-id";
import { resolveGoogleCoords } from "@/shared/lib/resolve-google-place";
import { resolveNaverPlace, type NaverPlaceInfo } from "@/shared/lib/resolve-naver-place";
import { requireAdmin } from "@/shared/lib/require-admin";
import type { ActionResult } from "../_lib/action-result";


const slugSchema = z
  .string()
  .min(2, "슬러그는 2자 이상")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "슬러그는 영소문자·숫자·하이픈만 (예: marushichi-tonkatsu)");

/**
 * 수정 결과에는 **저장 직후의 `updated_at`** 이 같이 실려 나간다.
 * 폼이 그 값을 hidden 에 되받아야 같은 탭에서 연속으로 저장할 때
 * 자기 자신과 낙관적 잠금 충돌이 나지 않는다 (updatePlace 주석 참조).
 */
export interface UpdatePlaceResult extends ActionResult {
  updatedAt?: string;
}

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

/**
 * 카카오/네이버 장소 링크 입력을 ID 로 바꾼다. insertPlace·updatePlace 양쪽에서 씀.
 * 매치 실패 시 (place-link-id.ts 규칙대로) 절대 입력값을 그대로 저장하지 않고,
 * 저장을 막는 에러 메시지를 돌려준다 — 깨진 딥링크가 유저 화면에 노출되는 걸 막기 위함.
 */
function parseMapLinkIds(
  kakaoRaw: string,
  naverRaw: string,
): { kakaoPlaceId: string | null; naverPlaceId: string | null } | { error: string } {
  let kakaoPlaceId: string | null = null;
  if (kakaoRaw) {
    kakaoPlaceId = parseKakaoPlaceId(kakaoRaw);
    if (!kakaoPlaceId) {
      return {
        error:
          "카카오 장소 링크에서 ID를 못 찾았습니다 — place.map.kakao.com/{숫자} 형태나 숫자 ID 를 넣어주세요",
      };
    }
  }

  let naverPlaceId: string | null = null;
  if (naverRaw) {
    if (isNaverShortLink(naverRaw)) {
      return {
        error:
          "naver.me 단축 링크는 ID를 알 수 없습니다 — 링크를 브라우저에서 연 뒤 주소창의 m.place.naver.com/…/{숫자}/… 주소를 넣어주세요",
      };
    }
    naverPlaceId = parseNaverPlaceId(naverRaw);
    if (!naverPlaceId) {
      return {
        error:
          "네이버 장소 링크에서 ID를 못 찾았습니다 — map.naver.com/p/entry/place/… 또는 m.place.naver.com/…/{숫자}/… 형태나 숫자 ID 를 넣어주세요",
      };
    }
  }

  return { kakaoPlaceId, naverPlaceId };
}

// ── 크리에이터 ─────────────────────────────────────────

export async function createCreator(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
// 정의는 SQL `recount_stats`(공개 is_published 기준) 한 곳. TS 로컬 재계산은 쓰지 않는다.

async function recountStats(): Promise<void> {
  await getSupabaseAdmin().rpc("recount_stats");
}

// ── 장소 ───────────────────────────────────────────────

export async function createPlace(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
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
        "fishing",
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
  // 카카오/네이버: URL·ID 둘 다 받되, 매치 실패면 통째로 저장하지 않고 저장을 막는다.
  const kakaoRaw = String(form.get("kakaoPlace") ?? "").trim();
  const naverRaw = String(form.get("naverPlace") ?? "").trim();
  const linkIds = parseMapLinkIds(kakaoRaw, naverRaw);
  if ("error" in linkIds) return fail(linkIds.error);
  const { kakaoPlaceId, naverPlaceId } = linkIds;
  const latlngRaw = String(form.get("latlng") ?? "").trim();
  let coords = latlngRaw ? parseLatLng(latlngRaw) : null;
  const timestampRaw = String(form.get("timestamp") ?? "").trim();
  const timestampSec = parseTimestamp(timestampRaw);

  if (latlngRaw && !coords) return fail('좌표는 "위도, 경도" 형식입니다 (예: 35.6812, 139.7671)');
  if (timestampRaw && timestampSec === null) return fail('타임스탬프는 "12:40" 또는 초 단위 숫자');

  // 구글에 등록된 가게면 좌표를 손으로 안 넣어도 된다 — 공유 링크에서 자동 해석
  if (!coords && googleMapsUrl) coords = await resolveGoogleCoords(googleMapsUrl);
  // 구글도 없으면 네이버 장소 페이지에서 좌표·주소를 시도 — 사람이 쓴 주소는 안 건드린다
  let naverInfo: NaverPlaceInfo | null = null;
  if (!coords && naverPlaceId) {
    naverInfo = await resolveNaverPlace(naverPlaceId);
    if (naverInfo) coords = { lat: naverInfo.lat, lng: naverInfo.lng };
  }
  const finalAddress = address ?? naverInfo?.address ?? null;

  // ★ 확정 잠금 (docs/ADMIN.md 5장 / LEGAL.md 4.6)
  if (d.mapStatus === "confirmed") {
    if (!coords) {
      return fail(
        "확정하려면 좌표가 필요합니다 — 구글 공유 링크(maps.app.goo.gl)나 네이버 장소 링크를 넣으면 자동으로 채워집니다",
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
      address: finalAddress,
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

  await recountStats();
  revalidatePath("/admin/confirm");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  purgePublicData();
  return { ok: `"${d.name}" ${d.mapStatus === "confirmed" ? "확정" : "보류"} 저장됨` };
}

/**
 * 기존 장소 수정 — 후보(candidate)를 검수해 확정으로 올리는 핵심 경로.
 *
 * ⚠️ 낙관적 잠금. 이 폼은 **전체 필드**를 보내므로 조건 없는 update 는 탭 두 개가
 *    같은 장소를 열어 두기만 해도 서로를 덮는다 — 탭 A 가 좌표·근거를 채워 저장한 뒤
 *    탭 B 가 이름만 고쳐 저장하면 A 의 좌표·근거·지도 링크가 B 가 들고 있던 옛 빈 값으로
 *    되돌아가고(확정 잠금까지 풀린다) 두 저장 다 초록 "수정됨"이 뜬다.
 *    그래서 폼이 실어 보낸 `updatedAt` 을 조건에 걸고, 0행이면 실패로 돌려준다.
 *    (`places_touch` BEFORE UPDATE 트리거가 있어 `updated_at` 은 실제로 움직인다.)
 */
export async function updatePlace(
  _: UpdatePlaceResult,
  form: FormData,
): Promise<UpdatePlaceResult> {
  await requireAdmin();
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
        "fishing",
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
  /**
   * ⚠️ 구글은 **URL 과 place_id 를 각각** 받는다. 예전에는 한 칸이었고
   *    "URL 이면 url, 아니면 place_id" 로 갈랐다 — 둘 다 있는 1,300행을 한 번만
   *    수정해도 `google_place_id` 가 null 로 덮였다. 공개 링크는 URL 우선이라
   *    (`shared/lib/map-links.ts`) 즉시 깨지진 않지만, 잃는 건 **안정 식별자**다:
   *    공유 URL 이 만료되면 폴백이 없고, 오확정 검토 중인 그룹의 대조 키가 사라진다.
   *    칸을 비우면 여전히 null 이 된다 — 사람이 일부러 지우는 길은 남긴다.
   */
  const googleRaw = String(form.get("googleMaps") ?? "").trim();
  if (googleRaw && !/^https?:\/\//.test(googleRaw)) {
    return fail("구글 공유 링크 칸에는 http(s) 주소만 넣으세요 — ChIJ… 는 아래 place_id 칸입니다");
  }
  const googleMapsUrl = googleRaw || null;
  const googlePlaceId = String(form.get("googlePlaceId") ?? "").trim() || null;
  const kakaoRaw = String(form.get("kakaoPlace") ?? "").trim();
  const naverRaw = String(form.get("naverPlace") ?? "").trim();
  const linkIds = parseMapLinkIds(kakaoRaw, naverRaw);
  if ("error" in linkIds) return fail(linkIds.error);
  const { kakaoPlaceId, naverPlaceId } = linkIds;
  const latlngRaw = String(form.get("latlng") ?? "").trim();
  let coords = latlngRaw ? parseLatLng(latlngRaw) : null;
  const timestampRaw = String(form.get("timestamp") ?? "").trim();
  const timestampSec = parseTimestamp(timestampRaw);
  // 타임스탬프가 어느 영상의 것인지 — 폼이 지금 보고 있는 출처 영상
  const videoId = String(form.get("videoId") ?? "").trim();
  // 낙관적 잠금 기준 시각 — 폼이 렌더될 때의 places.updated_at
  const expectedUpdatedAt = String(form.get("updatedAt") ?? "").trim();

  if (latlngRaw && !coords) return fail('좌표는 "위도, 경도" 형식입니다 (예: 35.6812, 139.7671)');
  if (timestampRaw && timestampSec === null) return fail('타임스탬프는 "12:40" 또는 초 단위 숫자');

  // 구글에 등록된 가게면 좌표를 손으로 안 넣어도 된다 — 공유 링크에서 자동 해석
  if (!coords && googleMapsUrl) coords = await resolveGoogleCoords(googleMapsUrl);
  // 구글도 없으면 네이버 장소 페이지에서 좌표·주소를 시도 — 사람이 쓴 주소는 안 건드린다
  let naverInfo: NaverPlaceInfo | null = null;
  if (!coords && naverPlaceId) {
    naverInfo = await resolveNaverPlace(naverPlaceId);
    if (naverInfo) coords = { lat: naverInfo.lat, lng: naverInfo.lng };
  }
  const finalAddress = address ?? naverInfo?.address ?? null;

  // ★ 확정 잠금 (docs/ADMIN.md 5장 / LEGAL.md 4.6) — 수정 경로에서도 동일하게 적용
  if (d.mapStatus === "confirmed") {
    if (!coords) {
      return fail(
        "확정하려면 좌표가 필요합니다 — 구글 공유 링크(maps.app.goo.gl)나 네이버 장소 링크를 넣으면 자동으로 채워집니다",
      );
    }
    if (!sourceNote) {
      return fail("확정하려면 근거가 필요합니다 (영상 속 간판 / 지역 언급 / 타임스탬프)");
    }
  }

  const db = getSupabaseAdmin();
  // 기존 공개 플래그 유지 — confirmed→confirmed 수정이 "내리기/임시조치"를 되돌리면 안 된다.
  // 승격(candidate→confirmed) 또는 신규 확정 저장 시에만 is_published=true.
  const { data: prev } = await db
    .from("places")
    .select("map_status, is_published")
    .eq("id", d.placeId)
    .single();
  if (!prev) return fail("장소를 찾을 수 없습니다 — 이미 삭제됐을 수 있습니다");
  let nextPublished: boolean;
  if (d.mapStatus === "candidate") {
    nextPublished = false;
  } else if (prev.map_status === "confirmed") {
    nextPublished = prev.is_published; // 이미 확정이면 수동 비공개 유지
  } else {
    nextPublished = true; // 후보 → 확정 승격
  }

  let write = db
    .from("places")
    .update({
      name: d.name,
      name_local: nameLocal,
      place_type: d.placeType,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      address: finalAddress,
      google_place_id: googlePlaceId,
      google_maps_url: googleMapsUrl,
      kakao_place_id: kakaoPlaceId,
      naver_place_id: naverPlaceId,
      map_status: d.mapStatus,
      is_published: nextPublished,
      source_note: sourceNote,
    })
    .eq("id", d.placeId);
  // 폼이 화면을 그릴 때의 updated_at — 그 사이 다른 곳에서 저장됐으면 0행이 된다
  if (expectedUpdatedAt) write = write.eq("updated_at", expectedUpdatedAt);
  const { data: saved, error } = await write.select("updated_at").maybeSingle();
  if (error) return fail(error.message);
  if (!saved) {
    return fail(
      "다른 곳에서 먼저 저장됐습니다 — 새로고침해서 최신 값을 확인한 뒤 다시 수정하세요 (이 저장은 반영되지 않았습니다)",
    );
  }

  // 언급 타임스탬프는 video_places 에 산다.
  // ⚠️ **그 영상의 링크만** 갱신한다. 예전 주석은 "통상 1개"라고 했지만 실제로는
  //    143곳이 2편 이상에 걸려 있어, place_id 로만 지우면 한 영상 기준 타임코드가
  //    나머지 영상에도 박혔다.
  if (timestampRaw) {
    if (!videoId) {
      return fail("타임스탬프를 저장할 출처 영상을 알 수 없습니다 — 장소 정보는 저장됐습니다");
    }
    const { error: tsError } = await db
      .from("video_places")
      .update({ timestamp_sec: timestampSec })
      .eq("place_id", d.placeId)
      .eq("video_id", videoId);
    if (tsError) return fail(`타임스탬프 저장 실패: ${tsError.message} (장소 정보는 저장됐습니다)`);
  }

  await recountStats();

  revalidatePath("/admin/confirm");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  purgePublicData();
  const label =
    d.mapStatus === "confirmed"
      ? nextPublished
        ? "확정·공개"
        : "확정(비공개 유지)"
      : "보류(비공개)";
  // 새 updated_at 을 폼에 돌려준다 — 안 돌려주면 같은 탭의 두 번째 저장이 자기 자신과 충돌한다
  return { ok: `"${d.name}" ${label}로 수정됨`, updatedAt: saved.updated_at };
}

// deletePlace 는 `admin/actions.ts` 의 deletePlaceById 로 옮겼다 —
// 목록 화면(/admin/places)에서 부르고, 통계 재계산도 recount_stats() 하나로 통일했다.
