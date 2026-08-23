#!/usr/bin/env node
/**
 * 상호에 섞여 들어간 설명 문구를 걷어낸다.
 *
 * 사용:
 *   node scripts/ingest/fix-place-names.mjs           미리보기 (의심 이름만 훑는다)
 *   node scripts/ingest/fix-place-names.mjs --apply   실제로 고친다
 *   node scripts/ingest/fix-place-names.mjs --all     google_place_id 가진 전부 훑기(호출 많음)
 *
 * ⚠️⚠️ **2026-08-24 변경 — 인자 없이 돌리면 이제 dry-run 이다.**
 *      예전엔 인자 없이 돌리면 **즉시 DB 에 썼고** `--dry` 를 붙여야 안 썼다.
 *      리포의 다른 스크립트 절반은 반대(`--apply` 필요)라 손버릇이 사고를 냈다.
 *      전 스크립트를 `--apply` 기본으로 통일했다. `--dry` 는 계속 받는다(기본과 같다).
 *
 * 왜 이게 있나 — `parse-description.mjs` 는 지도 링크 위쪽 줄을 상호로 본다.
 * 크리에이터가 링크 앞에 설명을 써 두면 그 문장이 통째로 상호가 된다:
 *
 *   "로컬 하몽 전문 식당 Restaurante Casas"   ← 진짜 상호는 뒤쪽 3단어
 *   "해외 월클 유튜버도 찾아온 동문시장"        ← 진짜 상호는 "동문시장"
 *
 * 이 이름이 그대로 카드 제목으로 나간다.
 *
 * 고치는 방법 — 구글 Places 의 `displayName` 이 정답이다. 우리 이름이 구글 이름을
 * 통째로 품고 있을 때만 바꾼다. 둘이 아예 다르면 사람이 봐야 하므로 목록으로 남긴다.
 *
 * ⚠️ **포함 관계만 보면 지점명을 지운다.** 붙은 자리를 함께 봐야 한다 —
 *    우리가 구글 이름으로 **끝나면** 앞의 것이 설명구다(떼낸다).
 *    우리가 구글 이름으로 **시작하면** 뒤의 것은 지점명이다(그대로 둔다). 구글이 지점을
 *    안 적었을 뿐 우리 게 더 정확하고, 지우면 "안동돼지국밥 덕포"와 다른 지점이 한 이름이 된다.
 *    이 비대칭은 `backfill-naver.mjs` 의 `nameMatches` 와 같은 처방이다.
 *
 * ⛔ 로컬(어드민 머신) 전용. 요청 간 200ms. 이름 외의 컬럼은 손대지 않는다.
 */
import { requireEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
// 기본이 dry-run 이다 — 쓰려면 --apply. (`--dry` 는 옛 손버릇을 위해 계속 받는다)
const DRY = !args.includes("--apply");
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

/**
 * 원본 이름에서 구글 이름에 해당하는 꼬리를 뺀 **앞부분**을 돌려준다.
 * 정규화된 문자열끼리는 자리를 못 세므로, 원본을 앞에서부터 잘라 가며 꼬리를 맞춘다.
 */
function prefixBefore(original, gname) {
  const target = norm(gname);
  for (let i = 0; i < original.length; i++) {
    if (norm(original.slice(i)) === target) return original.slice(0, i).trim();
  }
  return null;
}

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
      `${URL_}/rest/v1/places?select=id,name,address,google_place_id,is_published` +
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
/** 지점명이 붙어 있어 그대로 둔 것 — 고친 것과 구분해서 센다. */
let kept = 0;
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

  /* 포함 관계라도 **붙은 자리**에 따라 뜻이 정반대다. 방향을 안 보면 지점명을 지운다.
   *
   *   우리 이름이 구글 이름으로 **끝난다**  → 앞에 붙은 건 크리에이터의 설명구다
   *     "퍼피 타코 원조집 레이스" / 구글 "레이스"        → 앞을 뗀다
   *
   *   우리 이름이 구글 이름으로 **시작한다** → 뒤에 붙은 건 지점명이다. 구글이 지점을
   *     안 적었을 뿐이지 우리 게 더 정확하다. 지우면 같은 브랜드의 두 지점이 구분이 안 된다
   *     "안동돼지국밥 덕포" / 구글 "안동돼지국밥"        → 그대로 둔다
   *
   *   가운데에 있으면 앞뒤가 다 붙은 것이라 자동으로 못 가른다
   *     "돈스테이크 토이치 하카타역남 본점" / 구글 "토이치" → 사람이 본다
   */
  if (a.startsWith(b)) {
    kept++;
    continue;
  }
  if (!a.endsWith(b)) {
    review.push({ name: p.name, google: gname, why: "구글 이름이 가운데에 있다(앞뒤 다 붙음)" });
    continue;
  }

  /* 꼬리가 맞아도 앞부분이 **설명구**일 때만 뗀다. 두 가지가 걸린다:
   *
   *   지역 접두 — 우리가 일부러 붙인다("영광 동락식당", "노원 하이레"). 주소에 그 말이
   *     들어 있으면 지역이다. 떼면 동명 가게와 구분이 안 된다.
   *   한 토막 접두 — "야키니쿠 쵸우야", "블루시엘 (호텔…)" 처럼 업종일 수도, 진짜 상호일
   *     수도 있다. 설명구는 보통 두 토막 이상이라("퍼피 타코 원조집"), 한 토막은 사람에게 넘긴다.
   *     특히 "블루시엘"은 호텔 안 식당이라 떼면 식당 이름이 사라지고 호텔 이름만 남는다.
   */
  const pre = prefixBefore(p.name, gname);
  if (!pre) {
    review.push({ name: p.name, google: gname, why: "앞부분을 못 갈랐다" });
    continue;
  }
  /* 앞부분이 **전부** 주소에 나오는 말로 이뤄졌으면 지역 표기다. 길이로 자르면 안 된다 —
     "서울 성북구 정릉"(10자)도 지역이다. 어절 단위로 하나씩 주소와 맞춰 본다. */
  const preTokens = pre.split(/\s+/).filter(Boolean);
  const addr = norm(p.address ?? "");
  if (preTokens.length > 0 && addr && preTokens.every((t) => norm(t).length >= 2 && addr.includes(norm(t)))) {
    kept++;
    continue;
  }
  if (pre.split(/\s+/).filter(Boolean).length < 2) {
    review.push({ name: p.name, google: gname, why: `앞부분이 한 토막("${pre}") — 업종인지 상호인지 애매` });
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
    ? `\ndry-run 끝 — ${fixed}곳이 바뀔 예정 · 지점명이라 그대로 둔 곳 ${kept}. 실제로 쓰려면 --apply`
    : `\n${fixed}곳 이름 정리 · 지점명이라 그대로 둔 곳 ${kept} — 공개 화면 반영은 배포 또는 캐시 만료(1시간) 후`,
);
