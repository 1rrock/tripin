import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { publicEnv, serverEnv } from "@/shared/config/env";
import { stripLocalePrefix } from "@/shared/i18n/paths";

/**
 * 삭제·정정 요청 접수 — `/takedown` 폼이 쏘는 유일한 목적지.
 *
 * ⚠️ 이 라우트가 생기기 전까지 `takedown_requests` 에는 **인입 경로가 없었다.**
 *    어드민 큐가 읽기만 했고 실측 행 수는 0. 접수는 mailto: 로만 들어와
 *    운영자 메일함에만 남았고, 큐의 빈 화면이 "요청 없음"으로 읽혔다.
 *    §44조의2④ 의 30일 시계는 그 사이에도 돈다.
 *
 * anon 이 테이블·RPC 를 직접 만지지 못하게 잠가 두고(0021), 이 라우트가
 * service_role 로 대신 기록한다 — `api/channel-apply`(0013)와 같은 배치다.
 *
 * 공개 쓰기 엔드포인트의 가드:
 * - 사유·이메일 필수. 이메일은 §44조의2② 의 "신청인 통지"를 할 유일한 창구다
 * - URL 은 형태만 본다 — 우리 URL 이 아니어도 접수는 받는다(유튜브 링크·구글 지도
 *   링크로 신고하는 사람을 막을 이유가 없다). 대신 우리 URL 이면 대상을 붙인다
 * - IP 별 분당 상한 (아래)
 *
 * 🔴 이 창구는 **막지 마라.** 법정 절차의 입구다. 스팸이 들어오면 상한을 조이거나
 *    큐에서 반려하되, 라우트를 끄면 접수 자체가 사라진다.
 */

/**
 * IP 별 분당 상한 — `api/channel-apply` · `api/search-miss` 와 같은 모양이다.
 *
 * 한도가 신청(5)보다 낮은 3인 이유: 삭제 요청은 한 사람이 한 번 하는 행동이고,
 * 여러 건을 한꺼번에 내야 하는 사람(예: 채널 전체)은 한 건에 사유로 적으면 된다.
 *
 * 한계: 인메모리라 인스턴스 간에 공유되지 않는다. 키는 IP 원문이 아니라 프로세스마다
 * 새로 뽑는 소금으로 해시한 값이다.
 */
const WINDOW_MS = 60_000;
const WINDOW_LIMIT = 3;
/** 창이 지난 키를 걷어내는 시점 — 키가 IP 별로 갈라진 뒤로는 무한히 쌓일 수 있다. */
const SWEEP_AT = 5_000;
const RATE_SALT = crypto.randomUUID();
const hits = new Map<string, { start: number; count: number }>();

