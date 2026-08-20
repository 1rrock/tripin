#!/usr/bin/env node
/**
 * 주소와 어긋난 도시 배정을 바로잡는다.
 *
 * 사용:
 *   node scripts/ingest/fix-place-city.mjs            무엇이 바뀌는지만 보여준다
 *   node scripts/ingest/fix-place-city.mjs --apply    실제로 옮긴다
 *   node scripts/ingest/fix-place-city.mjs --apply --allow-new
 *       대상 도시가 `cities` 에 없어도 옮긴다(도시는 따로 만들어야 하므로 기본은 막는다)
 *
 * 왜 이게 있나 — 인제스트는 도시를 **영상 단위로** 정해 그 영상의 모든 장소에 붙인다.
 * 크리에이터가 "성남 맛집" 영상에서 송파 가게를 하나 끼워 넣으면 그 가게가 성남
 * 페이지에 걸린다. 실제로 한국 521곳 중 47곳이 그랬다 — 서울 송파 가게가 성남에,
 * 서울 금천 가게가 안양에. 이름에 이미 지역이 박힌 것들이라("남양주 뚜레한우" 가
 * 서울에) 유저 눈에도 어긋나 보인다.
 *
 * ⚠️ 요약 불릿 둘째 줄이 `"{도시} · {주소}"` 또는 `"{도시}."` 꼴로 **도시명을 품고 있다**.
 *    city_id 만 바꾸면 화면에 옛 도시가 남아 모순이 보인다. 그래서 그 앞토막이 옛 도시명과
 *    정확히 같을 때만 새 도시명으로 갈아 끼운다. 사람이 손댄 문장은 건드리지 않는다.
 *
 * ⛔ 로컬(어드민) 전용. `map_status`·`is_published` 는 건드리지 않는다.
 *    바꾼 뒤 공개 화면은 공개 데이터 캐시 TTL(1시간) 안에 따라온다 — 즉시 보려면
 *    /admin 에서 아무 공개 토글이나 건드려 `purgePublicData()` 를 태워라.
 */
import { requireEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ALLOW_NEW = args.includes("--allow-new");

const env = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

/** PostgREST 는 한 번에 1000행까지만 준다 — 다 받을 때까지 이어 받는다. */
async function all(path) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await (await fetch(`${URL_}/rest/v1/${path}&limit=1000&offset=${offset}`, { headers: H })).json();
    if (!Array.isArray(page)) throw new Error(`조회 실패: ${JSON.stringify(page)}`);
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

/**
 * 주소에서 실제 행정 시/군을 뽑는다. 광역시·특별시가 있으면 그게 답이다
 * ("서울특별시 송파구" 는 서울이지 송파가 아니다).
 * 한글이 없는 주소(영문만)는 판단하지 않는다 — 잘못 옮기느니 놔둔다.
 */
function cityOfAddress(addr) {
  if (!addr || !/[가-힣]/.test(addr)) return null;
  const metro = addr.match(/(서울|부산|대구|인천|광주|대전|울산|세종)(특별시|광역시|특별자치시)?/);
  if (metro) return metro[1];
  const si = addr.match(/([가-힣]{2,4})시(?![장civ])/);
  if (si) return si[1];
  const gun = addr.match(/([가-힣]{2,4})군/);
  if (gun) return gun[1];
  return null;
}

/** 도시명에서 행정 접미를 턴 비교용 이름. "경기광주" 같은 합성 이름은 그대로 둔다. */
const core = (name) => (name ?? "").replace(/(특별자치)?(시|도)$/, "");

/**
 * 요약 불릿에 박힌 옛 도시명을 새 도시명으로 갈아 끼운다.
 * 앞토막이 옛 도시명과 **정확히** 같을 때만 손댄다 — 사람이 고쳐 쓴 문장을 뭉개지 않으려는 것.
 */
function retagBullets(bullets, oldName, newName) {
  if (!Array.isArray(bullets)) return null;
  let touched = false;
  const next = bullets.map((b) => {
    if (typeof b !== "string") return b;
    if (b === `${oldName}.`) {
      touched = true;
      return `${newName}.`;
    }
    if (b.startsWith(`${oldName} · `)) {
      touched = true;
      return `${newName}${b.slice(oldName.length)}`;
    }
    return b;
  });
  return touched ? next : null;
}

async function patch(id, body) {
  const res = await fetch(`${URL_}/rest/v1/places?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  return res.ok ? null : `${res.status} ${await res.text()}`;
}

// ── 대상 고르기 ────────────────────────────────────────────────────────────
const cities = await all("cities?select=id,slug,name,country_code&order=name");
const cityById = new Map(cities.map((c) => [c.id, c]));
const krCities = cities.filter((c) => c.country_code === "KR");
const places = await all(
  "places?country_code=eq.KR&select=id,name,address,city_id,summary_bullets,summary_bullets_en,map_status,is_published&order=name",
);

const moves = [];
const blocked = new Map();
for (const p of places) {
  const from = cityById.get(p.city_id);
  if (!from) continue;
  const real = cityOfAddress(p.address);
  if (!real) continue;
  // 이름이 서로를 품으면 같은 도시로 본다 — "경기광주" 와 주소의 "광주"
  if (core(from.name).includes(real) || real.includes(core(from.name))) continue;

  const to =
    krCities.find((c) => c.name === real) ?? krCities.find((c) => core(c.name) === real) ?? null;
  if (!to) {
    if (!blocked.has(real)) blocked.set(real, []);
    blocked.get(real).push(p.name);
    continue;
  }
  moves.push({ p, from, to });
}

console.log(`한국 ${places.length}곳 · 옮길 대상 ${moves.length}곳${APPLY ? "" : " (미리보기 — 실제로 쓰려면 --apply)"}`);

let moved = 0;
let failed = 0;
for (const { p, from, to } of moves) {
  const bullets = retagBullets(p.summary_bullets, from.name, to.name);
  const bulletsEn = retagBullets(p.summary_bullets_en, from.name, to.name);
  const body = { city_id: to.id };
  if (bullets) body.summary_bullets = bullets;
  if (bulletsEn) body.summary_bullets_en = bulletsEn;

  const tag = `${from.name} → ${to.name}`;
  const extra = bullets ? " · 요약 도시명도 갱신" : "";
  if (!APPLY) {
    console.log(`  → ${p.name}: ${tag}${extra}   (${p.address})`);
    continue;
  }
  const err = await patch(p.id, body);
  console.log(err ? `  ✖ ${p.name}: ${err}` : `  ✔ ${p.name}: ${tag}${extra}`);
  if (err) failed++;
  else moved++;
}

if (blocked.size) {
  const n = [...blocked.values()].flat().length;
  console.log(
    `\n건너뜀 ${n}곳 / 도시 ${blocked.size}개 — `+
      `\`cities\` 에 없는 도시라 만들지 않고는 못 옮긴다${ALLOW_NEW ? " (--allow-new 는 아직 도시 생성을 하지 않는다)" : ""}`,
  );
  for (const [name, list] of [...blocked.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${name}: ${list.length}곳 — ${list.slice(0, 4).join(", ")}${list.length > 4 ? " …" : ""}`);
  }
}

console.log(
  APPLY
    ? `\n${moved}곳 옮김${failed ? ` · 실패 ${failed}` : ""} — 공개 화면은 캐시 TTL(1시간) 안에 따라온다`
    : `\n미리보기 끝 — 실제로 쓰려면 --apply`,
);
