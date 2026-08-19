#!/usr/bin/env node
/**
 * 자동 지오코딩이 일본/한국 밖 좌표를 넣은 후보를 정리한다.
 * - bounds 밖 → lat/lng NULL
 * - 주소가 있으면 GSI(일본) 재시도
 * - google_maps_url 있으면 공유링크 핀 재해석
 *
 * 사용: node scripts/ingest/fix-bad-coords.mjs [--dry]
 */
import { loadEnv } from "./_lib/env.mjs";
import { fromGsi, fromShareLink, inAU, inES, inJP, inKR } from "./_lib/geocode.mjs";

const DRY = process.argv.includes("--dry");
const env = loadEnv();
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("✖ .env.local 에 Supabase 키가 없습니다");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const okFor = (cc, lat, lng) =>
  cc === "KR" ? inKR(lat, lng) : cc === "JP" ? inJP(lat, lng) : cc === "AU" ? inAU(lat, lng) : cc === "ES" ? inES(lat, lng) : true;

async function gsi(q) {
  const hit = await fromGsi(q);
  return hit ? { lat: hit.lat, lng: hit.lng, title: hit.title } : null;
}

async function fromShare(url) {
  const hit = await fromShareLink(url);
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
}

const NAME_GSI = {
  "하나코지 사와다": ["花小路さわだ", "北海道札幌市中央区南1条西2"],
  "마루스시": ["丸寿司 札幌", "北海道札幌市中央区"],
  "스시킨": ["すしきん 札幌", "北海道札幌市"],
  "쿠리야 스이잔": ["厨翠山", "翠山 札幌"],
  "멘야 사이미": ["麺屋彩未", "北海道札幌市豊平区美園10条5丁目3-12"],
  "토쿠이치": ["とくいち 札幌", "北海道札幌市中央区北11条西22丁目1-26"],
  "몰리에르": ["モリエール 札幌", "北海道札幌市中央区宮ケ丘2丁目1-1"],
  "르 장띠옴므": ["ジャンティヨム 札幌", "Le Gentilhomme 札幌"],
  "스시야쇼타": null, // 주소 없음 — clear only
  "금손1983": null,
};

const places = await (
  await fetch(
    `${URL_}/rest/v1/places?select=id,slug,name,address,lat,lng,google_maps_url,country_code&map_status=eq.candidate&order=created_at.desc&limit=400`,
    { headers: H },
  )
).json();

if (!Array.isArray(places)) {
  console.error("✖ places fetch failed", places);
  process.exit(1);
}

let cleared = 0,
  fixed = 0,
  left = 0;

for (const p of places) {
  const bad = p.lat != null && !okFor(p.country_code, p.lat, p.lng);
  const missing = p.lat == null;
  if (!bad && !missing) continue;

  if (!["JP", "KR", "AU", "ES"].includes(p.country_code)) continue;

  if (bad) {
    console.log(`CLEAR ${p.name}  was ${p.lat},${p.lng}`);
    if (!DRY) {
      await fetch(`${URL_}/rest/v1/places?id=eq.${p.id}`, {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({ lat: null, lng: null }),
      });
    }
    cleared++;
    p.lat = null;
    p.lng = null;
  }

  let hit = null;

  if (p.google_maps_url) {
    hit = await fromShare(p.google_maps_url);
    if (hit && !okFor(p.country_code, hit.lat, hit.lng)) hit = null;
  }

  if (!hit && p.address && p.country_code === "JP") {
    const qs = [];
    if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(p.address)) {
      qs.push(p.address.replace(/〒\s?/, "").split(/[|\n]/)[0].trim());
    }
    if (/Misono 10/.test(p.address)) qs.push("北海道札幌市豊平区美園10条5丁目3-12");
    if (/Kita 11/.test(p.address) && /22/.test(p.address)) qs.push("北海道札幌市中央区北11条西22丁目1-26");
    if (/Miyagaoka/.test(p.address) && /2 Chome/.test(p.address)) qs.push("北海道札幌市中央区宮ケ丘2丁目1-1");
    if (/宮ケ丘1-2-38/.test(p.address)) qs.push("北海道札幌市中央区宮ケ丘1-2-38");
    if (/Miyanomori 1 Jo/.test(p.address)) qs.push("北海道札幌市中央区宮の森1条14丁目3-20");
    for (const q of qs) {
      hit = await gsi(q);
      if (hit && okFor("JP", hit.lat, hit.lng)) break;
      hit = null;
    }
  }

  if (!hit && NAME_GSI[p.name]) {
    for (const q of NAME_GSI[p.name]) {
      hit = await gsi(q);
      if (hit && okFor("JP", hit.lat, hit.lng)) break;
      hit = null;
    }
  }

  if (hit) {
    console.log(`FIX   ${p.name} → ${hit.lat}, ${hit.lng}${hit.title ? " (" + hit.title + ")" : ""}`);
    if (!DRY) {
      await fetch(`${URL_}/rest/v1/places?id=eq.${p.id}`, {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({ lat: hit.lat, lng: hit.lng }),
      });
    }
    fixed++;
  } else {
    console.log(`LEAVE ${p.name} (no reliable coord)`);
    left++;
  }
}

console.log(`\ndone cleared=${cleared} fixed=${fixed} left=${left} dry=${DRY}`);
