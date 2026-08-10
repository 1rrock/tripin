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
 * 어떤 모델인가:
 *   OPENAI_API_KEY / OPENAI_BASE_URL / AI_MODEL 세 개로 **아무 OpenAI 호환 제공자나**
 *   가리킬 수 있다. 현재는 Gemini 무료 티어의 OpenAI 호환 엔드포인트를 쓴다
 *   (optisearch 의 src/shared/lib/openai.ts 와 같은 규약).
 *   BASE_URL 을 비우면 진짜 OpenAI 로 간다.
 *
 * 검수 흐름 (docs/I18N.md §7 "기계번역 일괄 공개 금지"에 대한 대응):
 *   이 스크립트는 en_source='machine' 으로만 쓴다. 공개 화면은 machine 이면
 *   "자동 번역" 표시와 원문 보기를 함께 내보내고, 어드민에서 검수하면 'human' 이 된다.
 *
 * ⚠️ 원문(한국어 컬럼)은 절대 건드리지 않는다. 되돌리려면 영문 컬럼만 비우면 된다.
 */
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
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

const DRY_RUN = flag("dry-run");
const REDO = flag("redo");
const LIMIT = Number(value("limit", "0")) || null;

/* --dry-run 은 대상만 세므로 번역 키가 없어도 돌아야 한다 — 분량·비용을 먼저 보고
   키를 넣을지 판단할 수 있어야 하기 때문이다. */
const required = DRY_RUN
  ? ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
  : ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"];
for (const key of required) {
  if (!env[key]) {
    console.error(`✖ ${key} 가 .env.local 에 없거나 값이 비어 있습니다.`);
    process.exit(1);
  }
}

/* `||` 이지 `??` 가 아니다 — 빈 값으로 선언된 환경변수는 폴백해야지 model:"" 을 보내면 안 된다 */
const MODEL = env.AI_MODEL || "gpt-4o-mini";

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const ai = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL || undefined,
      maxRetries: 0, // 재시도는 아래 callJSON 이 백오프까지 포함해 직접 한다
    })
  : null;

/* 구조화 출력 — 파싱 실패를 애초에 없앤다. 불릿 개수는 원문과 1:1 로 맞춘다.
   ⚠️ 없는 값을 null 이 아니라 **빈 문자열**로 받는다. type:["string","null"] 유니온을
   호환 레이어(특히 Gemini)가 거부하는 경우가 있어서다. "" → null 변환은 코드가 한다. */
const PLACE_SCHEMA = {
  type: "object",
  properties: {
    summary_en: { type: "string" },
    summary_bullets_en: { type: "array", items: { type: "string" } },
    address_en: { type: "string" },
    price_hint_en: { type: "string" },
  },
  required: ["summary_en", "summary_bullets_en", "address_en", "price_hint_en"],
  additionalProperties: false,
};

