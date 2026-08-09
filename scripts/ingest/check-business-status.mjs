#!/usr/bin/env node
/**
 * 등록된 장소가 **아직 영업 중인지** Places API 로 확인한다.
 *
 * 사용:
 *   node scripts/ingest/check-business-status.mjs            # 조회만 (기본)
 *   node scripts/ingest/check-business-status.mjs --apply    # place_id 저장 + 폐업분 비공개
 *   node scripts/ingest/check-business-status.mjs --city=fukuoka
 *
 * 왜 필요한가 — 오래된 영상에서 온 장소는 이미 문을 닫았을 수 있다.
 * 폐업한 가게를 "유튜버가 다녀간 곳"으로 지도에 남겨 두면 방문자가 헛걸음한다.
 *
 * ⛔ 매칭 규칙 — 이름만으로 찾으면 동명이점을 잘못 집는다(`INGEST.md` §3.3).
 *    ① 공유링크를 따라가 **구글 정식 상호명**을 얻는다. DB 의 한글 음차명으로
 *       검색하면 못 찾는다 — "토리베이"의 실제 상호는 `博多とり料理 鳥米` 다.
 *    ② 저장 좌표 주변 사각형으로 `locationRestriction` 을 건다.
 *       `locationBias` 는 *가중치*라 반경 밖 결과가 섞여 들어온다(실측: 8,413km 떨어진 후보).
 *    ③ 그래도 허용 오차를 넘게 떨어지면 **매칭 실패로 처리한다.**
 *    추측해서 상태를 덮어쓰지 않는다.
 *
 * 약관: `LEGAL.md` §4 — A안(Google Maps) 채택으로 Places 사용이 허용되고,
 *       `place_id` 는 캐싱 제한에서 명시적으로 면제된다(무기한 저장 가능).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA = env.SUPABASE_SERVICE_ROLE_KEY;
// 서버용 Places 키가 따로 있으면 그걸 쓰고, 없으면 YouTube 키로 떨어진다.
// (둘 다 같은 GCP 프로젝트 키이고 Places API 가 켜져 있으면 동작한다)
const GKEY = env.GOOGLE_PLACES_API_KEY || env.YOUTUBE_API_KEY;
if (!URL_ || !SUPA || !GKEY) {
  console.error("✖ .env.local 에 Supabase 키 또는 Google API 키가 없습니다");
  process.exit(1);
}
const H = { apikey: SUPA, Authorization: `Bearer ${SUPA}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const city = args.find((a) => a.startsWith("--city="))?.split("=")[1];

/**
 * 검색 결과가 저장 좌표에서 이보다 멀면 다른 가게로 본다.
 *
 * 좌표 출처에 따라 다르게 잡는다. 공유링크에서 뽑은 좌표는 크리에이터가 찍은 **핀**이라
 * 오차가 거의 없지만, 주소를 지오코딩(GSI·Nominatim)해서 얻은 좌표는 건물·블록 단위로
 * 흔들린다. 같은 임계값을 쓰면 후자가 통째로 "매칭 실패"로 떨어진다
 * (실측: 부산 만리향 259m, 중앙곰탕 273m — 둘 다 실재하는데 250m 임계에 걸렸다).
 *
 * 느슨한 쪽은 이름 일치를 함께 요구하므로 엉뚱한 가게를 집을 위험은 낮다.
 */
