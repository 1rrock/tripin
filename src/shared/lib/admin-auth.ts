/**
 * 어드민 인증 — 비밀번호 1개 + HMAC 서명 쿠키.
 *
 * 설계 근거: docs/ADMIN.md 1장.
 *   · 쿠키에는 비밀번호가 아니라 `만료시각.HMAC(서명키, 만료시각)` 서명 토큰만 담는다.
 *   · proxy(edge)와 route handler(node) 양쪽에서 돌아야 하므로 node:crypto 대신
 *     Web Crypto(crypto.subtle)만 쓴다.
 *   · 비교는 전부 해시끼리 — 원문 길이·내용의 타이밍 누출 방지.
 *
 * 🔑 **서명 키는 비밀번호가 아니다.** 예전에는 `ADMIN_SECRET` 원문이 로그인
 *    비밀번호이자 쿠키 HMAC 키였다 — 한 값이 두 역할을 했다. 이제 서명 키는
 *    비밀번호에서 **단방향으로 유도한** 값이다(`cookieSigningKey`). 서명 키가
 *    어떤 경로로 새더라도 비밀번호는 안 새고, 두 역할이 실제로 갈린다.
 *
 *    이 방법을 고른 이유: 두 번째 시크릿을 env 로 두면 **사람이 값을 정하고
 *    보관해야 하고**(회전 정책 결정이 필요해진다), 도입 순간 기존 세션이 전부
 *    끊긴다. 유도 방식은 둘 다 필요 없다 — 새 env 0개, 그리고 아래 전환 창이
 *    옛 쿠키를 그대로 받아 준다.
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
 * 임의 문자열 시크릿의 상수시간 비교. 원문을 직접 비교하지 않고 양쪽 SHA-256 해시를
 * 비교한다 — 입력 길이가 달라도 비교 대상 길이가 항상 같아진다.
 *
 * hex 가 아닌 값(크론 시크릿의 Authorization 헤더 등)에도 그대로 쓴다.
 */
export async function secretMatches(expected: string, input: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256Hex(expected), sha256Hex(input)]);
  return constantTimeEqualHex(a, b);
}

/** 어드민 비밀번호 비교 — 위와 같은 방식. 호출부의 뜻을 드러내려고 이름만 따로 둔다. */
export async function passwordMatches(secret: string, input: string): Promise<boolean> {
  return secretMatches(secret, input);
}

/**
 * 쿠키 서명 키 — 비밀번호에서 유도한다. HMAC 은 되돌릴 수 없으므로 이 값에서
 * `ADMIN_SECRET` 을 복원할 수 없다.
 *
 * 라벨(`info`)을 고정 문자열로 두는 이유: 나중에 같은 비밀번호로 **다른 용도**의
 * 키가 필요해지면 라벨만 바꿔 서로 섞이지 않는 키를 하나 더 뽑는다. 라벨 없이
 * 유도하면 그 순간 다시 "한 값이 두 역할" 로 돌아간다.
 * 버전 접미사(`v1`)는 유도 방식을 바꿔야 할 때 옛 서명과 갈라 세우는 손잡이다.
 */
const COOKIE_KEY_INFO = "eatripin:admin-cookie:v1";

/** 요청마다 두 번 HMAC 하지 않도록 프로세스 안에서만 기억한다. */
const signingKeyCache = new Map<string, Promise<string>>();

function cookieSigningKey(secret: string): Promise<string> {
  let derived = signingKeyCache.get(secret);
  if (!derived) {
    derived = hmacHex(secret, COOKIE_KEY_INFO);
    signingKeyCache.set(secret, derived);
  }
  return derived;
}

/**
 * 옛 서명(= 비밀번호를 그대로 키로 쓴 쿠키)을 받아 주는 기한.
 *
 * 유도 방식으로 바꾸는 순간 이미 발급된 쿠키가 전부 무효가 되어 로그인 화면으로
 * 튕긴다. 쿠키 수명이 7일이라 그만큼만 열어 두면 되고, 날짜를 박아 두었으니
 * **저절로 닫힌다** — 나중에 지우러 돌아올 일이 없다(돌아오지 않으면 영원히
 * 남는 종류의 코드다).
 *
 * ⚠️ 이 창이 열려 있어도 보안이 낮아지지 않는다: 옛 경로도 HMAC 검증이고, 통과
 *    조건은 예나 지금이나 "유효한 서명을 가진 쿠키" 하나다. 넓어진 것은 받아 주는
 *    서명의 종류이지 인증 없이 통과하는 길이 아니다.
 */
const LEGACY_SIGNATURE_UNTIL = Math.floor(Date.parse("2026-09-07T00:00:00Z") / 1000);

/** 로그인 성공 시 발급하는 쿠키 값. */
export async function createToken(
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const exp = nowSec + TOKEN_TTL_SEC;
  return `${exp}.${await hmacHex(await cookieSigningKey(secret), `admin:${exp}`)}`;
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

  const expected = await hmacHex(await cookieSigningKey(secret), `admin:${exp}`);
  if (constantTimeEqualHex(expected, sig)) return true;

  /* 전환 창 — 위 주석. `exp <= nowSec` 를 이미 걸렀으므로 만료된 옛 쿠키는
     여기까지 오지도 않는다. 즉 기한이 지나기 전에도 실질 수명은 7일이다. */
  if (nowSec < LEGACY_SIGNATURE_UNTIL) {
    return constantTimeEqualHex(await hmacHex(secret, `admin:${exp}`), sig);
  }
  return false;
}
