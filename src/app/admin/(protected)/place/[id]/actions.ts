"use server";

/**
 * /admin/place/[id] 요약 에디터 서버 액션 (docs/ADMIN.md 6장).
 *
 * 검사는 전부 "경고"이고 저장을 막지 않는다 — 판단은 사람이 한다.
 * 자막 대조 검사는 자막을 일시 조회만 하고 어디에도 저장하지 않는다(LEGAL.md 3.3).
 */

import { revalidatePath } from "next/cache";
import { purgePublicData } from "@/shared/api/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { requireAdmin } from "@/shared/lib/require-admin";

export interface SaveResult {
  ok?: string;
  error?: string;
}

export async function savePlaceSummary(_: SaveResult, form: FormData): Promise<SaveResult> {
  await requireAdmin();
  const parsed = z
    .object({ placeId: z.string().min(1, "잘못된 요청") })
    .safeParse({ placeId: form.get("placeId") });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const placeId = parsed.data.placeId;

  const bullets = form
    .getAll("bullet")
    .map((b) => String(b).trim())
    .filter(Boolean);
  // 빈 저장은 여전히 막는다 — 실수로 비우는 경로다. 일부러 지우는 건 clearPlaceSummary.
  if (bullets.length === 0) {
    return { error: "불릿을 1개 이상 입력하세요 — 정말 지우려면 아래 '요약 지우기'를 쓰세요" };
  }

  // 가격·영업 정보에는 촬영 시점 표기가 자동으로 붙는다 — 오정보 리스크 완화 (LEGAL.md 4.6)
  let priceHint = String(form.get("priceHint") ?? "").trim() || null;
  const shotYm = String(form.get("shotYm") ?? "").trim(); // 페이지가 영상 published_at 에서 계산
  if (priceHint && !priceHint.includes("촬영 시점")) {
    priceHint = `${priceHint} (영상 촬영 시점${shotYm ? `(${shotYm})` : ""} 기준)`;
  }

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("places")
    .update({ summary_bullets: bullets, price_hint: priceHint })
    .eq("id", placeId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/confirm");
  revalidatePath(`/admin/place/${placeId}`);
  // 요약·가격은 공개 화면에 그대로 나간다 — 로더 캐시를 비워야 1시간을 안 기다린다
  purgePublicData();
  const publicPath = String(form.get("publicPath") ?? "").trim();
  if (publicPath.startsWith("/c/")) revalidatePath(publicPath);

  return { ok: `요약 ${bullets.length}개 불릿 저장됨` };
}

/**
 * 요약을 **일부러** 비운다 — 잘못 쓴 요약을 되돌리는 유일한 길.
 *
 * 저장 액션이 불릿 0개를 거부하는 건 실수로 비우는 걸 막기 위해서지, 지울 수 없어야
 * 한다는 뜻이 아니었다. 그동안 어드민에서 잘못 쓴 요약을 내릴 방법이 아예 없었다.
 * 실수와 구분하려고 별도 액션 + 화면의 2단계 확인으로 둔다.
 *
 * 불릿과 문단을 함께 비운다 — 둘 중 하나라도 남으면 "요약 있음"(_lib/shared.ts
 * `hasSummary`)이라 미작성 큐로도 안 돌아오고 공개 화면에도 반쪽이 남는다.
 * 가격 정보는 건드리지 않는다(그건 칸을 비우고 저장하면 지워진다).
 */
export async function clearPlaceSummary(placeId: string, publicPath: string): Promise<SaveResult> {
  await requireAdmin();
  if (!placeId) return { error: "잘못된 요청" };

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("places")
    .update({ summary_bullets: [], summary: null })
    .eq("id", placeId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "장소를 찾을 수 없습니다 — 이미 삭제됐을 수 있습니다" };

  revalidatePath("/admin");
  revalidatePath("/admin/confirm");
  revalidatePath(`/admin/place/${placeId}`);
  purgePublicData();
  if (publicPath.startsWith("/c/")) revalidatePath(publicPath);

  return { ok: "요약을 지웠습니다 — 이 장소는 다시 '요약 없음'입니다" };
}

/**
 * 자막 복붙 감지 — 불릿과 영상 자막의 12자 이상 연속 일치를 찾는다 (CONCEPT.md 7.3).
 *
 * ⚠️ 자막은 메모리에서 대조만 하고 반환하지 않는다. DB·파일 저장 금지.
 *    유튜브 조회가 실패하면 "검사 불가"로 알리고 저장은 막지 않는다.
 */
const IOS_UA = "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)";
const IOS_CONTEXT = {
  client: {
    clientName: "IOS",
    clientVersion: "20.10.4",
    deviceMake: "Apple",
    deviceModel: "iPhone16,2",
    osName: "iPhone",
    osVersion: "18.3.2.22D82",
    hl: "ko",
  },
};

interface TranscriptCheck {
  status: "ok" | "unavailable";
  /** 12자 이상 일치가 발견된 불릿 인덱스와 일치 구간. */
  overlaps: { bulletIndex: number; snippet: string }[];
  note?: string;
}

const MIN_MATCH = 12;

/**
 * 자막 트랙 URL 은 유튜브 응답이 준 값이라 우리가 만든 문자열이 아니다 —
 * 그대로 페치하면 응답이 가리키는 아무 호스트로나 서버가 요청을 나간다.
 * 인증된 어드민만 트리거하고 대상도 사실상 고정이지만, 호스트를 못 박아 둔다.
 */
const CAPTION_HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com"]);

function captionUrl(baseUrl: string): string | null {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || !CAPTION_HOSTS.has(url.hostname)) return null;
    url.searchParams.set("fmt", "json3");
    return url.toString();
  } catch {
    return null;
  }
}

