#!/usr/bin/env node
/**
 * 폐업 확인 — Google Places 의 `businessStatus` 로 등록된 장소를 훑는다.
 *
 *   npm run check:closed              확인만 하고 리포트 (아무것도 안 바꾼다)
 *   npm run check:closed -- --hide    영구 폐업으로 나온 곳을 비공개 처리
 *   npm run check:closed -- --delete  영구 폐업으로 나온 곳을 삭제 (⚠️ 되돌릴 수 없다)
 *   npm run check:closed -- --limit 5 소량 시험
 *
 * ⚠️ **기본값은 아무것도 바꾸지 않는다.** 폐업 판정은 오탐이 난다 — 상호를 바꿔
 *    재개업했거나, 이전했거나, 구글 쪽 데이터가 밀린 경우가 있다. 사람이 목록을
 *    먼저 보고 결정해야 한다.
 *
 * `--hide` 를 권한다. `--delete` 는 `video_places` 를 CASCADE 로 같이 지워서
 * "이 채널이 여기 갔었다"는 사실 자체가 사라진다. 되살리려면 수집을 다시 해야 한다.
 * 비공개는 유저에게 안 보이는 효과가 같으면서 되돌릴 수 있다.
 *
 * 약관: `place_id` 는 무기한 보관이 명시적으로 면제돼 있고(LEGAL.md 4장),
 * 여기서 받은 `businessStatus` 는 **화면에 표시하지 않는다** — 내부 판단에만 쓴다.
 *
 * ⚠️ 키는 `GOOGLE_PLACES_API_KEY`(서버용)여야 한다. `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
 *    는 HTTP 리퍼러 제한이 걸린 브라우저 키라 서버에서 호출하면 403
 *    (`API_KEY_HTTP_REFERRER_BLOCKED`) 이 난다.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = { ...loadEnvLocal(), ...process.env };
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const HIDE = flag("hide");
const DELETE = flag("delete");
const LIMIT = Number(value("limit", "0")) || null;

if (HIDE && DELETE) {
  console.error("✖ --hide 와 --delete 를 같이 쓸 수 없습니다. 하나만 고르세요.");
  process.exit(1);
}

for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_PLACES_API_KEY"]) {
  if (!env[key]) {
    console.error(`✖ ${key} 가 .env.local 에 없거나 값이 비어 있습니다.`);
    if (key === "GOOGLE_PLACES_API_KEY") {
      console.error("  서버용 키가 필요합니다 — 리퍼러 제한이 걸린 브라우저 키로는 403 이 납니다.");
    }
    process.exit(1);
  }
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * 한 곳의 영업 상태.
 * 응답에 `businessStatus` 가 없으면 구글이 모른다는 뜻이지 영업 중이라는 뜻이 아니다 —
 * "UNKNOWN" 으로 따로 센다. 이걸 OPERATIONAL 로 뭉개면 폐업을 놓친다.
 */
