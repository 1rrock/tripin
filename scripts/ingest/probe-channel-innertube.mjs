#!/usr/bin/env node
/**
 * 채널 수율 프로브 — **API 키 없이** 더보기란 품질을 실측한다.
 *
 * 사용:
 *   node scripts/ingest/probe-channel-innertube.mjs --all
 *   node scripts/ingest/probe-channel-innertube.mjs kwaktube kkiri
 *   node scripts/ingest/probe-channel-innertube.mjs UCxxxx --sample=20
 *
 * 왜 `probe-channel.mjs` 를 안 쓰는가:
 *   그쪽은 YouTube Data API 키를 쓴다. 이 리포의 `YOUTUBE_API_KEY` 는 HTTP 리퍼러
 *   제한이 걸려 있어 서버사이드 호출이 403 이다(`Requests from referer <empty>`).
 *   여기서는 `fetch-transcript.mjs` 와 같은 InnerTube 를 써서 키 없이 같은 판정을 한다.
 *   쿼터도 소모하지 않는다.
 *
 * 무엇을 재는가 — **더보기란에 장소가 적혀 있는 비율**:
 *   이것 하나가 조각 수율을 열 배 가른다. 2026-08-21 실측:
 *     · 후쿠오카 아저씨(더보기란에 상호·링크 있음) → 647곳
 *     · 곽튜브(인사말·광고고지만)                  → 부산 하루 종일 파서 11곳
 *   자막(ko/asr)은 상호를 뭉개므로 대안이 못 된다. 착수 전에 이걸 먼저 찍는다.
 *
 * ⛔ 조회수·구독자수는 요청도 출력도 하지 않는다 (YouTube API §III.E.2).
 *    결과를 DB 에 저장하지 않는다 — 조사용 일회성 출력이다.
 */
import { loadEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const SAMPLE = Number(args.find((a) => a.startsWith("--sample="))?.split("=")[1] ?? 12);
const MAXVIDS = Number(args.find((a) => a.startsWith("--videos="))?.split("=")[1] ?? 400);
const targets = args.filter((a) => !a.startsWith("--"));

if (!ALL && targets.length === 0) {
  console.error("사용: probe-channel-innertube.mjs [--all] [slug|UCxxxx ...] [--sample=12]");
  process.exit(1);
}

const WEB = {
  ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  context: { client: { clientName: "WEB", clientVersion: "2.20240701.00.00", hl: "ko", gl: "KR" } },
};
const IOS = {
  ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
  context: {
    client: {
      clientName: "IOS", clientVersion: "20.10.4", deviceMake: "Apple",
      deviceModel: "iPhone16,2", osName: "iPhone", osVersion: "18.3.2.22D82", hl: "ko",
    },
  },
};
/** InnerTube 웹 공개 키. 사용자 자격증명이 아니라 클라이언트 상수다. */
const ITKEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function browse(body) {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${ITKEY}&prettyPrint=false`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": WEB.ua },
    body: JSON.stringify({ context: WEB.context, ...body }),
  });
  return res.json();
}

function walk(o, pred, out = []) {
  if (!o || typeof o !== "object") return out;
  if (pred(o)) out.push(o);
  for (const v of Object.values(o)) walk(v, pred, out);
  return out;
}

/**
 * 채널 업로드 목록.
 * ⚠️ 요즘 응답은 `videoRenderer` 가 아니라 **`lockupViewModel`** 이다
 *    (`contentId` + `metadata.lockupMetadataViewModel.title.content`).
 *    옛 파서를 그대로 쓰면 조용히 0건이 나온다 — 2026-08-21 확인.
 */
async function uploads(channelId, max) {
  const seen = new Map();
  let tok = null;
  for (let page = 0; page < 30; page++) {
    const r = await browse(tok ? { continuation: tok } : { browseId: channelId, params: "EgZ2aWRlb3PyBgQKAjoA" });
    const locks = walk(r, (o) => o.lockupViewModel).map((o) => o.lockupViewModel);
    let added = 0;
    for (const l of locks) {
      if (!l.contentId || seen.has(l.contentId)) continue;
      seen.set(l.contentId, l.metadata?.lockupMetadataViewModel?.title?.content ?? "");
      added++;
      if (seen.size >= max) return seen;
    }
    const next = walk(r, (o) => o.continuationItemRenderer)
      .map((o) => o.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token)
      .filter(Boolean)
      .find((t) => t && t !== tok);
    if (!next || added === 0) break;
    tok = next;
    await sleep(700);
  }
  return seen;
}

async function description(videoId) {
  const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": IOS.ua },
    body: JSON.stringify({ context: IOS.context, videoId, contentCheckOk: true, racyCheckOk: true }),
  });
  const d = await res.json();
  return d?.videoDetails?.shortDescription ?? "";
}

// ── 판정 신호 ──
/** 구글맵 공유링크 — 최상위 기준. 있으면 동명이점 리스크가 사라진다. */
const MAP_LINK = /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/\S+/g;
const NAVER_LINK = /https?:\/\/naver\.me\/\S+|map\.naver\.com\/\S+/g;
const PIN = /📍/g;
const JP_POSTAL = /〒\s?\d{3}-?\d{4}/g;
/**
 * 한국 도로명 주소.
 *
 * ⚠️ 도로 토큰만 보면 안 된다 — `[가-힣]{2,}로\s?\d+` 는 **"맥북프로 16"** 에 걸린다
 *    ("프로"가 `로` 로 끝난다). 곽튜브 더보기란의 촬영장비 문구가 전부 오탐으로
 *    잡혀 "한국주소 100%" 가 나왔다(2026-08-21). 그대로 믿으면 없는 주소를 찾아
 *    며칠을 버린다.
 *
 * 그래서 **행정구역 토큰과 도로 토큰이 둘 다** 있을 때만 주소로 친다.
 */
const KR_ADMIN = /(?:특별시|광역시|특별자치시|특별자치도|[가-힣]{2,}시\s|[가-힣]{2,}군\s|[가-힣]{2,}구\s)/;
const KR_ROAD_TOKEN = /[가-힣]{2,}(?:대?로|길)\s?\d+(?:-\d+)?(?:번길)?/;
const hasKrAddress = (s) => KR_ADMIN.test(s) && KR_ROAD_TOKEN.test(s);
/** "가게명 / 상호 / 주소:" 처럼 라벨을 붙여 적는 포맷 */
const LABEL = /(가게\s?명|상호|주소)\s*[:：]?/g;
const TIMESTAMP = /^\s*\d{1,2}:\d{2}/gm;

const count = (s, re) => (s.match(re) ?? []).length;

async function probe(label, channelId) {
  const vids = await uploads(channelId, MAXVIDS);
  if (vids.size === 0) {
    console.log(`\n### ${label}\n  ✖ 업로드 목록을 못 읽었다 (channelId 확인 필요: ${channelId})`);
    return null;
  }
  const ids = [...vids.keys()];
  // 앞·중간·뒤를 고루 뽑는다 — 최근 영상만 보면 포맷 변화를 놓친다(곽튜브 사례)
  const picks = [];
  const step = Math.max(1, Math.floor(ids.length / SAMPLE));
  for (let i = 0; i < ids.length && picks.length < SAMPLE; i += step) picks.push(ids[i]);

  const stat = { mapLink: 0, naver: 0, pin: 0, jp: 0, kr: 0, label: 0, ts: 0, empty: 0 };
  for (const [i, id] of picks.entries()) {
    let d = "";
    try {
      d = await description(id);
    } catch {
      /* 건너뛴다 */
    }
    if (!d.trim()) stat.empty++;
    if (count(d, MAP_LINK)) stat.mapLink++;
    if (count(d, NAVER_LINK)) stat.naver++;
    if (count(d, PIN)) stat.pin++;
    if (count(d, JP_POSTAL)) stat.jp++;
    if (hasKrAddress(d)) stat.kr++;
    if (count(d, LABEL)) stat.label++;
    if (count(d, TIMESTAMP) >= 3) stat.ts++;
    if (i < picks.length - 1) await sleep(1400);
  }

  const n = picks.length;
  const pct = (x) => `${String(Math.round((x / n) * 100)).padStart(3)}%`;
  // 장소가 특정되는 신호: 지도링크 ≫ 주소 > 라벨
  const strong = Math.max(stat.mapLink, stat.naver);
  const addr = Math.max(stat.jp, stat.kr);
  const anyPlace = Math.max(strong, addr, stat.label);
  const verdict =
    strong / n >= 0.5 ? "★★★ 지도링크 — 파싱만으로 대량 수집" :
    addr / n >= 0.5 ? "★★☆ 주소 표기 — backfill-coords 로 좌표 확보 가능" :
    stat.label / n >= 0.4 ? "★★☆ 상호 라벨 — 주소 검색 대조 필요" :
    anyPlace / n >= 0.2 ? "★☆☆ 드문드문 — 편당 수율 낮음" :
    "☆☆☆ 더보기란에 장소 없음 — 자막 파기는 비용 대비 손해";

  console.log(`\n### ${label}`);
  console.log(`  업로드 ${vids.size}편${vids.size >= MAXVIDS ? "+" : ""} · 표본 ${n}편`);
  console.log(`  지도링크 ${pct(stat.mapLink)}  네이버 ${pct(stat.naver)}  📍 ${pct(stat.pin)}`);
  console.log(`  일본주소 ${pct(stat.jp)}  한국주소 ${pct(stat.kr)}  상호라벨 ${pct(stat.label)}  타임스탬프 ${pct(stat.ts)}`);
  console.log(`  → ${verdict}`);
  return { label, uploads: vids.size, n, stat, verdict };
}

