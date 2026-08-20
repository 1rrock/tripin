#!/usr/bin/env node
/**
 * 붙어 있는 네이버 장소 ID 가 **그 가게가 맞는지** 되짚는다.
 *
 * 사용:
 *   node scripts/ingest/verify-naver.mjs                     KR 전체 점검(읽기만)
 *   node scripts/ingest/verify-naver.mjs --country=ALL       나라 안 가리고
 *   node scripts/ingest/verify-naver.mjs --fix               고칠 수 있는 것만 고친다
 *   node scripts/ingest/verify-naver.mjs --fix --drop        못 고치는 건 ID 를 비운다
 *
 * 왜 이게 있나 — `parse-description.mjs` 는 더보기란의 네이버 링크를 **바로 위 줄**
 * 상호와 짝지어 담는다. 한 영상에 가게가 여럿이면 이 짝짓기가 한 칸씩 밀릴 수 있고,
 * 그러면 "남은대게 직판장"(영덕)에 서울 용산 "대구막창껍데기" 의 ID 가 붙는다.
 * 실제로 그렇게 붙어 있었다. 링크가 없는 것보다 **엉뚱한 가게로 열리는 게 더 나쁘다** —
 * 유저는 그게 틀렸다는 걸 현장에서야 안다.
 *
 * 판정:
 *   ok    네이버 페이지 좌표가 우리 좌표에서 --max-km 안                 → 그대로
 *   far   페이지는 살아 있는데 좌표가 멀다                               → 짝이 틀렸다
 *   dead  페이지에 좌표가 아예 없다(색인에서 내려감 = 폐업·삭제)         → 링크가 빈 화면을 연다
 *
 * ⚠️ **빈 껍데기를 한 번 보고 죽었다고 하지 마라.** 네이버는 130건쯤 몰아치면 200 을 주면서
 *    알맹이만 빼고 돌려준다. 처음 이 점검을 돌렸을 때 100건까지 죽음 9건이던 것이
 *    200건에서 88건이 됐는데, 그 중 "봉피양 방이점"·"박서방순대국밥" 같은 멀쩡한 가게를
 *    한 박자 쉬고 다시 부르니 전부 살아 있었다. 조여진 것을 폐업으로 읽은 것이다.
 *    그래서 죽음 판정은 **바로 내리지 않고** 미뤄 뒀다가, 끝나고 천천히 두 번 더 묻는다.
 *    연속으로 죽음이 쌓이면 조여진 신호로 보고 길게 쉰다.
 *
 * 고치기(--fix): far·dead 를 우리 상호+좌표로 다시 검색해 150m 안 동일 상호가 나오면
 * 그 ID 로 갈아 끼운다. 못 찾으면 그대로 둔다 — `--drop` 을 줄 때만 비운다.
 *
 * ⛔ 로컬(어드민) 전용. 요청 간 기본 1.2초. `map_status` 는 건드리지 않는다.
 */
import { requireEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
const FIX = args.includes("--fix");
const DROP = args.includes("--drop");
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? null;
const COUNTRY = (opt("country") ?? "KR").toUpperCase();
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

console.log(
  `점검 ${targets.length}곳 (${COUNTRY})${FIX ? (DROP ? " · 고치고 못 고치면 비움" : " · 고칠 수 있는 것만") : " · 읽기만"}`,
);

const far = [];
/** 죽음 후보 — 여기서 바로 판정하지 않는다. 아래 재확인 단계를 거친다. */
let suspects = [];
let ok = 0;
let fixed = 0;
let dropped = 0;
/** 연속 죽음 — 쌓이면 우리가 조여진 것이지 가게가 사라진 게 아니다. */
let streak = 0;

for (const [i, p] of targets.entries()) {
  const info = await fetchPlace(p.naver_place_id);

  if (info === null) {
    suspects.push(p);
    streak++;
    // 다섯 연속이면 조여진 것으로 본다. 길게 쉬고 다시 간다 — 이 줄이 없으면
    // 그 뒤로는 전부 "폐업"으로 찍힌다(첫 실행에서 실제로 그랬다).
    if (streak >= 5) {
      console.log(`  ⏸ 연속 ${streak}건 빈 응답 — 조여진 것으로 보고 3분 쉰다`);
      await sleep(180_000);
      streak = 0;
    }
    continue;
  }
  streak = 0;

  if (p.lat === null || p.lng === null || distKm(p.lat, p.lng, info.lat, info.lng) <= MAX_KM) {
    ok++;
  } else {
    const m = Math.round(distKm(p.lat, p.lng, info.lat, info.lng) * 1000);
    console.log(`  ≠ ${p.name} (${p.naver_place_id}) — ${m}m 떨어짐 · 네이버="${info.name}" ${info.address ?? ""}`);
    far.push(p);
  }

  if ((i + 1) % 50 === 0) {
    console.log(`  … ${i + 1}/${targets.length} (맞음 ${ok} · 어긋남 ${far.length} · 죽음후보 ${suspects.length})`);
  }
  if (i < targets.length - 1) await sleep(DELAY_MS);
}

/* 죽음 후보 재확인 — 천천히 두 번 더 묻는다. 한 번이라도 알맹이가 오면 살아 있는 것이다. */
for (const pass of [1, 2]) {
  if (!suspects.length) break;
  console.log(`\n죽음 후보 ${suspects.length}건 재확인 ${pass}차 (5초 간격)`);
  const still = [];
  for (const p of suspects) {
    const info = await fetchPlace(p.naver_place_id);
    if (info === null) still.push(p);
    else if (p.lat !== null && p.lng !== null && distKm(p.lat, p.lng, info.lat, info.lng) > MAX_KM) {
      console.log(`  ≠ ${p.name} (${p.naver_place_id}) — 살아 있는데 짝이 어긋난다 · 네이버="${info.name}"`);
      far.push(p);
    } else ok++;
    await sleep(5_000);
  }
  console.log(`  → ${suspects.length}건 중 ${still.length}건이 여전히 빈 응답`);
  suspects = still;
}

/* 여기까지 살아남은 것만 진짜 죽음으로 본다. 상호 검색으로 한 번 더 뒷받침한다. */
const dead = suspects;
for (const p of dead) {
  console.log(`  ✖ ${p.name} (${p.naver_place_id}) — 세 번 다 빈 응답. 색인에서 내려간 것으로 본다`);
}

// ── 고치기 ────────────────────────────────────────────────────────────────
if (FIX) {
  console.log(`\n고치기 — 짝 어긋남 ${far.length} + 내려감 ${dead.length}`);
  for (const p of [...far, ...dead]) {
    if (p.lat === null || p.lng === null) continue;
    const hit = await searchNaver(p.name, p.lat, p.lng);
    await sleep(DELAY_MS);
    if (hit && String(hit.id) !== p.naver_place_id) {
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
  `\n끝 — 맞음 ${ok} · 짝 어긋남 ${far.length} · 색인에서 내려감 ${dead.length}` +
    (FIX ? ` · 교체 ${fixed} · 비움 ${dropped}` : " (읽기만 했다 — 고치려면 --fix)"),
);