async function fetchStatus(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": "id,displayName,businessStatus",
    },
  });
  if (res.status === 404) return { status: "NOT_FOUND" };
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${body.slice(0, 160)}`);
  }
  const data = await res.json();
  return {
    status: data.businessStatus ?? "UNKNOWN",
    googleName: data.displayName?.text ?? null,
  };
}

async function run() {
  let q = db
    .from("places")
    .select("id, name, google_place_id, is_published, map_status")
    .order("name");
  if (LIMIT) q = q.limit(LIMIT);
  const { data: places, error } = await q;
  if (error) throw error;

  const checkable = places.filter((p) => p.google_place_id);
  const unchecked = places.filter((p) => !p.google_place_id);

  console.log(`전체 ${places.length}곳 · 확인 가능 ${checkable.length} · place_id 없음 ${unchecked.length}\n`);

  const buckets = { OPERATIONAL: [], CLOSED_TEMPORARILY: [], CLOSED_PERMANENTLY: [], UNKNOWN: [], NOT_FOUND: [] };
  const failed = [];

  for (const [i, p] of checkable.entries()) {
    try {
      const r = await fetchStatus(p.google_place_id);
      (buckets[r.status] ??= []).push({ ...p, googleName: r.googleName });
      if (r.status !== "OPERATIONAL") {
        console.log(`  [${i + 1}/${checkable.length}] ${r.status.padEnd(19)} ${p.name}`);
      }
    } catch (e) {
      failed.push({ name: p.name, reason: e.message });
      console.log(`  [${i + 1}/${checkable.length}] ✖ ${p.name} — ${e.message}`);
    }
    await sleep(120);
  }

  console.log("\n── 집계 ──");
  for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(19)} ${v.length}`);
  if (failed.length) console.log(`  조회 실패          ${failed.length}`);

  /* 결과를 파일로도 남긴다 — 콘솔 출력은 길어서 스크롤에 잘리고, 다시 보려고
     API 를 또 때릴 이유가 없다. 판단(비공개/삭제)은 이 파일을 보고 하면 된다. */
  const reportPath = join(ROOT, "tmp-closed-report.json");
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        counts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
        buckets: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [
            k,
            v.map((p) => ({ name: p.name, googleName: p.googleName, isPublished: p.is_published })),
          ]),
        ),
        noPlaceId: unchecked.map((p) => ({ name: p.name, isPublished: p.is_published })),
        failed,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\n리포트: ${reportPath}`);

  if (unchecked.length) {
    console.log(`\n── place_id 가 없어 자동 확인 불가 (${unchecked.length}곳) — 손으로 봐야 한다 ──`);
    for (const p of unchecked) console.log(`  · ${p.name}`);
  }

  /* 상호가 바뀌었으면 재개업이거나 애초에 다른 곳을 가리키고 있었다는 뜻이다.
     폐업 판정과 별개로 사람이 봐야 한다. */
  const renamed = buckets.OPERATIONAL.filter(
    (p) => p.googleName && p.googleName !== p.name && !p.googleName.includes(p.name),
  );
  if (renamed.length) {
    console.log(`\n── 영업 중이지만 구글 쪽 상호가 다름 (${renamed.length}곳) ──`);
    for (const p of renamed) console.log(`  · 우리: ${p.name}  /  구글: ${p.googleName}`);
  }

  const targets = [...buckets.CLOSED_PERMANENTLY];
  if (targets.length === 0) {
    console.log("\n영구 폐업으로 확인된 곳이 없습니다.");
    return;
  }

  console.log(`\n── 영구 폐업 ${targets.length}곳 ──`);
  for (const p of targets) console.log(`  · ${p.name}${p.is_published ? "" : " (이미 비공개)"}`);

  if (!HIDE && !DELETE) {
    console.log("\n(확인만 했습니다 — 아무것도 바꾸지 않았습니다.)");
    console.log("  비공개로 내리려면: npm run check:closed -- --hide");
    console.log("  삭제하려면:       npm run check:closed -- --delete   ⚠️ 되돌릴 수 없습니다");
    return;
  }

  const ids = targets.map((p) => p.id);
  if (HIDE) {
    const { error: e } = await db.from("places").update({ is_published: false }).in("id", ids);
    if (e) throw e;
    console.log(`\n✔ ${ids.length}곳을 비공개로 내렸습니다. 되돌리려면 어드민에서 공개로 전환하세요.`);
  } else {
    const { error: e } = await db.from("places").delete().in("id", ids);
    if (e) throw e;
    console.log(`\n✔ ${ids.length}곳을 삭제했습니다. video_places 도 CASCADE 로 함께 지워졌습니다.`);
  }

  /* 통계 캐시는 어드민 액션 경로에서만 갱신된다 — CLI 로 바꿨으면 여기서 불러야 한다.
     안 부르면 채널 카드의 "간 곳" 수가 옛 값으로 남는다(마이그레이션 0005 주석 참조). */
  await db.rpc("recount_stats");
  console.log("통계 재계산 완료.");
  console.log("⚠️ 공개 화면 캐시는 최대 1시간 남아 있습니다 — 어드민에서 아무 저장이나 하면 즉시 반영됩니다.");
}

run().catch((e) => {
  console.error("✖", e.message);
  process.exit(1);
});
