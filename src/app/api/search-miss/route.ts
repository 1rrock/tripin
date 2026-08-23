import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/shared/api/supabase";

/**
 * 검색 실패어 수집 — 홈 검색이 0건일 때 클라이언트가 쏘는 신호.
 *
 * anon 이 테이블·RPC 를 직접 만지지 못하게 잠가 두고(0008), 이 라우트가
 * service_role 로 대신 기록한다. 개인정보는 받지 않는다 — 검색어 그대로만.
 *
 * 공개 쓰기 엔드포인트라 최소한의 가드를 둔다:
 * - 길이 1~80자로 클램프, 소문자 정규화(집계 목적)
 * - IP 별 분당 상한 (아래)
 */

/**
 * IP 별 분당 상한.
 *
 * 예전엔 프로세스 전역 카운터 하나였다 — 그러면 누가 한도를 채우는 순간 그 인스턴스에
 * 붙은 **정상 사용자가 전부** 429 를 맞는다. 뭉툭한 쪽이 공격자가 아니라 보통 사람을
 * 때리는 구조다. 어드민 로그인 실패 카운터(`api/admin/login/route.ts`)와 같이 키를
 * 요청자별로 가른다.
 *
 * 한계: 인메모리라 인스턴스 간에 공유되지 않는다 — 서버리스에서 인스턴스가 여럿이면
 * 실효 한도가 그만큼 늘어난다. 외부 저장소를 하나 더 붙일 만한 문제는 아니라고 본다.
 * 로그인 카운터도 같은 절충 위에 있다.
 *
 * 키는 IP 원문이 아니라 **프로세스마다 새로 뽑는 소금으로 해시한 값**이다 —
 * 개인정보처리방침대로 IP 자체는 어디에도 남기지 않는다.
 */
const WINDOW_MS = 60_000;
const WINDOW_LIMIT = 30;
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

export async function POST(req: Request): Promise<NextResponse> {
  if (overLimit(await rateKey(req), Date.now())) {
    return new NextResponse(null, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = (await req.json())?.query;
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof raw !== "string") return new NextResponse(null, { status: 400 });

  const query = raw.trim().toLowerCase().normalize("NFC").slice(0, 80);
  if (query.length === 0) return new NextResponse(null, { status: 400 });

  const { error } = await getSupabaseAdmin().rpc("log_search_miss", { q: query });
  if (error) return new NextResponse(null, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
