import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/shared/api/supabase";
import { publicEnv, serverEnv } from "@/shared/config/env";

/**
 * 채널 등록 신청 접수 — `/apply` 폼이 쏘는 유일한 목적지.
 *
 * anon 이 테이블·RPC 를 직접 만지지 못하게 잠가 두고(0013), 이 라우트가
 * service_role 로 대신 기록한다. search-miss(0008)와 같은 배치다.
 *
 * 공개 쓰기 엔드포인트의 가드:
 * - 채널 URL 은 유튜브 호스트만 통과 — 아무 링크나 쌓이면 스팸 창구가 된다
 * - 이메일은 형태만 본다(회신 창구일 뿐, 검증 메일은 안 보낸다)
 * - 프로세스당 분당 상한 — IP 를 저장하지 않는 대신 전체를 뭉툭하게 막는다.
 *   신청은 검색보다 훨씬 드문 행동이라 상한도 그만큼 낮다.
 */

const WINDOW_MS = 60_000;
const WINDOW_LIMIT = 5;
let windowStart = 0;
let windowCount = 0;

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function isYoutubeChannelUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return YT_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  if (++windowCount > WINDOW_LIMIT) {
    return new NextResponse(null, { status: 429 });
  }

  let body: { channelUrl?: unknown; email?: unknown; videoUrls?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const channelUrl = typeof body.channelUrl === "string" ? body.channelUrl.trim().slice(0, 200) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
  const videoUrls = typeof body.videoUrls === "string" ? body.videoUrls.trim().slice(0, 1000) : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";

  if (!isYoutubeChannelUrl(channelUrl)) return new NextResponse(null, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new NextResponse(null, { status: 400 });

  const { error } = await getSupabaseAdmin().rpc("submit_channel_application", {
    p_channel_url: channelUrl,
    p_contact_email: email,
    p_video_urls: videoUrls || null,
    p_note: note || null,
  });
  if (error) return new NextResponse(null, { status: 500 });

  /* 알림은 접수의 부속이다 — 메일이 죽어도 접수는 204 로 끝난다.
     await 하는 이유: Vercel 은 응답 후 떠 있는 promise 를 보장하지 않는다. */
  await notifyByEmail({ channelUrl, email, videoUrls, note }).catch(() => {});
  return new NextResponse(null, { status: 204 });
}

const NOTIFY_TO = "hello@eatripin.com";

/**
 * 새 신청을 운영자 메일로 알린다 — Resend HTTP API 직접 호출(SDK 불필요).
 * RESEND_API_KEY 가 없으면 조용히 건너뛴다(로컬·키 미설정 환경).
 *
 * from 이 onboarding@resend.dev 인 이유: 도메인 DNS 인증 전에는 Resend 가
 * 자기 샌드박스 주소로만 발신을 허용한다. eatripin.com 을 Resend 에 인증하면
 * no-reply@eatripin.com 으로 바꿀 수 있다.
 */
async function notifyByEmail(app: {
  channelUrl: string;
  email: string;
  videoUrls: string;
  note: string;
}): Promise<void> {
  const key = serverEnv.resendApiKey();
  if (!key) return;

  const admin = `${publicEnv.siteUrl.replace(/\/$/, "")}/admin/applications`;
  const text = [
    `채널: ${app.channelUrl}`,
    `이메일: ${app.email}`,
    app.videoUrls ? `대표 영상:\n${app.videoUrls}` : null,
    app.note ? `메모:\n${app.note}` : null,
    ``,
    `판정: ${admin}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Eatripin <onboarding@resend.dev>",
      to: [NOTIFY_TO],
      subject: `채널 등록 신청 — ${app.channelUrl}`,
      text,
    }),
  });
}
