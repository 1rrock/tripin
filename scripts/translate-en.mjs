#!/usr/bin/env node
/**
 * 장소 산문(요약·주소·가격 힌트)과 도시 인트로의 **영문 초벌 번역**.
 *
 *   npm run translate:en            아직 영문이 없는 것만 (en_source is null)
 *   npm run translate:en -- --limit 5     소량 시험
 *   npm run translate:en -- --dry-run     API 호출 없이 대상만 세기
 *   npm run translate:en -- --redo        기계 초벌(machine)을 다시 번역
 *
 * 왜 스크립트인가 (런타임 번역이 아니라):
 *   · 브라우저 내장 번역 API 는 **모바일 미지원** — 이 제품 유입은 대부분 모바일 검색이다
 *   · 클라이언트 실시간 번역은 크롤러에 안 보인다 → /en 페이지가 존재하는 이유(영어권
 *     검색 유입)가 통째로 무효가 된다. 번역문이 HTML 에 들어가야 색인된다
 *   · 전체 분량이 2만 자 남짓이라 1회 배치로 끝난다. 런타임 비용·지연이 0
 *
 * 검수 흐름 (docs/I18N.md §7 "기계번역 일괄 공개 금지"에 대한 대응):
 *   이 스크립트는 en_source='machine' 으로만 쓴다. 공개 화면은 machine 이면
 *   "자동 번역" 표시와 원문 보기를 함께 내보내고, 어드민에서 검수하면 'human' 이 된다.
 *
 * ⚠️ 원문(한국어 컬럼)은 절대 건드리지 않는다. 되돌리려면 영문 컬럼만 비우면 된다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

const DRY_RUN = flag("dry-run");
const REDO = flag("redo");
const LIMIT = Number(value("limit", "0")) || null;

/* --dry-run 은 대상만 세므로 번역 키가 없어도 돌아야 한다 — 분량·비용을 먼저 보고
   키를 넣을지 판단할 수 있어야 하기 때문이다. */
const required = DRY_RUN
  ? ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
  : ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"];
for (const key of required) {
  if (!env[key]) {
    console.error(`✖ ${key} 가 .env.local 에 없거나 값이 비어 있습니다.`);
    process.exit(1);
  }
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

/* 구조화 출력 — 파싱 실패를 애초에 없앤다. 불릿 개수는 원문과 1:1 로 맞춘다. */
const PLACE_SCHEMA = {
  type: "object",
  properties: {
    summary_en: { type: ["string", "null"] },
    summary_bullets_en: { type: "array", items: { type: "string" } },
    address_en: { type: ["string", "null"] },
    price_hint_en: { type: ["string", "null"] },
  },
  required: ["summary_en", "summary_bullets_en", "address_en", "price_hint_en"],
  additionalProperties: false,
};

const SYSTEM = `You translate short Korean place notes for a travel directory into English.

The directory lists places that Korean travel YouTubers visited. Each note was written by hand from what the video showed. Your English must carry the same facts at the same length — this is a translation, not a rewrite.

Rules:
- Keep the register plain and factual. The Korean source deliberately avoids hype ("인생 맛집!"), and so must the English. No marketing adjectives, no exclamation marks.
- Translate one bullet to one bullet, in the same order. Never merge, split, drop, or add bullets.
- Keep proper nouns in their established Latin form: place names, station names, neighborhoods, dish names (tonkatsu, yakiniku, kaisendon), and creator names. Romanize Korean and Japanese names rather than translating them literally — "몬젠나카초역" is "Monzen-nakacho Station", not "Gate Front Middle Town Station".
- Prices, times, distances, and counts stay exactly as given. Keep the original currency (¥, ₩) and unit.
- Where the Korean says information is as of filming ("영상 촬영 시점 기준"), keep that qualifier — it is a legal disclosure, not a stylistic choice.
- Addresses: give the conventional English postal form for that country, keeping the original script in parentheses only if the Korean did.
- If a field is null or empty in the input, return null (or an empty array for bullets). Do not invent content.`;

function buildPrompt(p) {
  return `Translate the Korean fields for this place.

Place: ${p.name}${p.name_local ? ` (${p.name_local})` : ""}
Type: ${p.place_type}
City: ${p.city_name ?? "unknown"}

summary: ${JSON.stringify(p.summary)}
summary_bullets: ${JSON.stringify(p.summary_bullets ?? [])}
address: ${JSON.stringify(p.address)}
price_hint: ${JSON.stringify(p.price_hint)}`;
}

async function translatePlace(p) {
  const res = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low", // 짧고 사실적인 번역 — 깊은 추론이 필요한 작업이 아니다
      format: { type: "json_schema", schema: PLACE_SCHEMA },
    },
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(p) }],
  });

  if (res.stop_reason === "refusal") {
    throw new Error(`거절됨 (${res.stop_details?.category ?? "unknown"})`);
  }
  const text = res.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("빈 응답");
  const out = JSON.parse(text);

  const srcCount = (p.summary_bullets ?? []).length;
  if (out.summary_bullets_en.length !== srcCount) {
    throw new Error(`불릿 수 불일치: 원문 ${srcCount} → 번역 ${out.summary_bullets_en.length}`);
  }
  return out;
}

