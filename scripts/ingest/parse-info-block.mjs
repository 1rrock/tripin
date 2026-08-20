#!/usr/bin/env node
/**
 * `[식당정보]` 블록 포맷의 더보기란에서 장소를 뽑는다 (김사원세끼 계열).
 *
 * 사용:
 *   node scripts/ingest/parse-info-block.mjs --creator=kimsawon --limit=40 --dry
 *   node scripts/ingest/parse-info-block.mjs --creator=kimsawon > payload.json
 *
 * 옵션:
 *   --creator=  크리에이터 슬러그 (필수)
 *   --city=     **필터**. 도시는 주소에서 읽는다 — 이건 "이 도시만" 이라는 뜻이다
 *   --limit=N   미수집 영상 중 앞에서 N편만 (기본 전부)
 *   --dry       payload 대신 사람이 읽는 요약을 stderr 로
 *
 * 왜 `parse-description.mjs` 로 안 되나:
 *   그쪽은 **지도 링크 줄**을 앵커로 삼는다. 이 포맷은 링크가
 *   `http://naver.me/xxxx` 단축주소라 place ID 가 안 들어 있고("ID 를 못 뽑는
 *   네이버 링크는 장소로 안 친다"), 아예 `(네이버 지도 정보 없음)` 인 영상도 많다.
 *   대신 이 포맷은 **상호 다음 줄에 도로명 주소**가 그대로 있다:
 *
 *     [식당정보]
 *     돈뼈락 연탄갈비
 *     서울 관악구 남부순환로 1835-26 재승빌딩
 *     http://naver.me/IMQpYeJQ
 *
 *   주소가 있으면 Places 텍스트 검색이 1m 오차로 떨어진다(2026-08-21 실측).
 *
 * ⛔ 오확정 방지 — 이 스크립트의 존재 이유다:
 *   · **지점이 여러 개면 버린다.** "(중곡점/동대문점/상계점/화곡점)" 처럼 적힌 집은
 *     어느 지점인지 영상만으로 못 정한다. 하나를 찍으면 그게 곧 오확정이다.
 *   · Places 가 돌려준 주소의 **구(區)가 크리에이터가 적은 구와 다르면 버린다.**
 *     동명이점은 대개 다른 구에 있다.
 *   · 주소 줄이 없으면 버린다. 상호만으로는 확정하지 않는다.
 *   · **도시는 주소에서 읽는다.** 채널이 "서울 맛집만 올린다" 고 적어 두었어도
 *     실제로는 대전·가평 편이 섞여 있다(실측). 채널 단위로 도시를 못 박으면
 *     대전 가게가 "서울 · …" 로 공개된다.
 *   · DB 에 없는 도시는 버린다 — 새 도시를 만들지 않는다.
 */
import { loadEnv } from "./_lib/env.mjs";
import { fetchChannelUploads, fetchVideoItems } from "./_lib/youtube.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const DRY = args.includes("--dry");
const creatorSlug = opt("creator");
/**
 * `--city` 는 **필터**다. 도시를 지정하지 않는다.
 *
 * 주소에서 도시를 읽어 붙이고, `--city` 를 주면 그 도시가 아닌 곳은 버린다.
 * 이걸 "이 채널은 서울 채널이니 전부 seoul" 로 처리하면 안 된다 — 김사원세끼는
 * 서울 채널이라고 적어 두었지만 실제로는 대전·가평 편이 섞여 있다(실측).
 * 그대로 넣으면 대전 가게가 "서울 · …" 로 공개된다. 그 오류를 방금 38곳 치웠다.
 */
const cityFilter = opt("city");
const LIMIT = Number(opt("limit", "0"));
if (!creatorSlug) {
  console.error("사용: parse-info-block.mjs --creator=<슬러그> [--city=<슬러그>] [--limit=N] [--dry]");
  process.exit(1);
}

