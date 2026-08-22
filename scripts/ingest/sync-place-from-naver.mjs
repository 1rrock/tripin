#!/usr/bin/env node
/**
 * 크리에이터가 직접 붙인 네이버 링크를 **주소·좌표의 원본으로 삼아** 우리 값을 맞춘다.
 *
 * 사용:
 *   node scripts/ingest/sync-place-from-naver.mjs                 무엇이 바뀌는지만 보여준다
 *   node scripts/ingest/sync-place-from-naver.mjs --apply         실제로 고친다
 *   node scripts/ingest/sync-place-from-naver.mjs --min-m=500     이보다 많이 어긋난 것만
 *   node scripts/ingest/sync-place-from-naver.mjs --id=1234,5678  네이버 ID 를 찍어서
 *
 * 왜 이게 있나 — 인제스트는 상호를 구글에 검색해 좌표·주소를 채운다. 그런데 구글이
 * **다른 가게를 물어오는 일이 있다.** 실측으로 나온 것들:
 *
 *   "강진식육식당"(광주 북구)  → 구글은 서울 광진구 "강진식당" 을 물어왔다
 *   "거창 암소한마리"(경남 거창) → 구글은 서울 종로 "I`M SO SEOUL" 을 물어왔다
 *   "스담"(서울 성북구)        → 구글은 서울 중구의 다른 "스담" 을 물어왔다
 *
 * 그 결과 주소는 서울인데 실제 가게는 광주·거창인 행이 생긴다. 요약 불릿에 도시명이
 * 박혀 있어 화면에서도 어긋나 보인다.
 *
 * 반면 `naver_place_id` 는 **크리에이터가 영상 더보기란에 직접 붙인 링크**에서 온 것이
 * 많다(`source_note` 참고). 그건 사람이 고른 값이라 검색 추측보다 믿을 만하다.
 * 그래서 네이버 장소의 주소·좌표를 우리 값에 덮어쓴다.
 *
 * ⚠️ **네이버 ID 자체가 맞는지 먼저 확인해라.** 이 스크립트는 ID 를 믿고 그 좌표를
 *    가져온다. ID 가 엉뚱한 가게를 가리키면 오히려 멀쩡한 주소를 망친다.
 *    `check-naver-entry.mjs`(링크가 열리는지) → `verify-naver.mjs`(엉뚱한 가게인지)
 *    를 먼저 돌린 뒤에 이걸 돌려라.
 *
 * ⚠️ 네이버 주소에는 두 가지 버릇이 있다(실측):
 *    · 광주광역시를 `"전남광주 북구 …"` 로 준다. 좌표가 광주 안일 때만 `"광주 …"` 로 고친다.
 *    · 도로명 끝에 상호를 덧붙인다 — `"대구 동구 신암남로 150 맛찬들왕소금구이 대구본점"`.
 *      우리 상호와 같은 꼬리는 떼고 저장한다.
 *
 * 요약 불릿 둘째 줄이 `"{도시} · {주소}"` 꼴이면 주소 토막도 같이 갈아 끼운다
 * (`fix-place-city.mjs` 와 같은 규칙). 도시(city_id)는 건드리지 않는다 —
 * **주소를 고친 뒤 `fix-place-city.mjs` 를 돌려라.** 도시가 따라 옮겨간다.
 *
 * ⛔ 로컬(어드민) 전용. `map_status`·`is_published`·`google_place_id` 는 건드리지 않는다.
 */
import { requireEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? null;
const COUNTRY = (opt("country") ?? "KR").toUpperCase();
/** 이보다 가까우면 건드리지 않는다 — 같은 건물에서도 핀은 조금씩 다르다. */
const MIN_M = Number(opt("min-m") ?? 200);
const ONLY = opt("id")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
const DELAY_MS = Math.max(0, Number(opt("delay") ?? 0.9) * 1000);

const env = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 두 좌표 사이 거리(km). */
function distKm(aLat, aLng, bLat, bLng) {
  const rad = (x) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const SIDO = new Set([
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
]);
/** 광주광역시 대략 범위 — 네이버의 `"전남광주"` 를 고쳐도 되는지 좌표로 확인한다. */
const inGwangju = (lat, lng) => lat > 35.05 && lat < 35.27 && lng > 126.7 && lng < 127.0;

/** 상호 비교용 정규화 — verify-naver.mjs 와 같은 규칙. */
function normName(s) {
  return (s ?? "")
    .replace(/[(（][^)）]*[)）]/g, "")
    .replace(/[\s·・,.'"’”\-–—]/g, "")
    .toLowerCase();
}

/**
 * 네이버 도로명주소를 우리가 저장할 꼴로 다듬는다.
 * @returns {{address: string, warn: string|null}}
 */
function tidyAddress(road, ourName, naverName, lat, lng) {
  let out = road.trim().replace(/\s+/g, " ");
  let warn = null;

  const head = out.split(" ")[0] ?? "";
  if (!SIDO.has(head)) {
    if (head === "전남광주" && inGwangju(lat, lng)) {
      out = `광주${out.slice(head.length)}`;
    } else {
      warn = `시도 표기가 낯설다("${head}") — 사람이 확인해라`;
    }
  }

  /* 도로명 끝에 상호가 붙어 오는 일이 있다 —
       "대구 동구 신암남로 150 맛찬들왕소금구이 대구본점"
       "광주 서구 유림로98번길 37 1층 텐진야끼니꾸"   (상호의 앞토막만 붙기도 한다)
     끝에서부터, **상호 안에 들어 있는 토막**인 동안만 떼어낸다.
     "1층"·"101호"·"90-35" 같은 층·호·번지 표기는 주소의 일부라 만나는 즉시 멈춘다. */
  const isUnit = (t) => /^[\d-]+$/.test(t) || /^(지하\d*|b\d+|\d+층|\d+호|[\d-]+동)$/i.test(t);
  const parts = out.split(" ").filter(Boolean);
  for (const candidate of [naverName, ourName]) {
    const n = normName(candidate);
    if (n.length < 2) continue;
    /* 상호는 길어야 서너 토막이다. 그 이상 떼면 도로명을 갉아먹는다. */
    for (let guard = 0; guard < 4 && parts.length > 3; guard++) {
      const tail = parts.at(-1);
      if (isUnit(tail)) break;
      const t = normName(tail);
      if (t.length < 2 || !n.includes(t)) break;
      parts.pop();
    }
  }
  out = parts.join(" ");

  return { address: out.trim(), warn };
}

/** 요약 불릿 둘째 줄 `"{도시} · {주소}"` 의 주소 토막만 갈아 끼운다. */
function retouchBullets(bullets, newAddress) {
  if (!Array.isArray(bullets) || bullets.length < 2) return null;
  const line = bullets[1];
  if (typeof line !== "string") return null;
  const m = line.match(/^(.+?)\s·\s(.+)$/);
  if (!m) return null;
  if (m[2] === newAddress) return null;
  const next = [...bullets];
  next[1] = `${m[1]} · ${newAddress}`;
  return next;
}

async function summary(id, attempt = 0) {
  try {
    const res = await fetch(`https://map.naver.com/p/api/place/summary/${id}`, {
      headers: { "user-agent": DESKTOP_UA, referer: "https://map.naver.com/", accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      if (attempt < 3) {
        await sleep([5_000, 15_000, 40_000][attempt]);
        return summary(id, attempt + 1);
      }
      return null;
    }
    const d = (await res.json())?.data?.placeDetail;
    if (!d?.name) return null;
    const lat = Number(d.coordinate?.latitude);
    const lng = Number(d.coordinate?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { name: d.name, road: d.address?.roadAddress ?? null, jibun: d.address?.address ?? null, lat, lng };
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
const where = ONLY
  ? `naver_place_id=in.(${ONLY.join(",")})`
  : COUNTRY === "ALL"
    ? "naver_place_id=not.is.null"
    : `country_code=eq.${COUNTRY}&naver_place_id=not.is.null`;
const targets = [];
for (let offset = 0; ; offset += 1000) {
  const page = await (
    await fetch(
      `${URL_}/rest/v1/places?${where}&select=id,name,address,lat,lng,naver_place_id,summary_bullets` +
        `&order=name&limit=1000&offset=${offset}`,
      { headers: H },
    )
  ).json();
  targets.push(...page);
  if (page.length < 1000) break;
}

console.log(
  `대상 ${targets.length}곳 (${ONLY ? "지정 ID" : COUNTRY}) · ${MIN_M}m 넘게 어긋난 것만` +
    `${APPLY ? " · 실제로 고친다" : " · 보여주기만(고치려면 --apply)"}`,
);

let changed = 0;
let same = 0;
let failed = 0;
const warns = [];

for (const [i, p] of targets.entries()) {
  const n = await summary(p.naver_place_id);
  if (!n) {
    failed++;
    console.log(`  ? ${p.name} (${p.naver_place_id}) — 네이버 응답 없음. 건너뛴다`);
    if (DELAY_MS && i < targets.length - 1) await sleep(DELAY_MS);
    continue;
  }
  const m = p.lat === null || p.lng === null ? Infinity : Math.round(distKm(p.lat, p.lng, n.lat, n.lng) * 1000);
  if (m < MIN_M) {
    same++;
    if (DELAY_MS && i < targets.length - 1) await sleep(DELAY_MS);
    continue;
  }

  const body = { lat: n.lat, lng: n.lng };
  let addrLine = "주소는 그대로(네이버에 도로명 없음)";
  if (n.road) {
    const { address, warn } = tidyAddress(n.road, p.name, n.name, n.lat, n.lng);
    if (warn) warns.push(`${p.name}: ${warn}`);
    body.address = address;
    addrLine = `${p.address ?? "(없음)"}\n         → ${address}`;
    const bullets = retouchBullets(p.summary_bullets, address);
    if (bullets) body.summary_bullets = bullets;
  }

  console.log(
    `\n  ${APPLY ? "✔" : "·"} ${p.name} (${p.naver_place_id}) — ${m === Infinity ? "좌표 없음" : `${m}m 어긋남`}` +
      `\n     네이버 상호: "${n.name}"` +
      `\n     주소: ${addrLine}` +
      `\n     좌표: ${p.lat?.toFixed(5) ?? "-"},${p.lng?.toFixed(5) ?? "-"} → ${n.lat.toFixed(5)},${n.lng.toFixed(5)}` +
      (body.summary_bullets ? `\n     요약 불릿 주소 토막도 함께 갈아 끼운다` : ""),
  );

  if (APPLY) {
    const err = await patch(p.id, body);
    if (err) {
      failed++;
      console.log(`     ✖ 저장 실패: ${err}`);
    } else {
      changed++;
    }
  } else {
    changed++;
  }
  if (DELAY_MS && i < targets.length - 1) await sleep(DELAY_MS);
}

console.log(
  `\n끝 — ${APPLY ? "고침" : "고칠 것"} ${changed} · 그대로 ${same} · 실패/건너뜀 ${failed}` +
    (APPLY ? "" : " (실제로 고치려면 --apply)"),
);
if (warns.length) {
  console.log(`\n확인 필요 ${warns.length}건`);
  for (const w of warns) console.log(`   · ${w}`);
}
if (changed && APPLY) {
  console.log(`\n다음: 주소가 바뀌었으니 도시 배정을 다시 맞춰라 —\n  node scripts/ingest/fix-place-city.mjs`);
}
