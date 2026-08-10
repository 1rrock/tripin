import { getSupabaseAdmin } from "@/shared/api/supabase";
import { purgePublicData } from "@/shared/api/cache";
import { serverEnv } from "@/shared/config/env";

/**
 * 30일 갱신 배치 — YouTube 유래 메타를 다시 받아 온다.
 *
 * **이건 기능이 아니라 정책 요건이다.** YouTube API Developer Policies §III.E.4.d 는
 * Non-Authorized Data 를 30일 넘게 보관하지 못하게 한다. 우리가 그 범주로 들고 있는 값:
 *
 *   videos.title / published_at / duration_sec   → videos.api_fetched_at
 *   creators.display_name / avatar_url           → creators.api_fetched_at
 *
 * 영상 썸네일은 여기 없다 — youtube_video_id 에서 URL 을 유도하므로(shared/lib/youtube.ts)
 * 애초에 저장하지 않는다. 채널 아바타 URL 은 해시라 유도할 수 없어 저장이 불가피하고,
 * 그래서 이 배치의 대상이다.
 *
 * ── 쿼터 ──────────────────────────────────────────────────────────
 * videos.list 는 호출당 1 unit 이고 id 를 50개까지 받는다. channels.list 도 1 unit.
 * 영상 수백 편 규모여도 하루 10,000 unit 한도에 전혀 근접하지 않는다.
 * search.list(100 units)는 쓰지 않는다 (INGEST.md 2장).
 *
 * ── 사라진 영상 ───────────────────────────────────────────────────
 * 삭제·비공개된 영상은 응답에서 빠진다. 그런 영상의 메타는 **갱신할 방법이 없으므로**
 * 보관하면 그 순간부터 위반이다. 다만 지우면 video_places 가 cascade 로 함께 지워져
 * 장소가 출처를 잃는다(장소 자체는 우리 큐레이션이라 남는다). 파급이 있는 삭제라
 * 기본 동작은 **보고만 하고**, 실제 삭제는 `?purge=1` 을 명시했을 때만 한다.
 * 첫 운영에서는 dry 결과를 보고 사람이 판단하라는 뜻이다.
 *
 * ── 호출 ──────────────────────────────────────────────────────────
 *   GET /api/cron/refresh-youtube-meta            갱신 + 사라진 영상 보고
 *   GET /api/cron/refresh-youtube-meta?purge=1    + 사라진 영상 삭제
 *   헤더: Authorization: Bearer $CRON_SECRET
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 30일 한도에 5일 여유를 둔다 — 크론이 며칠 밀려도 위반이 되지 않게.
 *
 * 이 여유는 **크론이 매일 돌 때만** 여유다(`vercel.json`). 월 1회로 두면 31일인 달마다
 * 한도를 넘는다: 1/1 03:05 에 갱신한 행이 2/1 03:00 실행 시점에 이미 30일 23시간이다.
 */
const STALE_DAYS = 25;
/** videos.list 가 한 번에 받는 id 개수 상한. */
const ID_BATCH = 50;

const API = "https://www.googleapis.com/youtube/v3";

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** ISO 8601 duration(PT1H2M3S) → 초. 파싱 실패는 null 로 두고 값을 지우지 않는다. */
function parseDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const [, d, h, min, s] = m;
  return (
    Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0)
  );
}

interface YouTubeVideoItem {
  id: string;
  snippet?: { title?: string; publishedAt?: string };
  contentDetails?: { duration?: string };
}

interface YouTubeChannelItem {
  id: string;
  snippet?: { title?: string; thumbnails?: Record<string, { url?: string } | undefined> };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`YouTube API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export async function GET(request: Request) {
  try {
    return await run(request);
  } catch (e) {
    // 크론은 사람이 안 보는 자리에서 돈다. 스택만 남기면 다음 달에도 같은 이유로 조용히
    // 실패한다 — 원인을 응답 본문에 실어 스케줄러 로그에서 바로 읽히게 한다.
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ error: message }, { status: 500 });
  }
}

async function run(request: Request) {
  // 스케줄러만 부를 수 있어야 한다. CRON_SECRET 미설정이면 requireServer 가 throw 해서
  // 라우트가 열린 채로 뜨지 않는다.
  if (request.headers.get("authorization") !== `Bearer ${serverEnv.cronSecret()}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const purge = new URL(request.url).searchParams.get("purge") === "1";
  const key = serverEnv.youtubeApiKey();
  const db = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
  const now = new Date().toISOString();

  const report = {
    cutoff,
    videos: { checked: 0, refreshed: 0, missing: [] as string[], purged: 0 },
    creators: { checked: 0, refreshed: 0, failed: [] as string[] },
    orphanedPlaces: [] as string[],
    quotaUnits: 0,
  };