const DRIFT_PIN_M = 250;
const DRIFT_GEOCODED_M = 700;
/** locationRestriction 사각형의 반변 길이(도). 위도 0.0025° ≈ 280m. */
const BOX_DEG = 0.0025;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 공유링크를 따라가 구글 정식 상호명을 얻는다. 실패하면 null. */
async function canonicalName(shareUrl) {
  if (!shareUrl) return null;
  try {
    const res = await fetch(shareUrl, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0" } });
    const seg = res.url.split("/place/")[1];
    if (!seg) return null;
    const name = decodeURIComponent(seg.split("/")[0]).replace(/\+/g, " ").trim();
    return name && !name.startsWith("@") ? name : null;
  } catch {
    return null;
  }
}

const meters = (a, b) => {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const q = new URLSearchParams({
  select:
    "id,slug,name,name_local,lat,lng,is_published,map_status,google_place_id,google_maps_url,cities!inner(slug)",
  lat: "not.is.null",
  ...(city ? { "cities.slug": `eq.${city}` } : {}),
});
const places = await (await fetch(`${URL_}/rest/v1/places?${q}`, { headers: H })).json();
console.log(`대상 ${places.length}곳${city ? ` (${city})` : ""}${APPLY ? " — 적용 모드" : " — 조회만"}\n`);

const out = { operational: [], closed: [], temp: [], nomatch: [] };

for (const p of places) {
  // 공유링크의 정식 상호명이 1순위. 없으면 저장된 현지명 → 한글명 순으로 떨어진다
  const canon = await canonicalName(p.google_maps_url);
  const body = {
    textQuery: canon || p.name_local || p.name,
    languageCode: "ko",
    maxResultCount: 5,
    // locationBias 가 아니라 Restriction — 반경 밖 결과를 아예 배제한다
    locationRestriction: {
      rectangle: {
        low: { latitude: p.lat - BOX_DEG, longitude: p.lng - BOX_DEG },
        high: { latitude: p.lat + BOX_DEG, longitude: p.lng + BOX_DEG },
      },
    },
  };
  const search = async (payload) => {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GKEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.businessStatus,places.location",
      },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 160));
    return j.places ?? [];
  };

  /** 좌표로 직접 훑어 정식 상호명과 이름이 겹치는 후보를 찾는다 (텍스트 검색 최후 폴백). */
  const nearbyByName = async () => {
    if (!canon) return [];
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GKEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.businessStatus,places.location",
      },
      body: JSON.stringify({
        maxResultCount: 20,
        languageCode: "ko",
        locationRestriction: {
          circle: {
            center: { latitude: p.lat, longitude: p.lng },
            radius: p.google_maps_url ? DRIFT_PIN_M : DRIFT_GEOCODED_M,
          },
        },
      }),
    });
    if (!res.ok) return [];
    const norm = (s) => s.toLowerCase().replace(/[\s・･·]/g, "");
    const key = norm(canon);
    return ((await res.json()).places ?? []).filter((it) => {
      const n = norm(it.displayName?.text ?? "");
      return n && (key.includes(n) || n.includes(key));
    });
  };

  let items = [];
  try {
    items = await search(body);
    if (items.length === 0) {
      // 폐업한 업소는 좁힌 검색에서 빠지는 경우가 있다. 넓게 한 번 더 물어본다 —
      // "결과 없음"을 폐업으로 단정하지 않기 위해서다. 거리 검증은 그대로 적용된다.
      await sleep(120);
      const wide = { ...body };
      delete wide.locationRestriction;
      items = await search({
        ...wide,
        locationBias: { circle: { center: { latitude: p.lat, longitude: p.lng }, radius: 500 } },
      });
    }
  } catch (e) {
    console.log(`  ⚠ 조회 실패: ${p.name} — ${String(e.message ?? e).slice(0, 80)}`);
    out.nomatch.push({ ...p, why: "API 오류" });
    await sleep(120);
    continue;
  }

  // 저장 좌표에 가장 가까운 후보를 고르고, 그마저 멀면 매칭 실패로 둔다
  const pick = (list) =>
    list
      .map((it) => ({
        it,
        d: meters({ lat: p.lat, lng: p.lng }, { lat: it.location.latitude, lng: it.location.longitude }),
      }))
      .sort((a, b) => a.d - b.d)[0];

  // 공유링크 핀이면 좁게, 주소 지오코딩 좌표면 넓게 (상수 주석 참조)
  const maxDrift = p.google_maps_url ? DRIFT_PIN_M : DRIFT_GEOCODED_M;

  let best = pick(items);
  if (!best || best.d > maxDrift) {
    // 텍스트 검색이 못 찾거나 엉뚱한 걸 물어 온 경우 — 좌표로 훑어 이름이 겹치는 걸 찾는다
    await sleep(120);
    const near = pick(await nearbyByName());
    if (near && near.d <= maxDrift) best = near;
  }

  if (!best || best.d > maxDrift) {
    out.nomatch.push({ ...p, why: best ? `가장 가까운 후보도 ${Math.round(best.d)}m` : "후보 없음" });
    console.log(`  ? ${p.name} — 매칭 실패 (${best ? `${Math.round(best.d)}m` : "후보 없음"})`);
    await sleep(120);
    continue;
  }

  const status = best.it.businessStatus ?? "UNKNOWN";
  const rec = {
    ...p,
    placeId: best.it.id,
    status,
    drift: Math.round(best.d),
    found: best.it.displayName?.text,
    canon,
  };
  if (status === "CLOSED_PERMANENTLY") {
    out.closed.push(rec);
    console.log(`  ✖ 폐업: ${p.name} (${rec.found})`);
  } else if (status === "CLOSED_TEMPORARILY") {
    out.temp.push(rec);
    console.log(`  ⏸ 임시휴업: ${p.name}`);
  } else {
    out.operational.push(rec);
  }
  await sleep(120); // 정중한 호출 간격
}

console.log(
  `\n영업중 ${out.operational.length} · 폐업 ${out.closed.length} · 임시휴업 ${out.temp.length} · 매칭실패 ${out.nomatch.length}`,
);

if (out.nomatch.length) {
  console.log("\n매칭 실패 — 사람이 봐야 한다 (상태를 추측해 덮어쓰지 않았다):");
  for (const p of out.nomatch) console.log(`  · ${p.name} — ${p.why}`);
}

if (!APPLY) {
  console.log("\n(조회만 했다. 반영하려면 --apply)");
  process.exit(0);
}

// ── 반영 ──
// place_id 는 전부 저장한다 (LEGAL.md §4 — 캐싱 제한 면제, 딥링크용)
let saved = 0;
let localed = 0;
for (const r of [...out.operational, ...out.closed, ...out.temp]) {
  const patch = {};
  if (r.google_place_id !== r.placeId) patch.google_place_id = r.placeId;
  // 현지 표기가 비어 있고 정식 상호가 일본어면 채운다 — 지도앱 검색·표기에 쓰인다
  if (!r.name_local && r.canon && /[぀-ヿ一-鿿]/.test(r.canon)) patch.name_local = r.canon;
  if (Object.keys(patch).length === 0) continue;
  const res = await fetch(`${URL_}/rest/v1/places?id=eq.${r.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (res.ok) {
    if (patch.google_place_id) saved++;
    if (patch.name_local) localed++;
  }
}
console.log(`place_id 저장 ${saved}건 · 현지명 채움 ${localed}건`);

// 폐업은 비공개로 내린다. 삭제하지 않는다 — 오탐일 수 있고 이력도 남겨야 한다
let hidden = 0;
for (const r of out.closed) {
  const res = await fetch(`${URL_}/rest/v1/places?id=eq.${r.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ is_published: false, updated_at: new Date().toISOString() }),
  });
  if (res.ok) hidden++;
}
console.log(`폐업 비공개 처리 ${hidden}건 (삭제 아님 — /admin 에서 확인 후 판단)`);
