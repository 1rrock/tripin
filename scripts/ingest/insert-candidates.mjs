#!/usr/bin/env node
/**
 * 파이프라인 결과를 DB에 등록 — 영상 + 장소 후보(candidate).
 *
 * 사용:
 *   node scripts/ingest/insert-candidates.mjs <payload.json>           # 미리보기 (안 쓴다)
 *   node scripts/ingest/insert-candidates.mjs <payload.json> --apply   # 실제로 등록
 *
 * ⚠️⚠️ **2026-08-24 변경 — 인자만 주고 돌리면 이제 dry-run 이다.**
 *      예전엔 플래그가 아예 없어서 payload 를 넘기는 순간 DB 에 썼다. 리포의
 *      스크립트 절반은 `--apply` 를 요구하는데 이 파일은 안 그래서, "무엇이 들어가나
 *      보려고" 돌린 손이 그대로 등록을 실행했다. `--apply` 기본으로 통일했다.
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
 *   · 이미 있는 영상/장소 슬러그는 건너뛴다 (재실행 안전). 장소가 이미 있으면
 *     **video_places 링크만** 다시 붙인다 — 1회차에 장소는 들어갔는데 링크가 실패한
 *     경우 재실행으로 회수된다.
 *   · 업종(place_type)은 payload 에 없으면 'unknown' 이다. 'restaurant' 로 채우면
 *     안 된다 — 진짜 식당과 구분이 안 되고, /admin/confirm 과
 *     auto-confirm-candidates.mjs 의 "unknown 이면 다시 분류" 분기가 영영 안 돈다.
 *     (parse-description.mjs 가 "업종은 사람이 확정"이라며 unknown 을 쓰는 이유다)
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

/**
 * ⚠️ res.ok 를 반드시 본다. 키 만료·5xx 면 PostgREST 가 배열이 아니라 에러 객체를 준다 —
 *    예전엔 그걸 그대로 돌려줘서 `creators[0]` 이 undefined 가 되고 "크리에이터 없음 —
 *    어드민에서 먼저 생성하세요" 라는 **틀린 원인**을 알렸다.
 */
async function get(path) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: H });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`조회 실패 ${res.status} ${path.split("?")[0]}: ${JSON.stringify(body).slice(0, 200)}`);
  if (!Array.isArray(body)) throw new Error(`조회 응답이 배열이 아님 (${path.split("?")[0]}): ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}
async function post(path, body, prefer = "return=representation") {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method: "POST",
    headers: { ...H, Prefer: prefer },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, body: res.ok ? await res.json().catch(() => null) : await res.text() };
}

const argv = process.argv.slice(2);
// 기본이 dry-run 이다 — 쓰려면 --apply (파일 머리의 2026-08-24 변경 참조)
const APPLY = argv.includes("--apply");
const payloadFile = argv.find((a) => !a.startsWith("--"));
if (!payloadFile) {
  console.error("사용: node scripts/ingest/insert-candidates.mjs <payload.json> [--apply]");
  process.exit(1);
}
if (!APPLY) console.log("※ dry-run — 아무것도 쓰지 않습니다. 실제로 등록하려면 --apply\n");
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
  if (!APPLY) {
    console.log(`  → 영상(예정): ${v.youtubeVideoId} ${v.title.slice(0, 40)}`);
    added++;
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

/* 이미 있는 장소를 **먼저 조회한다** — 머리말이 약속한 재실행 안전성.
   예전엔 조회 없이 POST 만 해서 (a) 재실행 때 기존 장소마다 `✖ 장소 실패(409)` 가
   찍혀 진짜 실패와 구분이 안 되고 (b) 1회차에 장소는 들어갔는데 video_places 링크가
   실패했으면 2회차가 409 에서 continue 되어 **링크를 영영 못 붙였다**.
   슬러그는 UNIQUE 라(0001_init.sql) 이 조회가 곧 존재 판정이다. */
const wantedSlugs = [...new Set((payload.places ?? []).map((p) => p.slug).filter(Boolean))];
const existingPlaceId = new Map();
for (let i = 0; i < wantedSlugs.length; i += 80) {
  const chunk = wantedSlugs.slice(i, i + 80);
  // in.() 안의 값은 따옴표로 감싸고 개별 인코딩한다 — 구분자 , 는 인코딩하지 않는다
  const list = chunk.map((s) => `"${encodeURIComponent(s)}"`).join(",");
  const rows = await get(`places?slug=in.(${list})&select=id,slug`);
  for (const r of rows) existingPlaceId.set(r.slug, r.id);
}

let placesAdded = 0;
let linksAdded = 0;
let placesSkipped = 0;
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

  let placeId = existingPlaceId.get(p.slug);
  const isNew = !placeId;
  if (isNew) {
    if (!APPLY) {
      console.log(`  → 후보(예정): ${p.name} (${p.citySlug})`);
      placesAdded++;
      continue; // dry-run 에서는 place id 가 없어 링크도 못 만든다
    }
    const r = await post("places", {
      slug: p.slug,
      name: p.name,
      name_local: p.nameLocal ?? null,
      city_id: city.id,
      country_code: city.country_code,
      // 업종은 사람이 확정한다 — 모르면 unknown. 'restaurant' 로 채우면 진짜 식당과 섞인다
      place_type: p.placeType ?? "unknown",
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
    placeId = r.body[0].id;
    existingPlaceId.set(p.slug, placeId);
    placesAdded++;
    console.log(`  ✔ 후보: ${p.name} (${p.citySlug})`);
  } else {
    placesSkipped++;
    console.log(`  · 이미 있음: ${p.slug} — 링크만 확인`);
  }

  /* 링크는 새 장소든 기존 장소든 항상 붙인다. (video_id, place_id) 가 기본키라
     이미 있으면 ignore-duplicates 로 조용히 넘어간다 — 그래서 재실행이 안전하다.
     merge-duplicates 가 아니라 ignore 인 이유: 어드민에서 사람이 다듬은
     timestamp_sec·mention_note 를 파서 값으로 되돌리면 안 된다. */
  if (!APPLY) {
    console.log(`      → 링크(예정): video=${p.youtubeVideoId} place=${p.slug}`);
    continue;
  }
  const link = await post(
    "video_places?on_conflict=video_id,place_id",
    { video_id: videoDbId, place_id: placeId, timestamp_sec: p.timestampSec ?? null, mention_note: p.mentionNote ?? null },
    "return=minimal,resolution=ignore-duplicates",
  );
  if (link.ok) linksAdded++;
  else console.log(`  ⚠ 링크 실패(${link.status}): ${p.slug} ${String(link.body).slice(0, 80)}`);
}
console.log(
  `장소 후보 ${placesAdded}개 ${APPLY ? "추가" : "추가 예정"} · 이미 있어 건너뜀 ${placesSkipped}` +
    (APPLY ? ` · 링크 ${linksAdded}` : "") +
    ` → /admin/confirm 에서 확정하세요`,
);
if (!APPLY) console.log("(dry-run — 아무것도 쓰지 않았습니다. 실제로 등록하려면 --apply)");
