#!/usr/bin/env node
/**
 * 요약 초안 일괄 적용 — 이미 요약(불릿/문단)이 있는 장소는 건너뛴다.
 *
 * 사용: node scripts/ingest/apply-summaries.mjs <drafts.json>
 * drafts.json: [{ "slug", "bullets": [..], "priceHint": string|null }]
 *
 * 규칙 (CONCEPT.md 7.3):
 *   · 영상에서 확인된 사실만, 대사 인용 금지 — 초안 작성자가 지킬 것
 *   · priceHint 에는 "영상 촬영 시점 기준" 표기를 자동 부착 (LEGAL.md 4.6)
 *   · 최종 검수·수정은 /admin/place 에서 사람이 한다 (금지어·자막 복붙 검사 포함)
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

const BANNED = ["진짜", "미쳤", "인생", "존맛", "대박", "JMT", "맛있", "맛없", "불친절", "별로"];

const file = process.argv[2];
if (!file) {
  console.error("사용: node scripts/ingest/apply-summaries.mjs <drafts.json>");
  process.exit(1);
}
const drafts = JSON.parse(readFileSync(file, "utf8"));

const places = await (
  await fetch(`${URL_}/rest/v1/places?select=id,slug,summary,summary_bullets`, { headers: H })
).json();
const bySlug = new Map(places.map((p) => [p.slug, p]));

let applied = 0;
for (const d of drafts) {
  const place = bySlug.get(d.slug);
  if (!place) {
    console.log(`  ✖ 없음: ${d.slug}`);
    continue;
  }
  if (place.summary?.trim() || place.summary_bullets.length > 0) {
    console.log(`  · 이미 작성됨 — 건너뜀: ${d.slug}`);
    continue;
  }
  const joined = d.bullets.join("");
  const hit = BANNED.filter((w) => joined.toUpperCase().includes(w.toUpperCase()));
  if (hit.length > 0) {
    console.log(`  ⚠ 금지어(${hit.join(",")}) — 건너뜀: ${d.slug}`);
    continue;
  }
  const chars = joined.length;
  const priceHint = d.priceHint
    ? d.priceHint.includes("촬영 시점")
      ? d.priceHint
      : `${d.priceHint} (영상 촬영 시점 기준)`
    : null;
  const res = await fetch(`${URL_}/rest/v1/places?id=eq.${place.id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ summary_bullets: d.bullets, price_hint: priceHint }),
  });
  console.log(
    `  ${res.ok ? "✔" : "✖"} ${d.slug}: 불릿 ${d.bullets.length}개, ${chars}자${priceHint ? ", 가격" : ""}${res.ok ? "" : ` (${res.status})`}`,
  );
  if (res.ok) applied++;
}
console.log(`적용 ${applied}건 → 검수는 /admin/place (자막 복붙 검사 버튼 활용)`);