/** 공백 차이를 무시하고 비교하기 위한 정규화. */
function squash(text: string): string {
  return text.replace(/\s+/g, "");
}

export async function checkTranscriptOverlap(
  youtubeVideoId: string,
  bullets: string[],
): Promise<TranscriptCheck> {
  await requireAdmin();
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": IOS_UA },
      body: JSON.stringify({
        context: IOS_CONTEXT,
        videoId: youtubeVideoId,
        contentCheckOk: true,
        racyCheckOk: true,
      }),
      cache: "no-store",
    });
    if (!res.ok) return { status: "unavailable", overlaps: [], note: `자막 조회 실패 (${res.status})` };
    const data = await res.json();
    const tracks: { baseUrl?: string; languageCode?: string; kind?: string }[] =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    const track =
      tracks.find((t) => t.languageCode === "ko" && t.kind !== "asr") ??
      tracks.find((t) => t.languageCode === "ko") ??
      tracks[0];
    if (!track?.baseUrl) return { status: "unavailable", overlaps: [], note: "자막 트랙 없음" };

    const url = captionUrl(track.baseUrl);
    if (!url) return { status: "unavailable", overlaps: [], note: "자막 트랙 주소가 유튜브가 아님" };

    const body = await (
      await fetch(url, { headers: { "user-agent": IOS_UA }, cache: "no-store" })
    ).text();
    if (!body) return { status: "unavailable", overlaps: [], note: "자막 응답 없음" };
    const timed = JSON.parse(body) as { events?: { segs?: { utf8?: string }[] }[] };

    const transcript = squash(
      (timed.events ?? [])
        .flatMap((ev) => ev.segs ?? [])
        .map((s) => s.utf8 ?? "")
        .join(""),
    );

    const overlaps: TranscriptCheck["overlaps"] = [];
    bullets.forEach((bullet, bulletIndex) => {
      const b = squash(bullet);
      for (let i = 0; i + MIN_MATCH <= b.length; i++) {
        const window = b.slice(i, i + MIN_MATCH);
        if (transcript.includes(window)) {
          // 일치 구간을 오른쪽으로 최대한 확장해 보여준다
          let end = i + MIN_MATCH;
          while (end < b.length && transcript.includes(b.slice(i, end + 1))) end++;
          overlaps.push({ bulletIndex, snippet: b.slice(i, end) });
          break; // 불릿당 첫 일치만 보고
        }
      }
    });
    return { status: "ok", overlaps };
  } catch {
    return { status: "unavailable", overlaps: [], note: "자막 조회 중 오류" };
  }
}