const env = loadEnv();
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const K = env.SUPABASE_SERVICE_ROLE_KEY;
const PK = env.GOOGLE_PLACES_API_KEY;
for (const [k, v] of [["NEXT_PUBLIC_SUPABASE_URL", U], ["SUPABASE_SERVICE_ROLE_KEY", K], ["GOOGLE_PLACES_API_KEY", PK]]) {
  if (!v) { console.error(`✖ ${k} 없음`); process.exit(1); }
}
const H = { apikey: K, Authorization: `Bearer ${K}` };
const g = async (p) => (await fetch(`${U}/rest/v1/${p}`, { headers: H })).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 대상 영상 = 채널 업로드 − 이미 DB 에 있는 것 ──
const creator = (await g(`creators?slug=eq.${creatorSlug}&select=id,display_name,youtube_channel_id`))[0];
if (!creator) { console.error(`✖ 크리에이터 없음: ${creatorSlug}`); process.exit(1); }
const have = new Set((await g(`videos?creator_id=eq.${creator.id}&select=youtube_video_id&limit=2000`)).map((v) => v.youtube_video_id));
const ups = await fetchChannelUploads(creator.youtube_channel_id, 500);
let targets = ups.filter((u) => !have.has(u.videoId));
if (LIMIT > 0) targets = targets.slice(0, LIMIT);
console.error(`${creator.display_name}: 업로드 ${ups.length} · 기수집 ${have.size} · 이번 대상 ${targets.length}편\n`);

// ── 더보기란 파싱 ──
/**
 * "[식당정보]" 부터 **다음 대괄호 섹션 전까지**가 블록이다.
 *
 * ⚠️ 빈 줄에서 끊으면 안 된다 — 한 영상에 가게가 여럿일 때 항목 사이가 빈 줄이라
 *    1번만 집고 2·3번을 통째로 놓친다(실측: 10편에서 절반씩 유실).
 *      1. 오월의 김밥 / 서울 관악구 … / naver.me/…
 *      (빈 줄)
 *      2. 고향집 / 경기 과천시 … / naver.me/…
 */
const BLOCK_RE = /\[(?:식당|가게|장소)\s*정보\]\s*\n([\s\S]*?)(?=\n\s*\[|$)/;
/** 여러 지점을 한 줄에 늘어놓는 표기 — 이런 영상은 통째로 버린다 */
const MULTI_BRANCH = /(여러\s*지점|지점이\s*있|검색\s*요망|[가-힣]+점\s*\/\s*[가-힣]+점)/;
/** 한국 도로명·지번 주소 줄 */
const ADDR_LINE = /^(?:서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충[북남]|전[북남]|경[북남]|제주)\S*\s+.+/;
/** 주소에서 구/군 뽑기 — 동명이점 방어의 핵심 */
const guOf = (s) => (/([가-힣]{1,6}[구군])\s/.exec(s ?? "") ?? [])[1] ?? null;

/** 도시 목록 — 새 도시는 만들지 않는다. 못 찾으면 버린다. */
const cityRows = await g("cities?select=id,slug,name&limit=1000");
const cityBySlug = new Map(cityRows.map((c) => [c.slug, c]));
const cityByName = new Map(cityRows.map((c) => [c.name, c]));
/** 주소 앞머리에서 도시를 읽는다. "서울 성동구…"→서울, "경기 가평군…"→가평 */
function cityFromAddress(addr) {
  const first = (addr ?? "").split(/\s+/)[0];
  if (cityByName.has(first)) return cityByName.get(first);
  const m = /^\S+\s+([가-힣]+?)(?:시|군)\s/.exec(addr ?? "");
  if (m && cityByName.has(m[1])) return cityByName.get(m[1]);
  return null;
}

const items = await fetchVideoItems(targets.map((t) => t.videoId));

const places = [];
const videos = [];
const skips = [];

const slugify = (name, vid) =>
  `${name.toLowerCase().replace(/[^0-9a-z가-힣\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40)}-${vid.slice(0, 4).toLowerCase()}`;

async function findPlace(name, address) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "X-Goog-Api-Key": PK, Referer: "https://eatripin.com",
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus",
    },
    body: JSON.stringify({ textQuery: `${name} ${address}`, languageCode: "ko", regionCode: "KR", maxResultCount: 3 }),
  });
  const j = await res.json();
  return (j.places ?? [])[0] ?? null;
}