async function run() {
  let q = db
    .from("places")
    .select("id, name, name_local, place_type, address, summary, summary_bullets, price_hint, city_id, en_source")
    .order("updated_at", { ascending: true });
  q = REDO ? q.eq("en_source", "machine") : q.is("en_source", null);
  if (LIMIT) q = q.limit(LIMIT);

  const { data: places, error } = await q;
  if (error) throw error;

  const { data: cities } = await db.from("cities").select("id, name");
  const cityName = new Map((cities ?? []).map((c) => [c.id, c.name]));

  /* 번역할 산문이 아무것도 없는 장소는 건너뛴다 — 빈 값에 API 를 쓰지 않는다 */
  const targets = places.filter(
    (p) => p.summary || (p.summary_bullets?.length ?? 0) > 0 || p.address || p.price_hint,
  );

  console.log(`대상 장소 ${targets.length}곳 (전체 ${places.length}, 산문 없음 ${places.length - targets.length})`);
  const chars = targets.reduce(
    (n, p) =>
      n +
      (p.summary?.length ?? 0) +
      (p.summary_bullets ?? []).join("").length +
      (p.address?.length ?? 0) +
      (p.price_hint?.length ?? 0),
    0,
  );
  console.log(`원문 분량 약 ${chars.toLocaleString()}자`);
  if (DRY_RUN) return console.log("(--dry-run: API 호출 없이 종료)");

  let ok = 0;
  const failed = [];
  for (const [i, p] of targets.entries()) {
    const label = `[${i + 1}/${targets.length}] ${p.name}`;
    try {
      const out = await translatePlace({ ...p, city_name: cityName.get(p.city_id) });
      const { error: upErr } = await db
        .from("places")
        .update({
          summary_en: out.summary_en,
          summary_bullets_en: out.summary_bullets_en,
          address_en: out.address_en,
          price_hint_en: out.price_hint_en,
          en_source: "machine",
          en_translated_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      if (upErr) throw upErr;
      ok += 1;
      console.log(`  ✔ ${label}`);
    } catch (e) {
      failed.push({ name: p.name, reason: e.message });
      console.log(`  ✖ ${label} — ${e.message}`);
    }
  }

  /* 도시 인트로 — 같은 화면에 나오므로 여기만 한국어로 남으면 안 된다 */
  const { data: pieces } = await db
    .from("creator_cities")
    .select("creator_id, city_id, intro_text, intro_text_en")
    .not("intro_text", "is", null);
  const introTargets = (pieces ?? []).filter((r) => (REDO ? true : !r.intro_text_en));

  for (const [i, row] of introTargets.entries()) {
    const label = `[인트로 ${i + 1}/${introTargets.length}] ${cityName.get(row.city_id) ?? row.city_id}`;
    try {
      const res = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 2000,
        thinking: { type: "adaptive" },
        output_config: {
          effort: "low",
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: { intro_en: { type: "string" } },
              required: ["intro_en"],
              additionalProperties: false,
            },
          },
        },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Translate this short intro for a channel's city page.\n\nCity: ${cityName.get(row.city_id) ?? "unknown"}\nintro_text: ${JSON.stringify(row.intro_text)}`,
          },
        ],
      });
      if (res.stop_reason === "refusal") throw new Error("거절됨");
      const out = JSON.parse(res.content.find((b) => b.type === "text").text);
      const { error: upErr } = await db
        .from("creator_cities")
        .update({ intro_text_en: out.intro_en })
        .eq("creator_id", row.creator_id)
        .eq("city_id", row.city_id);
      if (upErr) throw upErr;
      console.log(`  ✔ ${label}`);
    } catch (e) {
      failed.push({ name: label, reason: e.message });
      console.log(`  ✖ ${label} — ${e.message}`);
    }
  }

  console.log(`\n완료: 장소 ${ok}/${targets.length} · 인트로 ${introTargets.length}건 시도`);
  if (failed.length) {
    console.log(`실패 ${failed.length}건 — 다시 돌리면 실패분만 재시도합니다:`);
    for (const f of failed) console.log(`  · ${f.name}: ${f.reason}`);
  }
  console.log(`\n전부 en_source='machine' 입니다. 어드민에서 검수하면 'human' 이 됩니다.`);
}

run().catch((e) => {
  console.error("✖", e.message);
  process.exit(1);
});
