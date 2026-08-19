#!/usr/bin/env node
/**
 * 상호에 섞여 들어간 설명 문구를 걷어낸다.
 *
 * 사용:
 *   node scripts/ingest/fix-place-names.mjs [--dry]   기본은 의심 이름만 훑는다
 *   node scripts/ingest/fix-place-names.mjs --all     google_place_id 가진 전부 훑기(호출 많음)
 *
 * 왜 이게 있나 — `parse-description.mjs` 는 지도 링크 위쪽 줄을 상호로 본다.
 * 크리에이터가 링크 앞에 설명을 써 두면 그 문장이 통째로 상호가 된다:
 *
 *   "로컬 하몽 전문 식당 Restaurante Casas"   ← 진짜 상호는 뒤쪽 3단어
 *   "해외 월클 유튜버도 찾아온 동문시장"        ← 진짜 상호는 "동문시장"
 *
 * 이 이름이 그대로 카드 제목으로 나간다.
 *
 * 고치는 방법 — 구글 Places 의 `displayName` 이 정답이다. **우리 이름이 구글 이름을
 * 통째로 품고 있을 때만** 바꾼다. 그 포함 관계가 "같은 가게인데 앞에 군더더기가 붙었다"
 * 는 증거다. 둘이 아예 다르면 사람이 봐야 하므로 건드리지 않고 목록으로 남긴다.
 *
 * ⛔ 로컬(어드민 머신) 전용. 요청 간 200ms. 이름 외의 컬럼은 손대지 않는다.
 */
import { requireEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const ALL = args.includes("--all");

const env = requireEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_PLACES_API_KEY",
]);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
// 키가 리퍼러 제한이라 Referer 를 명시해야 통과한다 (auto-confirm-candidates.mjs 와 동일)
const G_HEADERS = {
  "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
  Referer: "https://eatripin.com",
  "X-Goog-FieldMask": "id,displayName",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 상호로 보기 어려운 이름 — 설명 문구가 섞였을 가능성이 큰 것만 좁혀 고른다. */
const SENTENCE =
  /(요[.!]?$|니다[.!]?$|어요|세요|습니다|하지만|저희|영상\s*만들|알려드리|기대해주세요|찾아온|압도적|심금을|끝내주|난해했|환상적인|근본\s*넘치는|유명한|대표|전문\s*식당)/;

function looksDescriptive(name) {
  return SENTENCE.test(name) || name.length > 28 || (name.includes(",") && name.length > 16);
}

/** 공백·구두점·대소문자를 무시한 비교용 문자열. */
const norm = (s) => (s ?? "").replace(/[\s·・,.'"’”\-–—|()（）[\]]/g, "").toLowerCase();

async function googleName(placeId) {
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ko`,
      { headers: G_HEADERS, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const j = await res.json();
    return { name: j?.displayName?.text ?? null };
  } catch (e) {
    return { error: String(e?.message ?? e) };
  }
}

async function patch(id, body) {
  const res = await fetch(`${URL_}/rest/v1/places?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  return res.ok ? null : `${res.status} ${await res.text()}`;
}

// ── 대상 모으기 (PostgREST 는 1000행씩만 준다) ─────────────────────────────
const places = [];
for (let offset = 0; ; offset += 1000) {
  const page = await (
    await fetch(
      `${URL_}/rest/v1/places?select=id,name,google_place_id,is_published` +
        `&google_place_id=not.is.null&order=created_at.asc&offset=${offset}&limit=1000`,
      { headers: H },
    )
  ).json();
  places.push(...page);
  if (page.length < 1000) break;
}

const targets = ALL ? places : places.filter((p) => looksDescriptive(p.name));
console.log(`구글 ID 보유 ${places.length}곳 · 검사 대상 ${targets.length}곳${DRY ? " (dry-run)" : ""}`);

let fixed = 0;
const review = [];
for (const [i, p] of targets.entries()) {
  const { name: gname, error } = await googleName(p.google_place_id);
  if (i < targets.length - 1) await sleep(200);
  if (error || !gname) {
    review.push({ name: p.name, why: error ?? "구글 이름 없음" });
    continue;
  }
  const a = norm(p.name);
  const b = norm(gname);
  if (a === b) continue; // 이미 같다
  if (b.length < 3 || !a.includes(b)) {
    // 포함 관계가 아니면 같은 가게라는 증거가 없다 — 사람이 판단한다
    review.push({ name: p.name, google: gname, why: "포함 관계 아님" });
    continue;
  }
  console.log(`  ${DRY ? "→" : "✔"} ${p.name}\n       ⇒ ${gname}`);
  if (!DRY) {
    const err = await patch(p.id, { name: gname });
    if (err) {
      console.log(`       ✖ 저장 실패: ${err}`);
      continue;
    }
  }
  fixed++;
}

if (review.length) {
  console.log(`\n사람이 봐야 하는 ${review.length}곳 — 자동으로 못 고친다:`);
  for (const r of review) {
    console.log(`  · ${r.name}${r.google ? `  (구글: ${r.google})` : ""}  [${r.why}]`);
  }
}
console.log(
  DRY
    ? `\ndry-run 끝 — ${fixed}곳이 바뀔 예정. 실제로 쓰려면 --dry 를 빼라`
    : `\n${fixed}곳 이름 정리 — 공개 화면 반영은 배포 또는 캐시 만료(1시간) 후`,
);
