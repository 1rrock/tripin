#!/usr/bin/env node
/**
 * 요약 불릿의 주소줄을 places.address 로 다시 쓴다 — 로마자 주소 정리.
 *
 * 사용:
 *   node scripts/ingest/fix-address-bullets.mjs             미리보기 (아무것도 안 쓴다)
 *   node scripts/ingest/fix-address-bullets.mjs --apply     실제로 고친다
 *   node scripts/ingest/fix-address-bullets.mjs --country JP   # 기본 KR
 *
 * ⚠️⚠️ **2026-08-24 변경 — 인자 없이 돌리면 이제 dry-run 이다.**
 *      예전엔 인자 없이 돌리면 **즉시 DB 에 썼고** `--dry-run` 을 붙여야 안 썼다.
 *      리포의 다른 스크립트 절반은 반대(`--apply` 필요)라 손버릇이 사고를 냈다.
 *      전 스크립트를 `--apply` 기본으로 통일했다. `--dry-run` 은 계속 받는다(기본과 같다).
 *
 * 왜 필요한가:
 *   `auto-confirm-candidates.mjs` 가 google_place_id 가 이미 붙은 후보의 Places
 *   상세를 languageCode 없이 부르던 시절이 있었다(12f8ddc 에서 고침). 그때 확정된
 *   장소는 `address` 컬럼은 한글인데 **불릿의 주소줄만 로마자**로 굳어 있다:
 *
 *     "남양주 · Bukhangang-ro 855beon-gil, Joan-myeon, Namyangju-si, Gyeongg"
 *                                                                      ^ 60자에서 잘림
 *
 *   공개 페이지에 그대로 보인다. `address` 가 이미 옳으므로 Places 를 다시 부를
 *   필요가 없다 — 불릿만 다시 만든다(=API 비용 0).
 *
 * ⛔ 규칙:
 *   · 주소줄(`도시 · …`) 하나만 건드린다. 나머지 불릿은 그대로 둔다.
 *   · 새 값에 라틴 문자가 남으면 건너뛴다 — `address` 자체가 로마자면 손대 봐야
 *     같은 값이다. 그런 행은 Places 재조회 대상이라 여기서 처리하지 않는다.
 *   · 해외(JP·ES·IT…)는 기본 대상이 아니다. 일본 주소를 한글 음차로 바꾸면
 *     현지에서 보여주기 더 나빠진다. 필요할 때만 --country 로 명시한다.
 */
import { loadEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
// 기본이 dry-run 이다 — 쓰려면 --apply. (`--dry-run` 은 옛 손버릇을 위해 계속 받는다)
const DRY = !args.includes("--apply");
/**
 * 도시명만 고친다 — 주소 본문은 손대지 않는다.
 * 해외 장소에 쓴다: 방콕 가게가 "서울 · 442 ซอย 9…" 로 나가는 행이 19곳 있었다.
 * 주소를 한글로 바꿀 수는 없지만(태국 주소를 음차하면 현지에서 못 쓴다)
 * **도시명이 틀린 것은 사실 오류**라 반드시 고쳐야 한다.
 */
const CITY_ONLY = args.includes("--city-only");
const ALL_COUNTRIES = args.includes("--all-countries");
const COUNTRY = (() => {
  const i = args.indexOf("--country");
  return i >= 0 && args[i + 1] ? args[i + 1].toUpperCase() : "KR";
})();

const env = loadEnv();
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("✖ .env.local 에 Supabase 키가 없습니다");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function all(path) {
  const out = [];
  let from = 0;
  for (;;) {
    const res = await fetch(`${URL_}/rest/v1/${path}`, {
      headers: { ...H, Range: `${from}-${from + 999}` },
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

/** auto-confirm-candidates.mjs 의 같은 이름 함수와 동작을 맞춘다. */
function shortAddress(addr) {
  if (!addr) return null;
  return addr
    .replace(/^대한민국\s*/, "")
    .replace(/^日本[、,]\s*/, "")
    .replace(/일본\s*$/, "")
    .trim()
    .slice(0, 60);
}

const hasLatin = (s) => /[A-Za-z]{4,}/.test(s ?? "");

const cities = await all("cities?select=id,name");
const cityName = new Map(cities.map((c) => [c.id, c.name]));

const scope = ALL_COUNTRIES ? "" : `country_code=eq.${COUNTRY}&`;
const places = await all(
  `places?${scope}map_status=eq.confirmed&select=id,slug,name,address,city_id,country_code,summary_bullets`,
);
console.log(
  `${ALL_COUNTRIES ? "전" : COUNTRY} 확정 장소 ${places.length}곳 검사${CITY_ONLY ? " · 도시명만" : ""}${DRY ? " (dry-run)" : ""}\n`,
);

let fixed = 0;
let skippedLatinAddr = 0;
let untouched = 0;

for (const p of places) {
  const bullets = p.summary_bullets ?? [];
  const city = cityName.get(p.city_id);
  if (!city || bullets.length === 0) {
    untouched++;
    continue;
  }
  // 주소줄은 " · " 를 가진 불릿 하나뿐이다.
  // (나머지는 "식당." · "○○ 영상에서 소개." · "구글 지도에서 위치 확인." 꼴이라 · 가 없다)
  //
  // ⚠️ `${city} · ` 로만 찾으면 안 된다 — `fix-place-city.mjs` 가 city_id 를 고쳐도
  //    불릿은 그대로라, **도시명이 틀린 채로 남은 행이 있다**:
  //      city_id=수원 인데 불릿은 "제주 · … Suwon …", city_id=나주 인데 "서울 · … Naju …"
  //    로마자보다 이쪽이 더 나쁘다(사실이 틀렸다). 그래서 도시명도 현재 값으로 다시 쓴다.
  const idx = bullets.findIndex((b) => b.includes(" · "));
  if (idx < 0) {
    untouched++;
    continue;
  }
  const cityWrong = !bullets[idx].startsWith(`${city} · `);
  if (!hasLatin(bullets[idx]) && !cityWrong) {
    untouched++;
    continue; // 이미 한글이고 도시명도 맞다
  }
  const next = [...bullets];
  if (CITY_ONLY) {
    if (!cityWrong) {
      untouched++;
      continue;
    }
    // "잘못된도시 · 주소본문" → "옳은도시 · 주소본문". 주소 본문은 건드리지 않는다.
    next[idx] = `${city} · ${bullets[idx].slice(bullets[idx].indexOf(" · ") + 3)}`;
  } else {
    const short = shortAddress(p.address);
    if (!short || hasLatin(short)) {
      skippedLatinAddr++;
      console.log(`  · skip ${p.name} — address 자체가 로마자 (Places 재조회 필요)`);
      continue;
    }
    next[idx] = `${city} · ${short}`;
  }

  if (DRY) {
    console.log(`  · ${p.name}${cityWrong ? "  [도시명 틀림]" : ""}`);
    console.log(`      - ${bullets[idx]}`);
    console.log(`      + ${next[idx]}`);
    fixed++;
    continue;
  }
  const res = await fetch(`${URL_}/rest/v1/places?id=eq.${p.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ summary_bullets: next, updated_at: new Date().toISOString() }),
  });
  if (res.ok) {
    fixed++;
    console.log(`  ✔ ${p.name} → ${next[idx]}`);
  } else {
    console.log(`  ✖ ${p.name} (${res.status}) ${(await res.text()).slice(0, 100)}`);
  }
}

console.log(`\n── 집계 ──`);
console.log(`  고침            ${fixed}`);
console.log(`  address 도 로마자 ${skippedLatinAddr}  ← 별도 처리 필요`);
console.log(`  손댈 것 없음      ${untouched}`);
if (DRY) console.log("\n(dry-run — 아무것도 쓰지 않았습니다. 실제로 쓰려면 --apply)");
if (!DRY && fixed > 0) {
  console.log(`\n⚠ 공개 페이지는 최대 1시간 캐시된다 — 즉시 반영하려면 어드민에서 공개 토글.`);
}
