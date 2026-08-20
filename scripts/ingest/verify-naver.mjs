#!/usr/bin/env node
/**
 * 붙어 있는 네이버 장소 ID 가 **그 가게가 맞는지** 되짚는다.
 *
 * 사용:
 *   node scripts/ingest/verify-naver.mjs                     KR 전체 점검(읽기만)
 *   node scripts/ingest/verify-naver.mjs --country=ALL       나라 안 가리고
 *   node scripts/ingest/verify-naver.mjs --deep --limit=150  판단보류까지 페이지로 확인
 *   node scripts/ingest/verify-naver.mjs --deep --offset=150 --limit=150   그 다음 토막
 *   node scripts/ingest/verify-naver.mjs --fix               고칠 수 있는 것만 고친다
 *   node scripts/ingest/verify-naver.mjs --fix --drop        못 고치는 건 ID 를 비운다
 *
 * 왜 이게 있나 — `parse-description.mjs` 는 더보기란의 네이버 링크를 **바로 위 줄**
 * 상호와 짝지어 담는다. 한 영상에 가게가 여럿이면 이 짝짓기가 한 칸씩 밀릴 수 있고,
 * 그러면 "남은대게 직판장"(영덕)에 서울 용산 "대구막창껍데기" 의 ID 가 붙는다.
 * 실제로 그렇게 붙어 있었다. 링크가 없는 것보다 **엉뚱한 가게로 열리는 게 더 나쁘다** —
 * 유저는 그게 틀렸다는 걸 현장에서야 안다.
 *
 * 어떻게 —
 *   1단계  우리 상호+좌표로 **검색**해서, 나온 가게의 ID 가 저장된 것과 같은지 본다.
 *          저장된 ID 를 열어 보지 않는 게 핵심이다(아래 조임 이야기). 짝이 밀렸다면
 *          여기서 드러나고, 갈아 끼울 후보까지 같은 응답에 들어 있다. 곳당 요청 한 번.
 *   2단계  어긋난 것만 저장된 ID 의 페이지를 열어 어디를 가리키는지 확증한다.
 *          수십 건이라 조임에 안 걸린다.
 *
 * 판정:
 *   일치      검색 1등 = 저장된 ID                                    → 그대로
 *   짝 어긋남 저장된 ID 가 --max-km 밖의 다른 가게를 가리킨다          → 갈아 끼울 대상
 *   내려감    저장된 ID 페이지가 세 번 다 비어 있다(폐업·삭제)         → 링크가 빈 화면을 연다
 *   판단보류  150m 안에 우리 상호와 통하는 가게가 없다                 → 틀렸다는 뜻이 아니다.
 *             우리 이름이 크리에이터 축약형이라 네이버 등록명과 다를 뿐일 수 있다
 *
 * ⚠️ **빈 껍데기를 한 번 보고 죽었다고 하지 마라.** 네이버는 m.place 를 130건쯤 몰아치면
 *    200 을 주면서 알맹이만 빼고 돌려준다. 처음 이 점검을 페이지 조회로 짜서 돌렸을 때
 *    100건까지 죽음 9건이던 것이 200건에서 88건이 됐는데, 그 중 "봉피양 방이점"·
 *    "박서방순대국밥" 같은 멀쩡한 가게를 한 박자 쉬고 다시 부르니 전부 살아 있었다.
 *    조여진 것을 폐업으로 읽은 것이다. 그래서 (a) 전수는 검색으로 돌고, (b) 죽음 판정은
 *    쉬었다가 두 번 더 물은 뒤에만 내린다.
 *
 * 고치기(--fix): 어긋남·내려감을 1단계가 찾아 둔 후보 ID 로 갈아 끼운다(150m + 동일 상호
 * 가드를 통과한 것만). 후보가 없으면 그대로 둔다 — `--drop` 을 줄 때만 비운다.
 *
 * ⛔ 로컬(어드민) 전용. 요청 간 기본 1.2초. `map_status` 는 건드리지 않는다.
 */
import { requireEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
const FIX = args.includes("--fix");
const DROP = args.includes("--drop");
/**
 * 검색으로 못 가른 것(판단보류)까지 장소 페이지를 열어 확인한다.
 * 조임에 걸리므로 `--offset`·`--limit` 로 끊어서 여러 번에 나눠 돌려라.
 */
const DEEP = args.includes("--deep");
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? null;
const COUNTRY = (opt("country") ?? "KR").toUpperCase();
const OFFSET = Math.max(0, Number(opt("offset") ?? 0));
const LIMIT = opt("limit") === null ? Infinity : Math.max(1, Number(opt("limit")));
const DELAY_MS = Math.max(1, Number(opt("delay") ?? 1.2)) * 1000;
/** 이보다 멀면 짝이 틀린 것으로 본다. 같은 건물에서도 핀은 조금씩 다르다. */
const MAX_KM = Number(opt("max-km") ?? 0.3);
/** 대체 후보로 인정할 거리 — `backfill-naver.mjs --search` 와 같은 기준. */
const REPLACE_KM = 0.15;

const env = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CTRL = new RegExp("[\\u0000-\\u001f]", "g");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 두 좌표 사이 거리(km). */
function distKm(aLat, aLng, bLat, bLng) {
  const rad = (x) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * 네이버 장소 페이지에서 좌표·상호·주소를 뽑는다. 좌표가 없으면 색인에서 내려간 것이다 —
 * 페이지는 200 을 주지만 알맹이 없는 껍데기만 온다(실측).
 */
async function fetchPlace(id) {
  for (const kind of ["restaurant", "place"]) {
    try {
      const res = await fetch(`https://m.place.naver.com/${kind}/${id}/home`, {
        headers: { "user-agent": MOBILE_UA },
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const lat = Number(html.match(/"y"\s*:\s*"([^"]{1,20})"/)?.[1]);
      const lng = Number(html.match(/"x"\s*:\s*"([^"]{1,20})"/)?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const name = html
        .match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1]
        ?.replace(CTRL, "")
        .replace(/\s*:\s*네이버\s*$/, "")
        .trim();
      const address = html.match(/"roadAddress"\s*:\s*"([^"]{1,120})"/)?.[1] ?? null;
      return { lat, lng, name: name ?? null, address };
    } catch {
      /* 다음 경로로 */
    }
  }
  return null;
}

/** 공백·구두점·괄호 부속표기를 턴 비교용 상호 — backfill-naver.mjs 와 같은 규칙. */
function normName(s) {
  return (s ?? "")
    .replace(/[(（][^)）]*[)）]/g, "")
    .replace(/[\s·・,.'"’”\-–—]/g, "")
    .toLowerCase();
}

function nameMatches(ours, theirs) {
  const a = normName(ours);
  const b = normName(theirs);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  if (a.length > b.length) return a.includes(b);
  if (!b.startsWith(a)) return false;
  const suffix = b.slice(a.length);
  if (suffix.length > 8) return false;
  return !/주차장|충전소|정류장|출입구|입구|출구|편의점|협동조합|상인회|사무소|관리사무/.test(suffix);
}

const FACILITY_CTG = /방면정보|주차장|충전소|정류장|지하철|버스|출입구|편의점/;

/** 상호+좌표로 다시 찾기. 400/429 는 몰아친 신호라 쉬었다 다시 묻는다. */
async function searchNaver(name, lat, lng, attempt = 0) {
  const url =
    `https://map.naver.com/p/api/search/instant-search` +
    `?query=${encodeURIComponent(name)}&coords=${lat},${lng}&lang=ko`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": DESKTOP_UA, referer: "https://map.naver.com/", accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if ((res.status === 400 || res.status === 429) && attempt < 2) {
      await sleep(15_000 * (attempt + 1));
      return searchNaver(name, lat, lng, attempt + 1);
    }
    if (!res.ok) return null;
    const data = await res.json();
    return (data.place ?? [])
      .filter(
        (h) =>
          h.id &&
          Number.isFinite(h.dist) &&
          h.dist <= REPLACE_KM &&
          !FACILITY_CTG.test(h.ctg ?? "") &&
          nameMatches(name, h.title),
      )
      .sort((a, b) => a.dist - b.dist)[0] ?? null;
  } catch {
    return null;
  }
}

async function patch(id, body) {
  const res = await fetch(`${URL_}/rest/v1/places?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  return res.ok ? null : `${res.status} ${await res.text()}`;
}

// ── 대상 ───────────────────────────────────────────────────────────────────
const where =
  COUNTRY === "ALL" ? "naver_place_id=not.is.null" : `country_code=eq.${COUNTRY}&naver_place_id=not.is.null`;
/** PostgREST 는 한 번에 1000행까지만 준다 — 넘겨받을 때까지 이어 받는다. */
const targets = [];
for (let offset = 0; ; offset += 1000) {
  const page = await (
    await fetch(
      `${URL_}/rest/v1/places?${where}&select=id,name,address,lat,lng,naver_place_id,map_status,source_note` +
        `&order=name&limit=1000&offset=${offset}`,
      { headers: H },
    )
  ).json();
  targets.push(...page);
  if (page.length < 1000) break;
}

/* 끊어서 돌리기 — 이름순이 안정적이라 offset 이 실행 사이에 흔들리지 않는다.
   `--deep` 은 네이버 조임에 걸리므로 한 번에 150건쯤씩 나눠 도는 걸 전제한다. */
const total = targets.length;
const slice = targets.slice(OFFSET, OFFSET === 0 && LIMIT === Infinity ? undefined : OFFSET + LIMIT);
targets.length = 0;
targets.push(...slice);

console.log(
  `점검 ${targets.length}곳${targets.length === total ? "" : ` (전체 ${total} 중 ${OFFSET}번째부터)`}` +
    ` (${COUNTRY})${DEEP ? " · 판단보류도 페이지로 확인" : ""}` +
    `${FIX ? (DROP ? " · 고치고 못 고치면 비움" : " · 고칠 수 있는 것만") : " · 읽기만"}`,
);

/* ── 1단계: 검색으로 되짚기 ───────────────────────────────────────────────
   장소 페이지(m.place)를 500번 두드리면 네이버가 130건쯤에서 알맹이를 빼고
   껍데기만 준다. 그래서 **저장된 ID 를 열어 보는 대신**, 우리 상호+좌표로
   검색해서 나온 가게의 ID 가 저장된 것과 같은지를 본다. 짝이 밀렸다면 여기서
   바로 드러나고, 대체 후보까지 같은 응답에 들어 있다. 요청도 곳당 한 번이다. */
const mismatch = []; // 검색 1등과 저장된 ID 가 다르다 — 짝이 밀린 쪽
const unknown = []; // 검색으로는 판단이 안 선다(상호가 네이버와 다르게 등록됐거나 없음)
let ok = 0;
let fixed = 0;
let dropped = 0;

for (const [i, p] of targets.entries()) {
  if (p.lat === null || p.lng === null) {
    unknown.push({ p, why: "좌표 없음" });
    continue;
  }
  const hit = await searchNaver(p.name, p.lat, p.lng);
  if (hit === null) {
    unknown.push({ p, why: "150m 안에 같은 상호 없음" });
  } else if (String(hit.id) === String(p.naver_place_id)) {
    ok++;
  } else {
    mismatch.push({ p, hit });
    console.log(
      `  ≠ ${p.name} — 저장 ${p.naver_place_id} 인데 검색 1등은 ${hit.id} "${hit.title}" (${Math.round(hit.dist * 1000)}m, ${hit.ctg ?? "-"})`,
    );
  }
  if ((i + 1) % 50 === 0) {
    console.log(`  … ${i + 1}/${targets.length} (일치 ${ok} · 어긋남 ${mismatch.length} · 판단보류 ${unknown.length})`);
  }
  if (i < targets.length - 1) await sleep(DELAY_MS);
}

/* ── 2단계: 저장된 ID 가 실제로 어디를 가리키는지 확증 ─────────────────────
   1단계는 "더 가까운 동명 가게가 있다"까지만 말한다. 저장된 ID 가 어디로 열리는지는
   그 페이지를 열어야 안다.

   기본은 어긋난 것만 본다(수십 건이라 조임에 안 걸린다). `--deep` 을 주면 판단보류까지
   본다 — 여기에 **가장 나쁜 부류**가 숨어 있다: 저장된 ID 는 250km 밖을 가리키는데
   근처에 같은 상호가 없어 1단계가 대체 후보를 못 찾은 경우다(실제로 "남은대게
   직판장"(영덕)에 서울 용산 "대구막창껍데기" 가 붙어 있었다). 대신 조임에 걸리니
   `--offset`·`--limit` 로 끊어 돌려라. */
const far = [];
const dead = [];

/** 저장된 ID 의 페이지를 열어 판정한다. hit 는 있으면 대체 후보. */
async function confirmOne(p, hit) {
  let info = await fetchPlace(p.naver_place_id);
  if (info === null) {
    // 한 번 비었다고 죽었다 하지 않는다 — 쉬고 두 번 더 묻는다
    for (const pass of [1, 2]) {
      await sleep(6_000 * pass);
      info = await fetchPlace(p.naver_place_id);
      if (info) break;
    }
  }
  if (info === null) {
    dead.push({ p, hit });
    console.log(`  ✖ ${p.name} (${p.naver_place_id}) — 세 번 다 빈 응답. 색인에서 내려간 것으로 본다`);
    return;
  }
  if (p.lat === null || p.lng === null) {
    ok++;
    return;
  }
  const m = Math.round(distKm(p.lat, p.lng, info.lat, info.lng) * 1000);
  if (m <= MAX_KM * 1000) {
    // 가깝다 — 같은 건물의 다른 등록일 수 있다. 건드리지 않는다.
    ok++;
    if (hit) console.log(`  · ${p.name} — 저장 ID 도 ${m}m 안이다(중복 등록으로 보임). 그대로 둔다`);
    return;
  }
  far.push({ p, hit, info, m });
  console.log(`  ≠ ${p.name} (${p.naver_place_id}) — 저장 ID 는 ${m}m 밖 "${info.name}" (${info.address ?? ""})`);
}

if (mismatch.length) {
  console.log(`\n어긋남 ${mismatch.length}건 — 저장된 ID 가 가리키는 곳을 확인한다`);
  for (const { p, hit } of mismatch) {
    await confirmOne(p, hit);
    await sleep(DELAY_MS);
  }
}

if (DEEP && unknown.length) {
  console.log(`\n판단보류 ${unknown.length}건 — 페이지를 직접 열어 확인한다(조임 주의)`);
  for (const [i, { p }] of unknown.entries()) {
    if (p.lat === null || p.lng === null) continue;
    await confirmOne(p, null);
    if ((i + 1) % 25 === 0) console.log(`  … ${i + 1}/${unknown.length}`);
    await sleep(DELAY_MS);
  }
}

// ── 고치기 ────────────────────────────────────────────────────────────────
if (FIX) {
  const targetsToFix = [...far, ...dead];
  console.log(`\n고치기 — 어긋남 ${far.length} + 내려감 ${dead.length}`);
  for (const { p, hit: found } of targetsToFix) {
    /* --deep 이 찾아낸 건 1단계를 안 거쳐서 후보가 없다. 여기서 한 번 찾아본다 —
       못 찾는 게 정상이다(근처에 같은 상호가 없어서 판단보류로 왔던 것들이다). */
    let hit = found;
    if (!hit && p.lat !== null && p.lng !== null) {
      hit = await searchNaver(p.name, p.lat, p.lng);
      await sleep(DELAY_MS);
    }
    if (hit && String(hit.id) !== String(p.naver_place_id)) {
      const err = await patch(p.id, { naver_place_id: String(hit.id) });
      console.log(
        err
          ? `  ✖ 저장 실패 ${p.name}: ${err}`
          : `  ✔ ${p.name}: ${p.naver_place_id} → ${hit.id} "${hit.title}" (${Math.round(hit.dist * 1000)}m)`,
      );
      if (!err) fixed++;
    } else if (DROP) {
      const err = await patch(p.id, { naver_place_id: null });
      console.log(err ? `  ✖ 비우기 실패 ${p.name}: ${err}` : `  ○ ${p.name}: 대체 없음 — ID 를 비웠다`);
      if (!err) dropped++;
    } else {
      console.log(`  · ${p.name}: 대체 후보 없음 — 그대로 둔다(--drop 을 주면 비운다)`);
    }
  }
}

console.log(
  `\n끝 — 일치 ${ok} · 짝 어긋남 ${far.length} · 색인에서 내려감 ${dead.length} · 판단보류 ${unknown.length}` +
    (FIX ? ` · 교체 ${fixed} · 비움 ${dropped}` : " (읽기만 했다 — 고치려면 --fix)"),
);
if (unknown.length && !DEEP) {
  console.log(
    `\n판단보류 ${unknown.length}곳 — 우리 상호가 네이버 등록명과 달라 검색으로는 못 가른다.\n` +
      `  저장된 ID 가 틀렸다는 뜻이 아니다. 확실히 보려면 --deep 을 주되,\n` +
      `  네이버가 조이므로 --offset=0 --limit=150 처럼 끊어서 여러 번 돌려라.`,
  );
  for (const { p, why } of unknown.slice(0, 40)) console.log(`   · ${p.name} (${p.naver_place_id}) — ${why}`);
  if (unknown.length > 40) console.log(`   … 외 ${unknown.length - 40}곳`);
}
