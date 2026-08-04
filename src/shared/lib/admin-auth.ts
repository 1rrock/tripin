/**
 * 어드민 인증 — 비밀번호 1개 + HMAC 서명 쿠키.
 *
 * 설계 근거: docs/ADMIN.md 1장.
 *   · 쿠키에는 비밀번호가 아니라 `만료시각.HMAC(ADMIN_SECRET, 만료시각)` 서명 토큰만 담는다.
 *   · proxy(edge)와 route handler(node) 양쪽에서 돌아야 하므로 node:crypto 대신
 *     Web Crypto(crypto.subtle)만 쓴다.
 *   · 비교는 전부 해시끼리 — 원문 길이·내용의 타이밍 누출 방지.
 */

export const ADMIN_COOKIE = "tripin_admin";

/** 쿠키 수명 7일 — 재로그인 부담과 노출 위험의 절충 (docs/ADMIN.md 1장). */
export const TOKEN_TTL_SEC = 7 * 24 * 60 * 60;

const encoder = new TextEncoder();

/**
 * ADMIN_SECRET 읽기. 16자 미만이면 미설정으로 취급한다 —
 * 약한 시크릿으로 열리느니 잠기는 게 낫다.
 * 미설정 시의 동작(프로덕션 404)은 proxy.ts 가 결정한다.
 */
export function getAdminSecret(): string | null {
  const s = process.env["ADMIN_SECRET"];
  return s && s.length >= 16 ? s : null;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 같은 길이의 hex 문자열 비교 — 이른 탈출 없이 전체를 XOR 한다. */
function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * 비밀번호 비교. 원문을 직접 비교하지 않고 양쪽 SHA-256 해시를 비교한다 —
 * 입력 길이가 달라도 비교 대상 길이가 항상 같아진다.
 */
export async function passwordMatches(secret: string, input: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256Hex(secret), sha256Hex(input)]);
  return constantTimeEqualHex(a, b);
}

/** 로그인 성공 시 발급하는 쿠키 값. */
export async function createToken(
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const exp = nowSec + TOKEN_TTL_SEC;
  return `${exp}.${await hmacHex(secret, `admin:${exp}`)}`;
}

/** 쿠키 값 검증 — 서명과 만료를 함께 본다. */
export async function verifyToken(
  secret: string,
  token: string | undefined,
  nowSec: number = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isInteger(exp) || exp <= nowSec) return false;
  const expected = await hmacHex(secret, `admin:${exp}`);
  return constantTimeEqualHex(expected, sig);
}
