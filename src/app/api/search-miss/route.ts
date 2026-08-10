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
 * - 프로세스당 분당 상한 — IP 를 저장하지 않는 대신 전체를 뭉툭하게 막는다
 */

const WINDOW_MS = 60_000;
const WINDOW_LIMIT = 30;
let windowStart = 0;
let windowCount = 0;

export async function POST(req: Request): Promise<NextResponse> {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  if (++windowCount > WINDOW_LIMIT) {
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