const INTRO_SCHEMA = {
  type: "object",
  properties: { intro_en: { type: "string" } },
  required: ["intro_en"],
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
- If a field is empty in the input, return an empty string "" (or an empty array for bullets). Do not invent content.

Reply with JSON only — no prose, no markdown fence.`;

/* 제공자마다 구조화 출력 방언이 다르다. json_schema 를 먼저 시도하고, 거부하면 한 번만
   json_object 로 내려앉은 뒤 그 판정을 기억한다 — 133건마다 400 을 맞을 이유가 없다. */
let jsonMode = "json_schema";

function parseJSON(raw) {
  const text = raw.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "").trim();
  return JSON.parse(text);
}

const RETRYABLE = /rate.?limit|429|quota|timeout|ECONNRESET|502|503|504|overloaded/i;

async function callJSON(schemaName, schema, userContent) {
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const res = await ai.chat.completions.create({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        response_format:
          jsonMode === "json_schema"
            ? { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } }
            : { type: "json_object" },
      });
      const text = res.choices?.[0]?.message?.content;
      if (!text) throw new Error("빈 응답");
      return parseJSON(text);
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message ?? e);

      /* 스키마 방언 거부는 재시도가 아니라 모드 전환이다 — 같은 요청을 즉시 다시 보낸다 */
      if (jsonMode === "json_schema" && /response_format|json_schema|schema/i.test(msg)) {
        console.log(`  ↩ 이 제공자는 json_schema 를 거부합니다 — json_object 로 전환합니다.`);
        jsonMode = "json_object";
        continue;
      }
      if (!RETRYABLE.test(msg) || attempt === 4) throw e;

      const waitMs = 2000 * 2 ** attempt; // 2s, 4s, 8s, 16s — 무료 티어 분당 한도 회복용
      console.log(`  … ${Math.round(waitMs / 1000)}s 대기 후 재시도 (${msg.slice(0, 80)})`);
      await sleep(waitMs);
    }
  }
  throw lastErr;
}

/* 빈 문자열은 "번역 결과가 없다"는 뜻이므로 컬럼에는 null 로 넣는다 — ""과 null 이
   섞이면 어드민의 "미번역" 필터(en_source is null)와 별개로 표시 분기가 어긋난다. */
const orNull = (s) => {
  const v = typeof s === "string" ? s.trim() : "";
  return v === "" ? null : v;
};

/* 채널명·도시명은 **이미 DB 에 확정된 영문 표기**가 있다. 안 알려주면 모델이 매번
   새로 지어내고("Sung Si Kyung" vs "Sung Si-kyung") 같은 화면 안에서 표기가 갈린다.
   run() 이 채운다. */
let GLOSSARY = "";

function buildPrompt(p) {
  return `Translate the Korean fields for this place.
${GLOSSARY}
Place: ${p.name}${p.name_local ? ` (${p.name_local})` : ""}
Type: ${p.place_type}
City: ${p.city_name ?? "unknown"}

summary: ${JSON.stringify(p.summary ?? "")}
summary_bullets: ${JSON.stringify(p.summary_bullets ?? [])}
address: ${JSON.stringify(p.address ?? "")}
price_hint: ${JSON.stringify(p.price_hint ?? "")}`;
}

async function translatePlace(p) {
  const out = await callJSON("place_translation", PLACE_SCHEMA, buildPrompt(p));

  const srcCount = (p.summary_bullets ?? []).length;
  const bullets = Array.isArray(out.summary_bullets_en) ? out.summary_bullets_en : [];
  if (bullets.length !== srcCount) {
    throw new Error(`불릿 수 불일치: 원문 ${srcCount} → 번역 ${bullets.length}`);
  }
  return {
    summary_en: orNull(out.summary_en),
    summary_bullets_en: bullets.map((b) => String(b)),
    address_en: orNull(out.address_en),
    price_hint_en: orNull(out.price_hint_en),
  };
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

  const { data: cities } = await db.from("cities").select("id, name, name_en");
  const cityName = new Map((cities ?? []).map((c) => [c.id, c.name]));

  const { data: creators } = await db.from("creators").select("display_name, display_name_en");
  const fixed = [
    ...(creators ?? []).map((c) => [c.display_name, c.display_name_en]),
    ...(cities ?? []).map((c) => [c.name, c.name_en]),
  ].filter(([ko, en]) => ko && en && ko !== en);
  if (fixed.length) {
    GLOSSARY = `\nUse exactly these established English forms wherever the Korean appears — do not re-romanize them:\n${fixed
      .map(([ko, en]) => `  ${ko} → ${en}`)
      .join("\n")}\n`;
  }

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

  console.log(`모델 ${MODEL}${env.OPENAI_BASE_URL ? ` @ ${env.OPENAI_BASE_URL}` : ""}\n`);

  let ok = 0;
  const failed = [];
  for (const [i, p] of targets.entries()) {
    const label = `[${i + 1}/${targets.length}] ${p.name}`;
    try {
      const out = await translatePlace({ ...p, city_name: cityName.get(p.city_id) });
      const { error: upErr } = await db
        .from("places")
        .update({
          ...out,
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
    /* 무료 티어는 분당 요청 수로 끊는다. 순차 + 짧은 간격이면 백오프까지 갈 일이 거의 없다 */
    await sleep(1200);
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
      const out = await callJSON(
        "intro_translation",
        INTRO_SCHEMA,
        `Translate this short intro for a channel's city page.\n${GLOSSARY}\nCity: ${cityName.get(row.city_id) ?? "unknown"}\nintro_text: ${JSON.stringify(row.intro_text)}`,
      );
      const intro = orNull(out.intro_en);
      if (!intro) throw new Error("빈 번역");
      const { error: upErr } = await db
        .from("creator_cities")
        .update({ intro_text_en: intro })
        .eq("creator_id", row.creator_id)
        .eq("city_id", row.city_id);
      if (upErr) throw upErr;
      console.log(`  ✔ ${label}`);
    } catch (e) {
      failed.push({ name: label, reason: e.message });
      console.log(`  ✖ ${label} — ${e.message}`);
    }
    await sleep(1200);
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