// ── 대상 결정 ──
const env = loadEnv();
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const K = env.SUPABASE_SERVICE_ROLE_KEY;
let list = [];
if (U && K) {
  const res = await fetch(
    `${U}/rest/v1/creators?select=slug,display_name,youtube_channel_id,place_count,video_count&order=place_count.desc`,
    { headers: { apikey: K, Authorization: `Bearer ${K}` } },
  );
  const creators = await res.json();
  list = ALL
    ? creators.filter((c) => c.youtube_channel_id)
    : creators.filter((c) => targets.includes(c.slug) && c.youtube_channel_id);
}
// DB 에 없는 채널 ID 를 직접 준 경우
for (const t of targets) {
  if (t.startsWith("UC") && !list.some((c) => c.youtube_channel_id === t)) {
    list.push({ display_name: t, youtube_channel_id: t, place_count: null, video_count: null });
  }
}
if (list.length === 0) {
  console.error("✖ 대상 채널이 없다 — slug 가 맞는지, youtube_channel_id 가 채워져 있는지 확인");
  process.exit(1);
}

console.log(`채널 ${list.length}개 프로브 (표본 ${SAMPLE}편/채널)`);
const results = [];
for (const c of list) {
  const label = `${c.display_name}${c.place_count != null ? ` — 현재 ${c.place_count}곳 / 영상 ${c.video_count}편 수집됨` : ""}`;
  const r = await probe(label, c.youtube_channel_id);
  if (r) results.push({ ...r, place_count: c.place_count, video_count: c.video_count });
  await sleep(1200);
}

console.log(`\n\n═══ 요약 (수율 좋은 순) ═══`);
const rank = (r) => Math.max(r.stat.mapLink, r.stat.naver) * 3 + Math.max(r.stat.jp, r.stat.kr) * 2 + r.stat.label;
for (const r of results.sort((a, b) => rank(b) - rank(a))) {
  const untapped = r.video_count != null && r.uploads > r.video_count ? `  ← 미수집 ${r.uploads - r.video_count}편+` : "";
  console.log(`  ${r.verdict.slice(0, 3)}  ${r.label.split(" — ")[0].padEnd(22)} ${String(r.uploads).padStart(4)}편${untapped}`);
}
