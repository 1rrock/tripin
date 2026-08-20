#!/usr/bin/env node
/**
 * 서로 다른 가게가 한 google_place_id 를 나눠 쓰는 것을 바로잡는다.
 *
 * 사용:
 *   node scripts/ingest/fix-wrong-place-id.mjs           무엇이 바뀔지만 본다
 *   node scripts/ingest/fix-wrong-place-id.mjs --apply   실제로 고친다
 *
 * 왜 이게 있나 — `parse-description.mjs` 가 더보기란의 지도 링크를 바로 윗줄 상호와
 * 짝짓는데, 한 영상에 가게가 여럿이면 그 짝이 밀린다. 그러면 "잇푸도 니시도리점" 에
 * "이치란 텐진점" 의 place_id 가 붙는다. 유저가 지도 버튼을 누르면 **다른 가게로 간다** —
 * 링크가 없는 것보다 나쁘다.
 *
 * 고치는 방법 — 그 ID 의 구글 등록명을 받아, 이름이 맞는 행이 ID 의 주인이다. 나머지
 * 행은 자기 상호+주소로 다시 검색해 제 ID 를 찾아 붙인다. 다음 셋 중 하나라도 어긋나면
 * 건드리지 않는다:
 *   · 검색 결과의 상호가 우리 상호와 안 통한다  → 근처 아무 가게다(구글이 그렇게 준다)
 *   · 검색 결과가 우리 좌표에서 200m 밖         → 다른 가게다
 *   · 그 ID 를 이미 다른 행이 쓰고 있다          → 붙이는 순간 새 충돌이 생긴다
 *   · 주인을 못 고르겠다(아무 이름도 안 맞는다)  → 사람이 봐야 한다
 *
 * ⚠️ **실측: 자동으로는 거의 못 고친다.** 23그룹에 돌렸을 때 가드를 다 통과한 제안이
 *    1건뿐이었고 그마저 틀렸다("메가네바시"(다리)에 "메가네바시 하트스톤"(다리 안 표식)을
 *    물어 왔다 — 포함 관계라 이름 가드도 통과한다). 그러니 이 스크립트는 **고치는 도구가
 *    아니라 골라내는 도구**로 쓰는 게 맞다: 어느 행이 ID 의 주인인지까지는 확실히 가려
 *    주므로, 나머지를 사람이 /admin 에서 붙이면 된다. --apply 는 눈으로 본 뒤에만 쓸 것.
 *
 * ⛔ 로컬(어드민) 전용. `map_status` 는 건드리지 않는다.
 */
import { requireEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? null;
/** 검색 결과를 같은 가게로 인정할 최대 거리(m). */
const MAX_M = Number(opt("max-m") ?? 200);

const env = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_PLACES_API_KEY"]);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const GKEY = env.GOOGLE_PLACES_API_KEY;
// 키가 리퍼러 제한이라 Referer 를 명시해야 통과한다 (fix-place-names.mjs 와 동일)
const GREF = "https://eatripin.com";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s ?? "").normalize("NFKC").replace(/[\s·・,.'"’”\-–—/|()（）[\]]/g, "").toLowerCase();

function sameish(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [s, l] = x.length <= y.length ? [x, y] : [y, x];
  return s.length >= 3 && l.includes(s);
}

function distM(aLat, aLng, bLat, bLng) {
  const rad = (x) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)));
}

