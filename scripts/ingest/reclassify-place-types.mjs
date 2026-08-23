/**
 * 이미 확정된 장소의 `place_type` 을 Google Places 응답으로 다시 매긴다.
 *
 *   node scripts/ingest/reclassify-place-types.mjs                 # 미리보기(기본)
 *   node scripts/ingest/reclassify-place-types.mjs --limit 50      # 앞 50곳만
 *   node scripts/ingest/reclassify-place-types.mjs --apply         # 실제로 쓴다
 *
 * ## 왜 별도 스크립트인가
 *
 * `auto-confirm-candidates.mjs` 의 `--reclassify` 로는 이 일을 못 한다. 그 스크립트는
 * `.eq("map_status","candidate")` 로 대상을 고르는데 프로덕션에 candidate 행이 **0개**다
 * (전부 confirmed). 즉 그 플래그는 "앞으로 들어올 후보"에만 듣고, 이미 굳은 1,724행은
 * 손대지 못한다. 2026-08-24 에 실측으로 확인했다.
 *
 * ## 무엇이 잘못돼 있었나
 *
 * 확정 장소 1,845곳 중 restaurant 가 1,724곳(93.44%)이다. 원인은 분류기가 틀린 게
 * 아니라 **불린 적이 없다는 것**이었다 — `insert-candidates.mjs` 가 `?? "restaurant"`
 * 로 넣어 DB 에 `unknown` 이 0행이었고, auto-confirm 은 `unknown` 일 때만 분류했다.
 * Places 응답을 받아 놓고 버린 셈이다. 그래서 고쿠라성·이츠쿠시마 신사·후쿠오카타워·
 * 니시키시장·호텔 13곳이 "맛집" 으로 서 있다.
 *
 * ## 안전 장치
 *
 * 1. **퍼지 검색을 안 쓴다.** 이미 있는 `google_place_id` 로 Place Details 만 부른다.
 *    텍스트 검색 폴백은 2026-08-18 후쿠오카 오확정 무더기를 만든 바로 그 경로다.
 *    place_id 가 없는 행(130곳)은 손대지 않고 건너뛴다.
 * 2. **`place_type` 한 칸만 쓴다.** 이름·좌표·요약·링크는 건드리지 않는다.
 * 3. **restaurant 으로는 안 바꾼다.** 원래 restaurant 인 것만 대상이라 무의미하고,
 *    혹시 다른 종류가 섞여 들어와도 이 스크립트가 맛집으로 되돌리는 일은 없다.
 * 4. **`unknown` 이면 기존 값을 유지한다.** 모르는데 덮지 않는다.
 * 5. 기본이 dry-run 이다. 리포의 다른 스크립트와 같은 규약(`--apply`).
 * 6. 사람이 어드민에서 손으로 고른 값을 되돌릴 수 있다 — 그래서 바꾼 행을
 *    `tmp/reclassify-<타임스탬프>.json` 에 **전부 적어 둔다**(되돌릴 재료).
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { loadEnv, requireEnv } from "./_lib/env.mjs";
import { mapPlaceType } from "./_lib/place-type.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const env = loadEnv();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_PLACES_API_KEY"]);

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const LIMIT = Number((args.find((a) => a.startsWith("--limit=")) ?? "").split("=")[1] || 0) || null;

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PLACES_HEADERS = {
  "Content-Type": "application/json",
  "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
  Referer: "https://eatripin.com",
};

/** 1000행 상한을 넘겨 전부 읽는다 (PostgREST db-max-rows 기본 1000). */
async function all(table, select, apply) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select(select).range(from, from + 999);
    q = apply(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`);
    if (!Array.isArray(data)) throw new Error(`${table} 응답이 배열이 아님`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

async function detail(placeId) {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ko`,
    { headers: { ...PLACES_HEADERS, "X-Goog-FieldMask": "id,types,primaryType,displayName" } },
  );
  if (!res.ok) {
    /* 실패는 삼키지 않는다 — 조용히 건너뛰면 "검사했는데 깨끗했다" 로 읽힌다.
       특히 429(쿼터)·403(리퍼러)은 전건에서 나므로 말미 집계로 반드시 드러나야 한다. */
    return { error: `${res.status} ${(await res.text()).slice(0, 100)}` };
  }
  return res.json();
}

const rows = await all("places", "id, slug, name, place_type, google_place_id", (q) =>
  q.eq("place_type", "restaurant").eq("is_published", true).order("slug"),
);

const target = rows.filter((r) => r.google_place_id);
const skippedNoPid = rows.length - target.length;
const work = LIMIT ? target.slice(0, LIMIT) : target;

console.log(
  `restaurant·공개 ${rows.length}곳 · place_id 있음 ${target.length}곳` +
    `${skippedNoPid ? ` · place_id 없어 제외 ${skippedNoPid}곳` : ""}\n` +
    `이번 대상 ${work.length}곳${APPLY ? "" : " (dry-run — 쓰려면 --apply)"}\n`,
);

const changes = [];
const failures = [];
let unknown = 0;
let same = 0;

for (const [i, p] of work.entries()) {
  const d = await detail(p.google_place_id);
  if (d.error) {
    failures.push({ slug: p.slug, name: p.name, error: d.error });
  } else {
    const next = mapPlaceType(d.types, d.primaryType);
    if (next === "unknown") unknown++;
    else if (next === "restaurant") same++;
    else {
      changes.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        from: p.place_type,
        to: next,
        primaryType: d.primaryType ?? null,
        types: d.types ?? [],
      });
      console.log(`  ${p.name}  →  ${next}   (primaryType: ${d.primaryType ?? "-"})`);
    }
  }
  if ((i + 1) % 100 === 0) console.log(`  … ${i + 1}/${work.length}`);
  await sleep(60); // Places QPS 여유
}

console.log(
  `\n바꿀 것 ${changes.length} · 그대로 ${same} · 판정불가(unknown, 유지) ${unknown}` +
    `${failures.length ? ` · 조회 실패 ${failures.length}` : ""}`,
);

if (failures.length) {
  console.log("\n조회 실패 — 이 행들은 손대지 않았다:");
  for (const f of failures.slice(0, 10)) console.log(`  · ${f.name}: ${f.error}`);
  if (failures.length > 10) console.log(`  … 외 ${failures.length - 10}곳`);
}

if (!changes.length) {
  console.log("\n바꿀 것이 없습니다.");
  process.exitCode = failures.length ? 1 : 0;
} else if (!APPLY) {
  console.log("\n(dry-run — 아무것도 쓰지 않았습니다. 실제로 쓰려면 --apply)");
} else {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const report = join(ROOT, "tmp", `reclassify-${stamp}.json`);
  mkdirSync(dirname(report), { recursive: true });
  writeFileSync(report, JSON.stringify(changes, null, 2));
  console.log(`\n되돌릴 재료를 먼저 남겼다: ${report}`);

  let done = 0;
  for (const c of changes) {
    const { error } = await db.from("places").update({ place_type: c.to }).eq("id", c.id);
    if (error) {
      console.log(`  ✖ ${c.name}: ${error.message}`);
      failures.push({ slug: c.slug, name: c.name, error: error.message });
    } else done++;
  }
  console.log(`\n${done}곳 반영 완료.`);
  console.log("⚠️ 공개 캐시는 이 스크립트가 안 비운다 — `vercel cache invalidate --tag public-data`");
  if (failures.length) process.exitCode = 1;
}
