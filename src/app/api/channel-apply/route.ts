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
 * - IP 별 분당 상한 (아래). 신청은 검색보다 훨씬 드문 행동이라 상한도 그만큼 낮다.
 */

/**
 * IP 별 분당 상한 — `api/search-miss/route.ts` 와 같은 모양이다.
 *
 * 예전엔 프로세스 전역 카운터 하나였다. 그러면 누가 한도를 채우는 순간 그 인스턴스의
 * **정상 신청자가 전부** 429 를 맞는다 — 뭉툭한 쪽이 공격자가 아니라 신청하려는 사람을
 * 때린다. 한도가 5회라 더 쉽게 터진다. 어드민 로그인 실패 카운터처럼 키를 요청자별로 가른다.
 *
 * 한계: 인메모리라 인스턴스 간에 공유되지 않는다 — 인스턴스가 여럿이면 실효 한도가
 * 그만큼 늘어난다. 키는 IP 원문이 아니라 프로세스마다 새로 뽑는 소금으로 해시한 값이다.
 */
const WINDOW_MS = 60_000;
const WINDOW_LIMIT = 5;
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
  /* 429 만 본문을 준다 — 폼이 "잠시 뒤 다시" 를 일반 실패와 갈라 말할 수 있게.
     (폼 쪽 문구 처리는 이 라우트의 몫이 아니다.) */
  if (overLimit(await rateKey(req), Date.now())) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
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

/**
 * 새 신청을 운영자 메일로 알린다 — Resend HTTP API 직접 호출(SDK 불필요).
 * RESEND_API_KEY 가 없으면 조용히 건너뛴다(로컬·키 미설정 환경).
 *
 * 수신 주소가 env 인 이유: Resend 샌드박스는 **가입 계정의 이메일로만** 발송을
 * 허용한다(도메인 DNS 인증 전). 그래서 가입에 쓴 주소를 APPLY_NOTIFY_TO 로
 * 넣는다 — hello@ 포워딩은 받는 길이지, 서버가 보내는 길이 아니다.
 * from 도 같은 이유로 샌드박스 주소다. eatripin.com 을 Resend 에 인증하면
 * from 은 no-reply@eatripin.com, to 는 아무 주소로나 바꿀 수 있다.
 */
async function notifyByEmail(app: {
  channelUrl: string;
  email: string;
  videoUrls: string;
  note: string;
}): Promise<void> {
  const key = serverEnv.resendApiKey();
  const to = serverEnv.applyNotifyTo();
  if (!key || !to) return;

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
      to: [to],
      subject: `채널 등록 신청 — ${app.channelUrl}`,
      text,
    }),
  });
}
