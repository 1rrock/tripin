#!/usr/bin/env node
/**
 * 인제스트에 필요한 도시가 없으면 생성한다.
 *
 * 사용: node scripts/ingest/ensure-cities.mjs <cities.json>
 * cities.json: [{ "slug", "name", "nameEn", "countryCode", "lat", "lng" }]
 *
 * 이미 있는 슬러그는 건너뛴다 (재실행 안전).
 */
import { readFileSync } from "node:fs";
import { loadEnv } from "./_lib/env.mjs";



const env = loadEnv();
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("✖ .env.local 에 Supabase 키가 없습니다");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const file = process.argv[2];
if (!file) {
  console.error("사용: node scripts/ingest/ensure-cities.mjs <cities.json>");
  process.exit(1);
}
const wanted = JSON.parse(readFileSync(file, "utf8"));

const existing = await (await fetch(`${URL_}/rest/v1/cities?select=slug`, { headers: H })).json();
const have = new Set(existing.map((c) => c.slug));
console.log(`기존 도시: ${[...have].join(", ") || "(없음)"}`);

for (const c of wanted) {
  if (have.has(c.slug)) {
    console.log(`  · 이미 있음: ${c.slug}`);
    continue;
  }
  const res = await fetch(`${URL_}/rest/v1/cities`, {
    method: "POST",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({
      slug: c.slug,
      name: c.name,
      name_en: c.nameEn,
      country_code: c.countryCode,
      lat: c.lat,
      lng: c.lng,
    }),
  });
  console.log(`  ${res.ok ? "✔" : "✖"} ${c.slug} (${res.status})${res.ok ? "" : " " + (await res.text()).slice(0, 100)}`);
}
