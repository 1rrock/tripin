#!/usr/bin/env node
/**
 * 네이버 장소 페이지에서 상호·주소·좌표를 받아 채운다.
 *
 * 사용:
 *   node scripts/ingest/backfill-naver.mjs [--dry]
 *       naver_place_id 는 있는데 좌표나 주소가 빈 장소를 전부 훑는다.
 *   node scripts/ingest/backfill-naver.mjs --place=<uuid> --naver=<링크|숫자ID> [--name] [--dry]
 *       한 곳만 지정해서 네이버 ID 를 붙이고 주소·좌표를 채운다.
 *       --name 을 주면 상호도 네이버 표기로 바꾼다(파싱이 주소를 이름으로 넣어버린 경우용).
 *   node scripts/ingest/backfill-naver.mjs --search [--dry]
 *       한국(KR) 장소 중 네이버 ID 가 없는 곳을 상호+좌표로 검색해 ID 를 붙인다.
 *
 * 왜 이게 있나 — 구글에 안 잡히는 한국 가게가 있다. 크리에이터가 더보기란에
 * 네이버 링크만 남긴 경우 `backfill-coords.mjs` 가 쓸 재료(구글 공유링크)가 없어
 * 좌표가 영영 비고, 좌표가 없으면 확정 잠금에 걸려 공개되지 않는다.
 * 실제로 `칠흑 가양등촌점` 이 그렇게 이름 칸에 주소만 든 채 묶여 있었다.
 *
 * 반대로 --search 는 "구글은 있는데 네이버가 없는" 쪽을 메운다. 한국 장소는
 * 네이버 링크가 primary 로 나가므로(`shared/lib/map-links.ts`) ID 가 없으면
 * 유저에게 한국에서 길찾기가 막힌 구글 지도 버튼이 나간다.
 *
 * ⛔ 로컬(어드민 머신) 전용. 요청 간 기본 1.5초(--delay=초 로 조절). 자동 확정은 하지 않는다 —
 *    좌표만 채우고 `map_status` 는 사람이 /admin 에서 올린다.
 */
import { requireEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const RENAME = args.includes("--name");
const SEARCH = args.includes("--search");
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? null;
const onePlace = opt("place");
const oneNaver = opt("naver");
/** 요청 간격(초). 네이버 검색이 빠르면 400 을 준다 — 막히면 --delay=5 처럼 늘려라. */
const DELAY_MS = Math.max(1, Number(opt("delay") ?? 1.5)) * 1000;

const env = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 네이버 장소 링크·ID 에서 숫자 ID 만 뽑는다.
 * 매치 실패 시 입력값을 그대로 돌려주지 않는다 — URL 이 ID 칸에 들어가면
 * `map-links.ts` 가 깨진 딥링크를 만든다.
 */
function parseNaverPlaceId(raw) {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return s;
  if (/naver\.me\//.test(s)) return null; // 단축 URL — 숫자를 알 수 없다
  if (!/naver\.com/.test(s)) return null;
  return (
    s.match(/\/(?:entry\/)?place\/(\d+)/)?.[1] ??
    s.match(/naver\.com\/[a-z]+\/(\d+)/i)?.[1] ??
    s.match(/[?&](?:id|place)=(\d+)/)?.[1] ??
    null
  );
}

/** 첫 매치만 쓴다 — 대상 업소가 문서 맨 앞에 온다(실측). */
function pick(html, key) {
  return html.match(new RegExp(`"${key}"\\s*:\\s*"([^"]{1,120})"`))?.[1] ?? null;
}

/**
 * m.place.naver.com HTML 안의 Apollo state 에서 상호·주소·좌표를 뽑는다.
 * 카테고리 경로(restaurant/place)가 틀리면 페이지가 비므로 두 번 시도한다.
 */
async function fetchNaverPlace(id) {
  for (const kind of ["restaurant", "place"]) {
    try {
      const res = await fetch(`https://m.place.naver.com/${kind}/${id}/home`, {
        headers: { "user-agent": UA },
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const lat = Number(pick(html, "y"));
      const lng = Number(pick(html, "x"));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
      // 상호는 og:title 이 가장 믿을 만하다 — Apollo 의 첫 "name" 은 업종에 따라
      // 내부 enum("DVLP","RELA" — 시장 페이지에서 실제로 나왔다)을 물어온다.
      // content 끝에 제어문자가 붙어 나온다 — 먼저 털고 " : 네이버" 꼬리를 뗀다
      const ogName = html
        .match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1]
        ?.replace(/[\u0000-\u001f]/g, "")
        .replace(/\s*:\s*네이버\s*$/, "")
        .trim();
      return {
        name: ogName ?? pick(html, "name"),
        address: pick(html, "roadAddress") ?? pick(html, "address"),
        lat,
        lng,
      };
    } catch {
      /* 다음 경로로 */
    }
  }
  return null;
}

// ── 상호 + 좌표로 네이버 장소 검색 (--search) ──────────────────────────────
//
// map.naver.com 의 instant-search 는 `coords` 가 없으면 500 을 준다. 우리가 이미 가진
// 좌표를 넘기면 응답의 `dist`(km) 가 그 좌표 기준 거리라서, 동명이점을 거리로 가른다
// ("금돼지식당"은 서울·경주·부산에 다 있다).
const SEARCH_URL = "https://map.naver.com/p/api/search/instant-search";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** 최대 허용 거리(km). 같은 건물에서도 핀이 조금씩 달라 150m 를 준다. */
const MAX_DIST_KM = 0.15;

/**
 * 가게가 아니라 시설·통로인 항목의 업종. 시장·건물 이름이 그대로 붙어 있어
 * 이름만으로는 못 거른다 — "거제고현시장3동문"(방면정보) 이 실제로 걸렸다.
 */
const FACILITY_CTG = /방면정보|주차장|충전소|정류장|지하철|버스|출입구|편의점/;

/** 공백·구두점·괄호 안 부속표기를 털어낸 비교용 상호. */
function normName(s) {
  return (s ?? "")
    .replace(/[(（][^)）]*[)）]/g, "")
    .replace(/[\s·・,.'"’”\-–—]/g, "")
    .toLowerCase();
}

/**
 * 상호가 같은 가게로 볼 만한가. 포함 관계를 **방향에 따라 다르게** 본다.
 *
 *   우리 이름이 더 길다  → 인정. 우리가 지역을 앞에 붙여 두는 편이다("영광 동락식당").
 *   네이버 이름이 더 길다 → 앞부분이 우리 이름과 같을 때만 인정. 뒤에 붙는 건 지점명이다
 *                          ("아마이까" → "아마이까 사당점").
 *
 * 이 비대칭이 없으면 시장 안에 있는 다른 업소를 그 시장으로 착각한다 —
 * "주문진 어민시장" 이 "CU 주문진어민시장점"(편의점) 에 붙는 걸 실제로 봤다.
 */
function nameMatches(ours, theirs) {
  const a = normName(ours);
  const b = normName(theirs);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  if (a.length > b.length) return a.includes(b); // 우리가 더 김 — 지역 접두 허용
  if (!b.startsWith(a)) return false; // 네이버가 더 김 — 지점명 접미만 허용

  // 접미가 지점명 수준을 넘으면 다른 시설이다.
  // "거제고현시장" 이 "거제고현시장 공영주차장(전통시장) 전기차충전소" 에도,
  // "거제고현시장상인협동조합"(상인회 사무소) 에도 붙는 걸 봤다.
  const suffix = b.slice(a.length);
  if (suffix.length > 8) return false;
  return !/주차장|충전소|정류장|출입구|입구|출구|편의점|협동조합|상인회|사무소|관리사무/.test(suffix);
}

/**
 * 검색 한 번. 400/429 는 "잠깐 몰아쳤다"는 신호라 한 번 쉬고 다시 묻는다 —
 * 1.5초 간격으로 붙이면 몇 건 만에 400 이 쏟아지고, 한참 쉬면 다시 200 이 온다.
 */
async function searchNaver(name, lat, lng, attempt = 0) {
  const url = `${SEARCH_URL}?query=${encodeURIComponent(name)}&coords=${lat},${lng}&lang=ko`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": DESKTOP_UA, referer: "https://map.naver.com/", accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if ((res.status === 400 || res.status === 429) && attempt < 2) {
      await sleep(15_000 * (attempt + 1));
      return searchNaver(name, lat, lng, attempt + 1);
    }
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    const hits = (data.place ?? [])
      .filter(
        (h) =>
          h.id &&
          Number.isFinite(h.dist) &&
          h.dist <= MAX_DIST_KM &&
          !FACILITY_CTG.test(h.ctg ?? "") &&
          nameMatches(name, h.title),
      )
      .sort((a, b) => a.dist - b.dist);
    return { hit: hits[0] ?? null };
  } catch (e) {
    return { error: String(e?.message ?? e) };
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

// ── 대상 모으기 ────────────────────────────────────────────────────────────
let targets;
if (onePlace) {
  if (!oneNaver) {
    console.error("✖ --place 를 쓸 때는 --naver=<링크|숫자ID> 도 필요합니다");
    process.exit(1);
  }
  const naverId = parseNaverPlaceId(oneNaver);
  if (!naverId) {
    console.error(`✖ 네이버 링크에서 ID 를 못 찾았습니다: ${oneNaver}`);
    process.exit(1);
  }
  const rows = await (
    await fetch(
      `${URL_}/rest/v1/places?id=eq.${onePlace}&select=id,slug,name,address,lat,lng,naver_place_id`,
      { headers: H },
    )
  ).json();
  if (!rows[0]) {
    console.error(`✖ 그런 장소가 없습니다: ${onePlace}`);
    process.exit(1);
  }
  targets = [{ ...rows[0], naver_place_id: naverId }];
} else if (SEARCH) {
  // 한국 장소 중 네이버 ID 가 비었고 좌표는 있는 곳 — 좌표가 있어야 동명이점을 가른다
  targets = await (
    await fetch(
      `${URL_}/rest/v1/places?country_code=eq.KR&naver_place_id=is.null&lat=not.is.null` +
        `&select=id,slug,name,address,lat,lng,naver_place_id&order=name`,
      { headers: H },
    )
  ).json();
} else {
  targets = await (
    await fetch(
      `${URL_}/rest/v1/places?naver_place_id=not.is.null&or=(lat.is.null,lng.is.null,address.is.null)` +
        `&select=id,slug,name,address,lat,lng,naver_place_id`,
      { headers: H },
    )
  ).json();
}

console.log(`대상 ${targets.length}곳${DRY ? " (dry-run)" : ""}${SEARCH ? " · 상호+좌표 검색" : ""}`);

let filled = 0;
let missed = 0;
for (const [i, p] of targets.entries()) {
  // --search: ID 를 먼저 찾아낸다. 못 찾으면 건너뛴다 — 틀린 가게를 붙이는 것보다 낫다.
  if (SEARCH) {
    const { hit, error } = await searchNaver(p.name, p.lat, p.lng);
    if (i < targets.length - 1) await sleep(DELAY_MS);
    if (error) {
      console.log(`  ✖ 검색 실패(${error}): ${p.name}`);
      missed++;
      continue;
    }
    if (!hit) {
      console.log(`  · 후보 없음(${MAX_DIST_KM * 1000}m 내 동일 상호): ${p.name}`);
      missed++;
      continue;
    }
    console.log(
      `  ${DRY ? "→" : "✔"} ${p.name} = ${hit.title} (${hit.id}, ${Math.round(hit.dist * 1000)}m, ${hit.ctg ?? "-"})`,
    );
    if (!DRY) {
      const err = await patch(p.id, { naver_place_id: String(hit.id) });
      if (err) {
        console.log(`     ✖ 저장 실패: ${err}`);
        missed++;
        continue;
      }
    }
    filled++;
    continue;
  }

  const info = await fetchNaverPlace(p.naver_place_id);
  if (!info) {
    console.log(`  ✖ 네이버 조회 실패: ${p.name} (${p.naver_place_id})`);
    continue;
  }

  // 사람이 넣은 값을 덮지 않는다. 이름은 --name 을 준 경우에만 교체한다.
  const body = { naver_place_id: p.naver_place_id };
  if (p.lat === null || p.lng === null) Object.assign(body, { lat: info.lat, lng: info.lng });
  if (!p.address && info.address) body.address = info.address;
  if (RENAME && info.name) body.name = info.name;

  // 훑기 모드에서 채울 게 없으면 건너뛴다. --place 는 ID 를 붙이는 게 목적이라 그대로 쓴다.
  const changed = Object.keys(body).filter((k) => k !== "naver_place_id");
  if (changed.length === 0 && !onePlace) {
    console.log(`  · 채울 게 없음: ${p.name}`);
    continue;
  }

  if (DRY) {
    console.log(`  → ${p.name}: ${JSON.stringify(body)}`);
  } else {
    const err = await patch(p.id, body);
    console.log(`  ${err ? "✖" : "✔"} ${info.name ?? p.name}: ${changed.join(", ") || "ID만"}${err ? ` (${err})` : ""}`);
    if (!err) filled++;
  }
  if (i < targets.length - 1) await sleep(DELAY_MS);
}

const tail = SEARCH ? ` · 못 찾음 ${missed}곳(사람이 /admin 에서 넣어야 한다)` : "";
console.log(
  DRY
    ? `dry-run 끝 — 매칭 ${filled}곳${tail}. 실제로 쓰려면 --dry 를 빼라`
    : `${filled}건 반영${tail} — 확정은 /admin 에서 사람이 한다`,
);
