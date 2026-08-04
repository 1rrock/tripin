#!/usr/bin/env node
/**
 * 좌표 없는 장소의 좌표를 자동으로 채운다.
 *
 * 사용: node scripts/ingest/backfill-coords.mjs [--dry]
 *
 * 우선순위:
 *   1. google_maps_url 이 공유 링크(maps.app.goo.gl 등)면 → 리다이렉트 URL의 !3d!4d(핀 좌표) / @ 좌표
 *   2. 일본(JP) 주소 → 국토지리원(GSI) 주소 검색 (무료, 키 불필요)
 *   3. 그 외 → OSM Nominatim (1초 딜레이, 정중한 UA)
 *
 * 자동 확정은 하지 않는다 — 좌표만 채우고 map_status 는 그대로 둔다.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const DRY = process.argv.includes("--dry");

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
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("✖ .env.local 에 Supabase 키가 없습니다");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const UA = "tripin-admin-backfill/1.0 (local tool)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 구글 공유 링크 → 최종 URL 의 좌표. !3d!4d(장소 핀)가 @(지도 중심)보다 정확하다. */
async function fromShareLink(url) {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0" } });
    const final = res.url;
    const d34 = final.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (d34) return { lat: Number(d34[1]), lng: Number(d34[2]), via: "구글 공유링크(핀)" };
    const at = final.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) return { lat: Number(at[1]), lng: Number(at[2]), via: "구글 공유링크(중심)" };
  } catch {}
  return null;
}

/** 국토지리원 주소 검색 — 일본 주소 전용. */
async function fromGsi(address) {
  try {
    const res = await fetch(
      `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`,
      { headers: { "user-agent": UA } },
    );
    const data = await res.json();
    const [lng, lat] = data?.[0]?.geometry?.coordinates ?? [];
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng, via: "GSI 주소" };
  } catch {}
  return null;
}

/** OSM Nominatim — JP 외 지역 폴백. */
async function fromNominatim(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { "user-agent": UA } },
    );
    const data = await res.json();
    const hit = data?.[0];
    if (hit) return { lat: Number(hit.lat), lng: Number(hit.lon), via: "Nominatim" };
  } catch {}
  return null;
}

function isShareLink(url) {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/.test(url ?? "");
}

const places = await (
  await fetch(
    `${URL_}/rest/v1/places?or=(lat.is.null,lng.is.null)&select=id,slug,name,name_local,address,country_code,google_maps_url`,
    { headers: H },
  )
).json();
console.log(`좌표 없는 장소: ${places.length}곳${DRY ? " (dry-run)" : ""}`);

for (const p of places) {
  let hit = null;
  if (isShareLink(p.google_maps_url)) hit = await fromShareLink(p.google_maps_url);
  if (!hit && p.country_code === "JP" && p.address) hit = await fromGsi(p.address);
  if (!hit) {
    // 상호는 OSM 에 없는 경우가 많다 — 주소 단독(층·괄호 부속 표기 제거)이 히트율이 높다
    const cleanAddress = p.address
      ?.replace(/\(.*?\)/g, "")
      .replace(/\s*\d+층\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    for (const q of [cleanAddress, [p.name_local ?? p.name, cleanAddress].filter(Boolean).join(" ")]) {
      if (!q) continue;
      await sleep(1100); // Nominatim 예의상 딜레이
      hit = await fromNominatim(q);
      if (hit) break;
    }
  }
  if (!hit) {
    console.log(`  ✖ ${p.slug}: 좌표 확인 실패 — 어드민에서 직접 입력`);
    continue;
  }
  if (DRY) {
    console.log(`  · ${p.slug}: ${hit.lat}, ${hit.lng} (${hit.via})`);
    continue;
  }
  const res = await fetch(`${URL_}/rest/v1/places?id=eq.${p.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ lat: hit.lat, lng: hit.lng }),
  });
  console.log(`  ${res.ok ? "✔" : "✖"} ${p.slug}: ${hit.lat}, ${hit.lng} (${hit.via})`);
}