  // ── 영상 ────────────────────────────────────────────────────────
  const { data: staleVideos, error: vErr } = await db
    .from("videos")
    .select("id, youtube_video_id")
    .lt("api_fetched_at", cutoff);
  if (vErr) return Response.json({ error: vErr.message }, { status: 500 });

  report.videos.checked = staleVideos?.length ?? 0;

  for (const batch of chunk(staleVideos ?? [], ID_BATCH)) {
    const ids = batch.map((v) => v.youtube_video_id).join(",");
    const data = await fetchJson<{ items?: YouTubeVideoItem[] }>(
      `${API}/videos?part=snippet,contentDetails&id=${encodeURIComponent(ids)}&key=${key}`,
    );
    report.quotaUnits += 1;

    const byId = new Map((data.items ?? []).map((it) => [it.id, it]));
    for (const row of batch) {
      const item = byId.get(row.youtube_video_id);
      if (!item) {
        // 응답에 없다 = 삭제·비공개. 갱신할 수 없으므로 보관하면 위반이다.
        report.videos.missing.push(row.youtube_video_id);
        continue;
      }
      await db
        .from("videos")
        .update({
          title: item.snippet?.title ?? undefined,
          published_at: item.snippet?.publishedAt ?? null,
          duration_sec: parseDuration(item.contentDetails?.duration),
          api_fetched_at: now,
        })
        .eq("id", row.id);
      report.videos.refreshed += 1;
    }
  }

  // 사라진 영상이 지워지면 출처를 잃는 장소 — 삭제 전에 먼저 알려 준다.
  if (report.videos.missing.length > 0) {
    const { data: gone } = await db
      .from("videos")
      .select("id")
      .in("youtube_video_id", report.videos.missing);
    const goneIds = (gone ?? []).map((v) => v.id);
    if (goneIds.length > 0) {
      const { data: goneLinks } = await db
        .from("video_places")
        .select("place_id")
        .in("video_id", goneIds);
      const affected = [...new Set((goneLinks ?? []).map((l) => l.place_id))];
      if (affected.length > 0) {
        const { data: survivingLinks } = await db
          .from("video_places")
          .select("place_id, video_id")
          .in("place_id", affected);
        const stillSourced = new Set(
          (survivingLinks ?? [])
            .filter((l) => !goneIds.includes(l.video_id))
            .map((l) => l.place_id),
        );
        report.orphanedPlaces = affected.filter((p) => !stillSourced.has(p));
      }

      if (purge) {
        // video_places 는 on delete cascade — 출처 링크만 사라지고 places 는 남는다.
        // 출처가 0개가 된 장소는 위 orphanedPlaces 에 있으니 어드민이 따로 처리한다.
        const { error } = await db.from("videos").delete().in("id", goneIds);
        if (error) return Response.json({ error: error.message, report }, { status: 500 });
        report.videos.purged = goneIds.length;
      }
    }
  }

  // ── 채널 ────────────────────────────────────────────────────────
  const { data: staleCreators, error: cErr } = await db
    .from("creators")
    .select("id, youtube_channel_id")
    .lt("api_fetched_at", cutoff);
  if (cErr) return Response.json({ error: cErr.message, report }, { status: 500 });

  report.creators.checked = staleCreators?.length ?? 0;

  for (const batch of chunk(staleCreators ?? [], ID_BATCH)) {
    const ids = batch.map((c) => c.youtube_channel_id).join(",");
    const data = await fetchJson<{ items?: YouTubeChannelItem[] }>(
      `${API}/channels?part=snippet&id=${encodeURIComponent(ids)}&key=${key}`,
    );
    report.quotaUnits += 1;

    const byId = new Map((data.items ?? []).map((it) => [it.id, it]));
    for (const row of batch) {
      const item = byId.get(row.youtube_channel_id);
      if (!item) {
        // 채널 ID 가 틀렸거나(핸들을 넣어 둔 경우) 채널이 사라졌다.
        // 채널은 영상과 달리 자동 삭제하지 않는다 — 조각 전체가 통째로 날아간다.
        report.creators.failed.push(row.youtube_channel_id);
        continue;
      }
      const thumbs = item.snippet?.thumbnails ?? {};
      const avatar = thumbs["high"]?.url ?? thumbs["medium"]?.url ?? thumbs["default"]?.url ?? null;
      await db
        .from("creators")
        .update({
          display_name: item.snippet?.title ?? undefined,
          avatar_url: avatar,
          api_fetched_at: now,
        })
        .eq("id", row.id);
      report.creators.refreshed += 1;
    }
  }

  // 갱신된 제목·채널명·아바타는 공개 화면에 그대로 나간다 — 로더 캐시를 비운다
  if (report.videos.refreshed > 0 || report.creators.refreshed > 0) {
    purgePublicData();
  }

  return Response.json(report);
}
