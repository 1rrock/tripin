#!/usr/bin/env node
/**
 * 파이프라인 결과를 DB에 등록 — 영상 + 장소 후보(candidate).
 *
 * 사용: node scripts/ingest/insert-candidates.mjs <payload.json>
 *
 * payload 형식:
 * {
 *   "creatorSlug": "chuseonghoon",
 *   "videos":  [{ "youtubeVideoId": "...", "title": "..." }],
 *   "places": [{
 *     "youtubeVideoId": "...", "citySlug": "tokyo",
 *     "slug": "...", "name": "...", "nameLocal": null, "placeType": "restaurant",
 *     "lat": null, "lng": null, "address": null,
 *     "googleMapsUrl": null, "kakaoPlaceId": null, "naverPlaceId": null,
 *     "timestampSec": 123, "mentionNote": "...", "sourceNote": "..."
 *   }]
 * }
 *
 * ⛔ 규칙:
 *   · 장소는 전부 map_status='candidate', is_published=false 로 들어간다.
 *     확정은 /admin/confirm 에서 사람이 한다 (오확정 방지 — LEGAL.md 4.6)
 *   · 이미 있는 영상/장소 슬러그는 건너뛴다 (재실행 안전)
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
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("✖ .env.local 에 Supabase 키가 없습니다");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function get(path) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: H });
  return res.json();
}
async function post(path, body, prefer = "return=representation") {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method: "POST",
    headers: { ...H, Prefer: prefer },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, body: res.ok ? await res.json().catch(() => null) : await res.text() };
}

const payloadFile = process.argv[2];
if (!payloadFile) {
  console.error("사용: node scripts/ingest/insert-candidates.mjs <payload.json>");
  process.exit(1);
}
const payload = JSON.parse(readFileSync(payloadFile, "utf8"));

// ── 크리에이터 확인 ──
const creators = await get(`creators?slug=eq.${payload.creatorSlug}&select=id,display_name`);
const creator = creators[0];
if (!creator) {
  console.error(`✖ 크리에이터 없음: ${payload.creatorSlug} — 어드민에서 먼저 생성하세요`);
  process.exit(1);
}
console.log(`크리에이터: ${creator.display_name}`);

// ── 영상 등록 (중복 스킵) ──
const existing = await get(`videos?creator_id=eq.${creator.id}&select=youtube_video_id,id`);
const existingIds = new Map(existing.map((v) => [v.youtube_video_id, v.id]));
let added = 0;
for (const v of payload.videos ?? []) {
  if (existingIds.has(v.youtubeVideoId)) {
    console.log(`  · 이미 있음: ${v.youtubeVideoId} ${v.title.slice(0, 30)}`);
    continue;
  }
  // published_at·duration_sec 를 여기서 채운다. 안 채우면 갱신 배치가 돌 때까지
  // 타임라인이 "길이(추정)"로 돌고 최신성 정렬도 안 된다 (HANDOFF.md §4-2)
  const r = await post("videos", {
    creator_id: creator.id,
    youtube_video_id: v.youtubeVideoId,
    title: v.title,
    published_at: v.publishedAt ?? null,
    duration_sec: v.durationSec ?? null,
  });
  if (r.ok) {
    existingIds.set(v.youtubeVideoId, r.body[0].id);
    added++;
    console.log(`  ✔ 영상: ${v.youtubeVideoId} ${v.title.slice(0, 40)}`);
  } else {
    console.log(`  ✖ 영상 실패(${r.status}): ${v.youtubeVideoId} ${String(r.body).slice(0, 80)}`);
  }
}
console.log(`영상 ${added}개 추가 (기존 ${existing.length}개)`);

// ── 장소 후보 등록 ──
const cities = await get("cities?select=id,slug,country_code");
const cityBySlug = new Map(cities.map((c) => [c.slug, c]));
let placesAdded = 0;
for (const p of payload.places ?? []) {
  const city = cityBySlug.get(p.citySlug);
  if (!city) {
    console.log(`  ✖ 도시 없음: ${p.citySlug} (${p.name}) — 어드민에서 먼저 생성하세요`);
    continue;
  }
  const videoDbId = existingIds.get(p.youtubeVideoId);
  if (!videoDbId) {
    console.log(`  ✖ 영상 미등록: ${p.youtubeVideoId} (${p.name})`);
    continue;
  }
  const r = await post("places", {
    slug: p.slug,
    name: p.name,
    name_local: p.nameLocal ?? null,
    city_id: city.id,
    country_code: city.country_code,
    place_type: p.placeType ?? "restaurant",
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    address: p.address ?? null,
    google_maps_url: p.googleMapsUrl ?? null,
    kakao_place_id: p.kakaoPlaceId ?? null,
    naver_place_id: p.naverPlaceId ?? null,
    map_status: "candidate", // 확정은 사람이 — 자동 확정 금지
    source_note: p.sourceNote ?? null,
  });
  if (!r.ok) {
    console.log(`  ✖ 장소 실패(${r.status}): ${p.slug} ${String(r.body).slice(0, 80)}`);
    continue;
  }
  const placeId = r.body[0].id;
  const link = await post(
    "video_places",
    { video_id: videoDbId, place_id: placeId, timestamp_sec: p.timestampSec ?? null, mention_note: p.mentionNote ?? null },
    "return=minimal",
  );
  if (!link.ok) {
    console.log(`  ⚠ 링크 실패: ${p.slug}`);
  }
  placesAdded++;
  console.log(`  ✔ 후보: ${p.name} (${p.citySlug})`);
}
console.log(`장소 후보 ${placesAdded}개 추가 → /admin/confirm 에서 확정하세요`);