for (const [i, it] of items.entries()) {
  const vid = it.id;
  const block = BLOCK_RE.exec(it.snippet.description ?? "");
  if (!block) { skips.push({ vid, why: "[식당정보] 블록 없음", title: it.snippet.title }); continue; }
  const lines = block[1].split("\n").map((l) => l.trim());
  if (lines.every((l) => !l)) { skips.push({ vid, why: "블록이 비었음", title: it.snippet.title }); continue; }
  if (MULTI_BRANCH.test(block[1])) { skips.push({ vid, why: "지점 여러 곳 — 특정 불가", title: it.snippet.title }); continue; }

  // 주소 줄을 앵커로 삼고 바로 위의 상호를 짝지운다 — 한 블록에 여러 가게가 올 수 있다.
  const entries = [];
  for (let li = 0; li < lines.length; li++) {
    if (!ADDR_LINE.test(lines[li])) continue;
    for (let j = li - 1; j >= 0; j--) {
      const c = lines[j];
      if (!c || /^https?:/i.test(c)) continue;
      // "1. 오월의 김밥" → "오월의 김밥"
      const nm = c.replace(/^\d+\s*[.)]\s*/, "").trim();
      // ⚠️ 상호 자리에 주소가 오면 버린다. 지점을 여러 개 늘어놓을 때 생긴다:
      //     대한옥
      //     서울 영등포구 영등포로51길 6 1층 대한옥 (본점)
      //     http://naver.me/…
      //     (빈 줄)
      //     서울 영등포구 가마산로69가길 7 (신길점)   ← 이 줄의 "이름"을 위에서 찾으면
      //     http://naver.me/…                          첫 지점의 주소가 상호가 된다
      //   실제로 "서울 영등포구 영등포로51길 6 1층 대한옥 (본점)" 이 상호로 들어갔다.
      //   지점 하나를 잃더라도 쓰레기 상호를 만들지 않는다.
      if (nm && !ADDR_LINE.test(nm)) entries.push({ name: nm, address: lines[li] });
      break;
    }
  }
  if (entries.length === 0) { skips.push({ vid, why: "주소 줄 없음", title: it.snippet.title }); continue; }

  let addedForVideo = 0;
  for (const entry of entries) {
    const { name, address } = entry;
    const city = cityFromAddress(address);
    if (!city) { skips.push({ vid, why: `도시 미상 — 새 도시는 만들지 않는다 (${address.slice(0, 24)})`, title: it.snippet.title }); continue; }
    if (cityFilter && city.slug !== cityFilter) { skips.push({ vid, why: `--city=${cityFilter} 아님 (${city.name})`, title: it.snippet.title }); continue; }

    const hit = await findPlace(name, address);
    await sleep(220);
    if (!hit) { skips.push({ vid, why: `Places 미발견 (${name})`, title: it.snippet.title }); continue; }

    // 구(區)가 다르면 다른 가게다 — 버린다
    const wantGu = guOf(address);
    const gotGu = guOf(hit.formattedAddress);
    if (wantGu && gotGu && wantGu !== gotGu) {
      skips.push({ vid, why: `구 불일치: 적힌 ${wantGu} vs 구글 ${gotGu} (${name})`, title: it.snippet.title });
      continue;
    }

    if (addedForVideo === 0) {
      videos.push({ youtubeVideoId: vid, title: it.snippet.title, publishedAt: it.snippet.publishedAt, durationSec: (() => {
        const m = /^PT(\d+)S$/.exec(it.contentDetails?.duration ?? ""); return m ? Number(m[1]) : null;
      })() });
    }
    addedForVideo++;
    places.push({
      youtubeVideoId: vid, citySlug: city.slug,
      slug: slugify(`${name}-${addedForVideo}`, vid),
      name, nameLocal: null, placeType: "unknown",
      lat: null, lng: null,
      address,
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${hit.id}`,
      kakaoPlaceId: null, naverPlaceId: null,
      timestampSec: null,
      mentionNote: null,
      sourceNote: `영상 더보기란 [식당정보] 블록에 크리에이터가 직접 표기한 상호·주소 (${vid}). 구글 등록 주소와 구(區) 일치 확인.`,
    });
    console.error(`  ✔ [${city.name}] ${name}  |  ${address.slice(0, 38)}`);
  }
  if (i % 20 === 19) console.error(`    … ${i + 1}/${items.length}`);
}

console.error(`\n영상 ${videos.length}편 · 장소 ${places.length}곳 · 건너뜀 ${skips.length}편`);
if (skips.length) {
  console.error("\n건너뛴 이유:");
  const byWhy = {};
  for (const s of skips) byWhy[s.why.replace(/\(.*\)/, "").trim()] = (byWhy[s.why.replace(/\(.*\)/, "").trim()] ?? 0) + 1;
  for (const [w, n] of Object.entries(byWhy).sort((a, b) => b[1] - a[1])) console.error(`  ${String(n).padStart(3)}편  ${w}`);
}

if (!DRY) process.stdout.write(JSON.stringify({ creatorSlug, videos, places }, null, 2));
void cityBySlug;