async function rateKey(req: Request): Promise<string> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${RATE_SALT}:${ip}`),
  );
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
}

function overLimit(key: string, now: number): boolean {
  const record = hits.get(key);
  if (!record || now - record.start > WINDOW_MS) {
    if (hits.size >= SWEEP_AT) {
      for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k);
    }
    hits.set(key, { start: now, count: 1 });
    return false;
  }
  record.count += 1;
  return record.count > WINDOW_LIMIT;
}

type TargetType = "place" | "creator" | "video" | "other";

/** 우리 사이트의 URL 인가 — 로컬 개발과 배포 도메인 양쪽을 받는다. */
function isOwnHost(url: URL): boolean {
  try {
    return url.hostname === new URL(publicEnv.siteUrl).hostname;
  } catch {
    return false;
  }
}

/**
 * 붙여넣은 URL 에서 **무엇에 대한 요청인지**를 읽는다.
 *
 * 큐 화면은 `target_id` 로 장소·채널 이름을 붙여 보여준다(`queue/page.tsx`).
 * 여기서 안 붙이면 운영자는 URL 만 보고 매번 새 탭을 열어 확인해야 한다.
 * 해석에 실패해도 접수는 그대로 진행한다 — 판정보다 접수가 우선이다.
 *
 * 라우트 모양은 `(public)/[lang]` 트리 그대로다:
 *   /place/<slug> · /c/<slug> · /c/<slug>/v/<youtubeId>   (앞에 /en 이 붙을 수 있다)
 */
function readTarget(raw: string): { type: TargetType; slug: string | null; video: string | null } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { type: "other", slug: null, video: null };
  }

  if (!isOwnHost(url)) {
    // 유튜브 링크로 신고하는 경우가 흔하다 — 대상 종류만이라도 남긴다
    const yt = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname);
    return { type: yt ? "video" : "other", slug: null, video: null };
  }

  /* ⚠️ `URL.pathname` 은 **퍼센트 인코딩된** 경로를 준다. 확정 장소 slug 는 대부분
     한글이라(`place-path.ts`), 디코딩하지 않으면 `%EC%9D%BC…` 로 slug 를 찾게 되어
     대상이 영영 안 붙는다 — 실측으로 당했다(type 은 place 인데 target_id 만 null).
     깨진 이스케이프는 그냥 원문으로 둔다: 대상 해석 실패가 접수 실패가 되면 안 된다. */
  const parts = stripLocalePrefix(url.pathname)
    .split("/")
    .filter(Boolean)
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    });
  if (parts[0] === "place" && parts[1]) return { type: "place", slug: parts[1], video: null };
  if (parts[0] === "c" && parts[1]) {
    // /c/<slug>/v/<youtubeId> — videoId 는 youtube_video_id 다(`loadVideoDetail`)
    if (parts[2] === "v" && parts[3]) {
      return { type: "video", slug: parts[1], video: parts[3] };
    }
    return { type: "creator", slug: parts[1], video: null };
  }
  return { type: "other", slug: null, video: null };
}

/**
 * 대상 행의 id 를 찾는다 — 못 찾아도 null 로 넘어간다(접수는 계속된다).
 *
 * service_role 로 읽는 이유: 이미 비공개로 내려간 장소에 대한 정정 요청도 받는다.
 * anon 으로 읽으면 RLS 가 그 행을 숨겨 대상 없는 접수가 된다.
 */
async function resolveTargetId(
  t: ReturnType<typeof readTarget>,
): Promise<{ type: TargetType; id: string | null }> {
  if (!t.slug) return { type: t.type, id: null };
  const db = getSupabaseAdmin();
  try {
    if (t.type === "place") {
      const { data } = await db.from("places").select("id").eq("slug", t.slug).maybeSingle();
      return { type: "place", id: data?.id ?? null };
    }
    const { data: creator } = await db
      .from("creators")
      .select("id")
      .eq("slug", t.slug)
      .maybeSingle();
    if (t.type === "creator") return { type: "creator", id: creator?.id ?? null };

    if (!creator || !t.video) return { type: "video", id: null };
    const { data: video } = await db
      .from("videos")
      .select("id, creator_id")
      .eq("youtube_video_id", t.video)
      .maybeSingle();
    // URL 의 채널과 영상의 실제 소유 채널이 다르면 잘못된 조합이다(`loadVideoDetail` 과 동일)
    if (!video || video.creator_id !== creator.id) return { type: "video", id: null };
    return { type: "video", id: video.id };
  } catch {
    /* 대상 해석은 부속이다 — 실패해도 접수를 막지 않는다 */
    return { type: t.type, id: null };
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  /* 429 만 본문을 준다 — 폼이 "잠시 뒤 다시" 를 일반 실패와 갈라 말할 수 있게. */
  if (overLimit(await rateKey(req), Date.now())) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { targetUrl?: unknown; email?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const targetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim().slice(0, 500) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
  /* 사유는 길게 쓰라고 받는 칸이다 — 잘라내면 판단 근거가 잘린다. 2,000자면 충분하다. */
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new NextResponse(null, { status: 400 });
  if (reason.length < 5) return new NextResponse(null, { status: 400 });

  const target = await resolveTargetId(readTarget(targetUrl));

  const { error } = await getSupabaseAdmin().rpc("submit_takedown_request", {
    p_target_type: target.type,
    p_target_id: target.id,
    p_target_url: targetUrl || null,
    p_requester_email: email,
    p_reason: reason,
  });
  /* 🔴 여기서 실패하면 접수가 **어디에도 남지 않는다.** 폼은 500 을 받고 사람은
     mailto: 로 되돌아가야 한다 — 그래서 화면에 메일 주소를 계속 남겨 둔다. */
  if (error) return new NextResponse(null, { status: 500 });

  /* 알림은 접수의 부속이다 — 메일이 죽어도 접수는 204 로 끝난다.
     await 하는 이유: Vercel 은 응답 후 떠 있는 promise 를 보장하지 않는다. */
  await notifyByEmail({ targetUrl, email, reason, targetType: target.type }).catch(() => {});
  return new NextResponse(null, { status: 204 });
}

/**
 * 새 요청을 운영자 메일로 알린다 — `api/channel-apply` 와 같은 Resend 직결이다.
 *
 * 채널 신청과 달리 이쪽은 **기한이 있는 법정 절차**다. 큐를 매일 보지 않는 1인
 * 운영에서는 이 메일이 실질적인 알람이라 제목에 접수 사실을 그대로 적는다.
 * RESEND_API_KEY 가 없으면 조용히 건너뛴다(로컬·키 미설정 환경).
 */
async function notifyByEmail(r: {
  targetUrl: string;
  email: string;
  reason: string;
  targetType: TargetType;
}): Promise<void> {
  const key = serverEnv.resendApiKey();
  const to = serverEnv.applyNotifyTo();
  if (!key || !to) return;

  const admin = `${publicEnv.siteUrl.replace(/\/$/, "")}/admin/queue`;
  const text = [
    `대상: ${r.targetType}`,
    r.targetUrl ? `URL: ${r.targetUrl}` : `URL: (없음)`,
    `신청인: ${r.email}`,
    ``,
    `사유:`,
    r.reason,
    ``,
    `⚠️ 지체 없이 조치하고 신청인·게재자 양쪽에 통지해야 합니다(§44조의2②).`,
    `임시조치는 30일 안에 결론(§44조의2④).`,
    ``,
    `처리: ${admin}`,
  ].join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Eatripin <onboarding@resend.dev>",
      to: [to],
      subject: `[삭제요청] ${r.targetType} — ${r.targetUrl || r.email}`,
      text,
    }),
  });
}
