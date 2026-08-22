#!/usr/bin/env node
/**
 * 붙어 있는 네이버 링크가 **실제로 가게 화면으로 열리는지** 본다.
 *
 * 사용:
 *   node scripts/ingest/check-naver-entry.mjs                점검만(읽기)
 *   node scripts/ingest/check-naver-entry.mjs --country=ALL  나라 안 가리고
 *   node scripts/ingest/check-naver-entry.mjs --drop         못 여는 링크의 ID 를 비운다
 *   node scripts/ingest/check-naver-entry.mjs --drop --replace  비우기 전에 대체 ID 를 찾아본다
 *   node scripts/ingest/check-naver-entry.mjs --json=out.json    판정 전체를 파일로
 *
 * 왜 이게 있나 — `verify-naver.mjs` 는 "**엉뚱한 가게**를 가리키나"를 본다. 여기는
 * 그 앞 단계다: 그 ID 로 열리는 화면이 **아예 없는** 경우. 실제로 "순흥옥"(을지로,
 * ID 20926750)은 링크를 누르면 네이버가 "요청하신 페이지를 찾을 수 없습니다" 를 띄운다.
 * 유저 입장에서 이건 링크가 없는 것보다 나쁘다 — 눌러야만 알 수 있는 고장이다.
 *
 * 어떻게 — 엔트리 화면(map.naver.com/p/entry/place/{id})이 그리기 전에 부르는 API 를
 * 그대로 부른다:
 *
 *   GET https://map.naver.com/p/api/place/summary/{id}
 *
 * 살아 있으면 `data.placeDetail.name` 과 `coordinate` 가 차 있고, 색인에서 내려갔으면
 * 200 을 주면서 **모든 필드가 null** 로 온다(순흥옥으로 실측). 곳당 요청 한 번, JSON
 * 한 줄이라 m.place HTML(600KB)을 긁는 것보다 싸고 판정도 또렷하다.
 *
 * 판정:
 *   열림    name 이 있다                                   → 그대로
 *   없음    name·coordinate 가 다 null (삭제·폐업 색인 제거) → 링크가 빈 화면을 연다
 *   좌표만  coordinate 만 있고 name 이 없다                  → 핀만 찍히고 가게 정보가 없다
 *   오류    세 번 다 응답을 못 받았다                        → 판정 보류. 건드리지 않는다
 *
 * ⚠️ **한 번 비었다고 죽었다 하지 마라.** 네이버는 몰아치면 200 을 주면서 알맹이만
 *    빼고 돌려준다(`verify-naver.mjs` 주석 참고). 그래서 없음·좌표만 판정은 쉬었다가
 *    두 번 더 물어 세 번 다 같을 때만 내린다.
 *
 * `--replace` 는 비우기 전에 상호+좌표로 검색해 150m 안 같은 상호를 찾아 갈아 끼운다
 * (`verify-naver.mjs` 와 같은 기준). 못 찾으면 비운다.
 *
 * ⛔ 로컬(어드민) 전용. `map_status` 는 건드리지 않는다.
 */
