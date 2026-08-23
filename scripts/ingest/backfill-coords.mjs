#!/usr/bin/env node
/**
 * 좌표 없는 장소의 좌표를 자동으로 채운다.
 *
 * 사용:
 *   node scripts/ingest/backfill-coords.mjs           미리보기 (아무것도 안 쓴다)
 *   node scripts/ingest/backfill-coords.mjs --apply   실제로 채운다
 *
 * ⚠️⚠️ **2026-08-24 변경 — 인자 없이 돌리면 이제 dry-run 이다.**
 *      예전엔 인자 없이 돌리면 **즉시 DB 에 썼고** `--dry` 를 붙여야 안 썼다.
 *      리포의 다른 스크립트 절반은 반대(`--apply` 필요)라 손버릇이 사고를 냈다.
 *      전 스크립트를 `--apply` 기본으로 통일했다. `--dry` 는 계속 받는다(기본과 같다).
 *
 * 우선순위:
 *   1. google_maps_url 이 공유 링크(maps.app.goo.gl 등)면 → 리다이렉트 URL의 !3d!4d(핀 좌표) / @ 좌표
 *   2. 일본(JP) 주소 → 국토지리원(GSI) 주소 검색 (무료, 키 불필요)
 *   3. 그 외 → OSM Nominatim (1초 딜레이, 정중한 UA)
 *
 * 자동 확정은 하지 않는다 — 좌표만 채우고 map_status 는 그대로 둔다.
 */
import { requireEnv } from "./_lib/env.mjs";
import {
  fromGsi,
  fromNominatim,
  fromShareLink,
  isGoogleShareLink,
} from "./_lib/geocode.mjs";

// 기본이 dry-run 이다 — 쓰려면 --apply. (`--dry` 는 옛 손버릇을 위해 계속 받는다)
const DRY = !process.argv.includes("--apply");
const env = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isShareLink = isGoogleShareLink;

/**
 * PostgREST 는 한 번에 1000행까지만 준다 — 페이지네이션이 없으면 1000곳째부터
 * 좌표가 영영 안 채워진다. 상태 검사도 필수다: 키 만료·5xx 면 배열이 아니라 에러
 * 객체가 오는데, 예전엔 그걸 그대로 받아 "좌표 없는 장소: undefined곳" 을 찍고
 * 바로 아래 for-of 가 원인 표시 없이 TypeError 로 죽었다.
 */
async function all(path) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${URL_}/rest/v1/${path}&limit=1000&offset=${offset}`, { headers: H });
    const page = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`조회 실패 ${res.status}: ${JSON.stringify(page).slice(0, 200)}`);
    if (!Array.isArray(page)) throw new Error(`조회 응답이 배열이 아님: ${JSON.stringify(page).slice(0, 200)}`);
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

const places = await all(
  "places?or=(lat.is.null,lng.is.null)&select=id,slug,name,name_local,address,country_code,google_maps_url&order=created_at.asc",
);
console.log(`좌표 없는 장소: ${places.length}곳${DRY ? " (dry-run — 쓰려면 --apply)" : ""}`);

/** 쓰기 실패 수 — 전건 실패하고도 종료코드 0 으로 끝나면 배치가 성공으로 보인다. */
let writeFailed = 0;

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
  if (!res.ok) {
    writeFailed++;
    console.log(`  ✖ ${p.slug}: 저장 실패 ${res.status} ${(await res.text()).slice(0, 100)}`);
    continue;
  }
  console.log(`  ✔ ${p.slug}: ${hit.lat}, ${hit.lng} (${hit.via})`);
}

if (writeFailed) {
  console.log(`\n✖ 저장 실패 ${writeFailed}건 — 종료코드 1`);
  process.exitCode = 1;
}
if (DRY) console.log("\n(dry-run — 아무것도 쓰지 않았습니다. 실제로 쓰려면 --apply)");