async function googleName(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ko`, {
    headers: { "X-Goog-Api-Key": GKEY, Referer: GREF, "X-Goog-FieldMask": "id,displayName" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  return (await res.json())?.displayName?.text ?? null;
}

async function searchPlace(query, lat, lng) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GKEY,
      Referer: GREF,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "ko",
      maxResultCount: 5,
      ...(Number.isFinite(lat) && Number.isFinite(lng)
        ? { locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 500 } } }
        : {}),
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];
  return (await res.json()).places ?? [];
}

async function all(path) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await (await fetch(`${URL_}/rest/v1/${path}&limit=1000&offset=${offset}`, { headers: H })).json();
    if (!Array.isArray(page)) throw new Error(JSON.stringify(page));
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

const places = await all("places?select=id,name,address,lat,lng,google_place_id,map_status,is_published&google_place_id=not.is.null&order=google_place_id");
const takenIds = new Set(places.map((p) => p.google_place_id));

const groups = {};
for (const p of places) (groups[p.google_place_id] ??= []).push(p);
const conflicts = Object.entries(groups).filter(([, v]) => {
  if (v.length < 2) return false;
  for (let i = 0; i < v.length; i++)
    for (let j = i + 1; j < v.length; j++) if (!sameish(v[i].name, v[j].name)) return true;
  return false;
});

console.log(`한 ID 를 나눠 쓰는 그룹 ${conflicts.length}개${APPLY ? "" : " (미리보기)"}`);

let fixed = 0, unsure = 0;
for (const [pid, rows] of conflicts) {
  const gname = await googleName(pid);
  await sleep(200);
  if (!gname) { console.log(`\n■ ${pid} — 구글 조회 실패. 건너뜀`); unsure += rows.length; continue; }

  const owner = rows.find((r) => sameish(r.name, gname));
  console.log(`\n■ 구글: "${gname}"`);
  if (!owner) {
    console.log(`   주인을 못 고르겠다 — ${rows.map((r) => `"${r.name}"`).join(", ")}. 전부 건너뜀`);
    unsure += rows.length;
    continue;
  }
  console.log(`   주인 "${owner.name}" — ID 유지`);

  for (const r of rows) {
    if (r.id === owner.id) continue;
    const hits = await searchPlace(`${r.name} ${r.address ?? ""}`.trim(), r.lat, r.lng);
    await sleep(250);
    /* ⚠️ 거리만 보면 안 된다. searchText 는 딱 맞는 게 없으면 **근처 아무거나** 준다 —
       "잇케이 니시나카스점"(식당)에 197m 떨어진 "숙소"를, "메가네바시"(다리)에 66m
       떨어진 "메가네바시 하트스톤"(다리 안 표식)을 물어 왔다. 이름까지 맞아야 인정한다. */
    const best = hits
      .map((h) => ({ ...h, m: r.lat != null && h.location ? distM(r.lat, r.lng, h.location.latitude, h.location.longitude) : 9e9 }))
      .filter((h) => h.id !== pid && h.m <= MAX_M && sameish(r.name, h.displayName?.text))
      .sort((a, b) => a.m - b.m)[0];

    if (!best) { console.log(`   ? "${r.name}" — ${MAX_M}m 안에 제 ID 를 못 찾았다. 그대로 둔다`); unsure++; continue; }
    if (takenIds.has(best.id)) { console.log(`   ? "${r.name}" → ${best.displayName?.text} 는 이미 다른 행이 쓴다. 그대로 둔다`); unsure++; continue; }

    console.log(`   ${APPLY ? "✔" : "→"} "${r.name}" ⇒ ${best.id} "${best.displayName?.text}" (${best.m}m)`);
    if (!APPLY) { takenIds.add(best.id); fixed++; continue; }
    const res = await fetch(`${URL_}/rest/v1/places?id=eq.${r.id}`, {
      method: "PATCH",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({ google_place_id: best.id, google_maps_url: null }),
    });
    if (!res.ok) { console.log(`      ✖ 저장 실패 ${res.status} ${await res.text()}`); continue; }
    takenIds.add(best.id);
    fixed++;
  }
}

console.log(
  `\n${APPLY ? "고침" : "고칠 예정"} ${fixed}건 · 판단 못 한 행 ${unsure}건` +
    (APPLY ? " — 공개 화면 반영은 캐시 만료(1시간) 후" : " · 실제로 쓰려면 --apply"),
);