import { writeFileSync } from "node:fs";
import { requireEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
const DROP = args.includes("--drop");
const REPLACE = args.includes("--replace");
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? null;
const COUNTRY = (opt("country") ?? "KR").toUpperCase();
const OFFSET = Math.max(0, Number(opt("offset") ?? 0));
const LIMIT = opt("limit") === null ? Infinity : Math.max(1, Number(opt("limit")));
/** summary API 는 20연속에도 안 조였다(실측). 그래도 기본은 여유 있게 둔다. */
const DELAY_MS = Math.max(0, Number(opt("delay") ?? 0.35) * 1000);
const JSON_OUT = opt("json");
/** 대체 후보로 인정할 거리 — verify-naver.mjs 와 같은 기준. */
const REPLACE_KM = 0.15;

const env = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 엔트리 화면이 부르는 요약 API 한 번.
 * @returns {Promise<{ok: true, name: string|null, coord: {lat:number,lng:number}|null, category: string|null}
 *   | {ok: false}>} ok:false 는 "응답을 못 받았다"(판정 불가)이지 "없다"가 아니다.
 */
async function summary(id, attempt = 0) {
  try {
    const res = await fetch(`https://map.naver.com/p/api/place/summary/${id}`, {
      headers: { "user-agent": DESKTOP_UA, referer: "https://map.naver.com/", accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    /* 300건쯤 돌면 네이버가 한동안 문을 닫는다(실측 — 그 뒤 215건이 통째로 응답 없음).
       조임은 몇 초면 풀리므로 여기서 쉬었다 다시 묻는다. 안 그러면 판정 못 한 곳이
       뭉텅이로 남아 사람이 다시 돌려야 한다. */
    if (!res.ok && attempt < 3) {
      await sleep([5_000, 15_000, 40_000][attempt]);
      return summary(id, attempt + 1);
    }
    if (!res.ok) return { ok: false };
    const body = await res.json();
    const d = body?.data?.placeDetail;
    if (d === undefined) return { ok: false };
    if (d === null) return { ok: true, name: null, coord: null, category: null };
    const lat = Number(d.coordinate?.latitude);
    const lng = Number(d.coordinate?.longitude);
    return {
      ok: true,
      name: d.name ?? null,
      coord: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
      category: d.category ?? d.businessType ?? null,
    };
  } catch {
    return { ok: false };
  }
}

/**
 * 요약 API 가 비었다고 할 때 m.place 로 한 번 더 되짚는다.
 * 서로 다른 경로가 둘 다 비면 조임이 아니라 진짜 없는 것이다.
 */
async function aliveOnMPlace(id) {
  for (const kind of ["restaurant", "place"]) {
    try {
      const res = await fetch(`https://m.place.naver.com/${kind}/${id}/home`, {
        headers: { "user-agent": MOBILE_UA },
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (/"y"\s*:\s*"[\d.]{1,20}"/.test(html)) return true;
    } catch {
      /* 다음 경로로 */
    }
  }
  return false;
}

/** 공백·구두점·괄호 부속표기를 턴 비교용 상호 — verify-naver.mjs 와 같은 규칙. */
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

/** 상호+좌표로 대체 후보 찾기 — verify-naver.mjs 와 같은 기준. */
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
    return (
      (data.place ?? [])
        .filter(
          (h) =>
            h.id &&
            Number.isFinite(h.dist) &&
            h.dist <= REPLACE_KM &&
            !FACILITY_CTG.test(h.ctg ?? "") &&
            nameMatches(name, h.title),
        )
        .sort((a, b) => a.dist - b.dist)[0] ?? null
    );
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
/** PostgREST 는 한 번에 1000행까지만 준다 — 다 받을 때까지 이어 받는다. */
const all = [];
for (let offset = 0; ; offset += 1000) {
  const page = await (
    await fetch(
      `${URL_}/rest/v1/places?${where}&select=id,name,address,lat,lng,naver_place_id,kakao_place_id,` +
        `google_place_id,google_maps_url,map_status&order=name&limit=1000&offset=${offset}`,
      { headers: H },
    )
  ).json();
  all.push(...page);
  if (page.length < 1000) break;
}
const targets = all.slice(OFFSET, LIMIT === Infinity ? undefined : OFFSET + LIMIT);

console.log(
  `점검 ${targets.length}곳${targets.length === all.length ? "" : ` (전체 ${all.length} 중 ${OFFSET}번째부터)`}` +
    ` (${COUNTRY})${DROP ? (REPLACE ? " · 대체 찾고 없으면 비움" : " · 못 여는 건 비움") : " · 읽기만"}`,
);

// ── 1단계: 요약 API 로 전수 ────────────────────────────────────────────────
const broken = []; // { p, verdict, coord }
const errored = [];
let alive = 0;

for (const [i, p] of targets.entries()) {
  const s = await summary(p.naver_place_id);
  if (!s.ok) {
    errored.push(p);
  } else if (s.name) {
    alive++;
  } else {
    broken.push({ p, verdict: s.coord ? "좌표만" : "없음", coord: s.coord });
  }
  if ((i + 1) % 100 === 0) {
    console.log(`  … ${i + 1}/${targets.length} (열림 ${alive} · 의심 ${broken.length} · 오류 ${errored.length})`);
  }
  if (DELAY_MS && i < targets.length - 1) await sleep(DELAY_MS);
}

// ── 2단계: 의심 건 재확인 ──────────────────────────────────────────────────
/* 한 번 빈 걸 죽었다고 하지 않는다. 쉬었다 요약 API 로 두 번 더 묻고,
   그래도 비면 경로가 다른 m.place 로 한 번 더 되짚는다. */
const confirmed = [];
const revived = [];
if (broken.length) {
  console.log(`\n의심 ${broken.length}건 — 조임인지 진짜 없는 건지 되짚는다`);
  for (const item of broken) {
    let stillEmpty = true;
    for (const pass of [1, 2]) {
      await sleep(3_000 * pass);
      const again = await summary(item.p.naver_place_id);
      if (again.ok && again.name) {
        stillEmpty = false;
        break;
      }
    }
    if (stillEmpty && (await aliveOnMPlace(item.p.naver_place_id))) stillEmpty = false;
    if (stillEmpty) {
      confirmed.push(item);
      console.log(
        `  ✖ ${item.p.name} (${item.p.naver_place_id}) — ${item.verdict}` +
          `${item.coord ? ` (${item.coord.lat.toFixed(5)}, ${item.coord.lng.toFixed(5)})` : ""}` +
          ` · ${item.p.address ?? "주소 없음"}`,
      );
    } else {
      revived.push(item.p);
      alive++;
      console.log(`  ↩ ${item.p.name} (${item.p.naver_place_id}) — 다시 물으니 살아 있다. 조임이었다`);
    }
  }
}

// ── 3단계: 비우기 ─────────────────────────────────────────────────────────
let droppedCount = 0;
let replacedCount = 0;
if (DROP && confirmed.length) {
  console.log(`\n못 여는 ${confirmed.length}건 처리`);
  for (const { p } of confirmed) {
    let hit = null;
    if (REPLACE && p.lat !== null && p.lng !== null) {
      hit = await searchNaver(p.name, p.lat, p.lng);
      await sleep(1_200);
    }
    if (hit && String(hit.id) !== String(p.naver_place_id)) {
      const err = await patch(p.id, { naver_place_id: String(hit.id) });
      console.log(
        err
          ? `  ✖ 저장 실패 ${p.name}: ${err}`
          : `  ✔ ${p.name}: ${p.naver_place_id} → ${hit.id} "${hit.title}" (${Math.round(hit.dist * 1000)}m)`,
      );
      if (!err) replacedCount++;
      continue;
    }
    const err = await patch(p.id, { naver_place_id: null });
    console.log(err ? `  ✖ 비우기 실패 ${p.name}: ${err}` : `  ○ ${p.name}: 네이버 링크를 비웠다`);
    if (!err) droppedCount++;
  }
}

// ── 결과 ──────────────────────────────────────────────────────────────────
if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    JSON.stringify(
      {
        checked: targets.length,
        alive,
        broken: confirmed.map(({ p, verdict, coord }) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          naver_place_id: p.naver_place_id,
          verdict,
          naverCoord: coord,
          hasKakao: p.kakao_place_id !== null,
          hasGoogle: p.google_place_id !== null || p.google_maps_url !== null,
        })),
        errored: errored.map((p) => ({ id: p.id, name: p.name, naver_place_id: p.naver_place_id })),
      },
      null,
      1,
    ),
    "utf8",
  );
  console.log(`\n판정을 ${JSON_OUT} 에 적었다`);
}

console.log(
  `\n끝 — 열림 ${alive} · 못 엶 ${confirmed.length} · 응답 없음 ${errored.length}` +
    (revived.length ? ` (조임이었던 것 ${revived.length})` : "") +
    (DROP ? ` · 교체 ${replacedCount} · 비움 ${droppedCount}` : confirmed.length ? " (읽기만 했다 — 비우려면 --drop)" : ""),
);
if (errored.length) {
  console.log(`\n응답 없음 ${errored.length}곳 — 판정 못 했다. 다시 돌려라`);
  for (const p of errored.slice(0, 20)) console.log(`   · ${p.name} (${p.naver_place_id})`);
}
