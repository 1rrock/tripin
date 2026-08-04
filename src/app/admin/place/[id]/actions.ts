"use server";

/**
 * /admin/place/[id] 요약 에디터 서버 액션 (docs/ADMIN.md 6장).
 *
 * 검사는 전부 "경고"이고 저장을 막지 않는다 — 판단은 사람이 한다.
 * 자막 대조 검사는 자막을 일시 조회만 하고 어디에도 저장하지 않는다(LEGAL.md 3.3).
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/shared/api/supabase";

export interface SaveResult {
  ok?: string;
  error?: string;
}

export async function savePlaceSummary(_: SaveResult, form: FormData): Promise<SaveResult> {
  const parsed = z
    .object({ placeId: z.string().min(1, "잘못된 요청") })
    .safeParse({ placeId: form.get("placeId") });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const placeId = parsed.data.placeId;

  const bullets = form
    .getAll("bullet")
    .map((b) => String(b).trim())
    .filter(Boolean);
  if (bullets.length === 0) return { error: "불릿을 1개 이상 입력하세요" };

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
  // 공개 조각 페이지도 즉시 갱신 (ISR 1시간을 기다리지 않게)
  const publicPath = String(form.get("publicPath") ?? "").trim();
  if (publicPath.startsWith("/c/")) revalidatePath(publicPath);

  return { ok: `요약 ${bullets.length}개 불릿 저장됨` };
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

/** 공백 차이를 무시하고 비교하기 위한 정규화. */
function squash(text: string): string {
  return text.replace(/\s+/g, "");
}

export async function checkTranscriptOverlap(
  youtubeVideoId: string,
  bullets: string[],
): Promise<TranscriptCheck> {
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

    const body = await (
      await fetch(track.baseUrl + "&fmt=json3", { headers: { "user-agent": IOS_UA }, cache: "no-store" })
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
