#!/usr/bin/env node
/**
 * 영상 **더보기란**에서 장소를 뽑아 `insert-candidates.mjs` payload 로 만든다.
 *
 * 사용:
 *   node scripts/ingest/parse-description.mjs --creator=<슬러그> --city=<슬러그> <videoId...>
 *   node scripts/ingest/parse-description.mjs --creator=fukuokaajo --city=fukuoka _MqOBpItwWg > payload.json
 *
 * 옵션:
 *   --creator=  크리에이터 슬러그 (필수, 어드민에서 먼저 생성돼 있어야 한다)
 *   --city=     도시 슬러그 (필수)
 *   --min=N     장소가 N개 미만인 영상은 건너뛴다 (기본 1)
 *   --exclude=  장소가 아닌 고정 링크를 쉼표로 (자기 가게·고정 협찬 등)
 *
 * ⚠️ 보일러플레이트 자동 감지는 **영상을 5편 이상 넘길 때만** 동작한다.
 *    한두 편만 처리할 때는 반복을 셀 표본이 없으므로 `--exclude=` 로 직접 빼라.
 *    (실제로 이걸 안 해서 `bar TOMINAGA` 가 장소로 들어간 적이 있다)
 *
 * 왜 이게 있나 — `INGEST.md` 의 ③자막추출·④LLM분석·⑤지도매칭을 통째로 건너뛴다.
 * 더보기란에 크리에이터가 직접 적은 상호·링크·타임스탬프가 이미 정답이기 때문이다.
 * 근거와 채널별 실측은 `docs/CHANNEL-CANDIDATES.md`.
 *
 * ⛔ 좌표는 여기서 해석하지 않는다. `google_maps_url` 만 담고
 *    `backfill-coords.mjs` 가 공유링크 → 좌표를 처리한다(1순위 경로).
 * ⛔ 전부 candidate 로 들어간다. 확정은 /admin/confirm 에서 사람이 한다.
 */
import { loadEnv } from "./_lib/env.mjs";



const KEY = loadEnv().YOUTUBE_API_KEY;
if (!KEY) {
  console.error("✖ .env.local 에 YOUTUBE_API_KEY 가 없습니다");
  process.exit(1);
}

const args = process.argv.slice(2);
const opt = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const creatorSlug = opt("creator");
const citySlug = opt("city");
const minPlaces = Number(opt("min", "1"));
const manualExclude = new Set(
  (opt("exclude", "") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
const videoIds = args.filter((a) => !a.startsWith("--"));

if (!creatorSlug || !citySlug || videoIds.length === 0) {
  console.error("사용: node scripts/ingest/parse-description.mjs --creator=<슬러그> --city=<슬러그> <videoId...>");
  process.exit(1);
}

/** 장소를 가리키는 구글 공유링크. 이것만 장소로 친다 (인스타·예약사이트 등은 제외).
 *  쿼리(?g_st=ic 등)가 붙은 줄도 인정하고, 저장 시에는 쿼리를 떼 둔다. */
const GOOGLE_LINK = /^https:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/\w+(?:\?[^\s]*)?$/;

/** 네이버 장소 링크. 한국 가게는 더보기란에 네이버만 적는 크리에이터가 많다.
 *  이걸 안 보던 시절엔 그런 가게가 통째로 누락됐다 (`칠흑 가양등촌점`). */
const NAVER_LINK =
  /^https:\/\/(?:m\.place|pcmap\.place|place|map)\.naver\.com\/[^\s]+$/;
/** naver.me 단축 링크는 숫자 ID 를 알 수 없어 장소로 치지 않는다 — 사람이 /admin 에서 넣는다. */

const isMapLink = (line) => GOOGLE_LINK.test(line) || NAVER_LINK.test(line);
const stripMapQuery = (url) => url.replace(/\?.*$/, "");
const ANY_URL = /^https?:\/\//;

/** 네이버 링크 → 숫자 장소 ID. 앱 쪽 `shared/lib/place-link-id.ts` 와 같은 규칙. */
function naverPlaceIdOf(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.toLowerCase().endsWith("naver.com")) return null;
    const q = u.searchParams.get("place") ?? u.searchParams.get("id");
    if (q && /^\d+$/.test(q)) return q;
    return u.pathname.match(/\/[a-zA-Z]+\/(\d+)(?:\/|$)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * 상호명으로 쓰면 안 되는 줄 — 채널 공통 문구·안내.
 * 링크 위쪽으로 올라가며 이름을 찾을 때 이 줄들은 건너뛴다.
 */
const NOISE =
  /봐주셔서|좋아요|구독|해상도|사용\s*카메라|안녕하세요|instagram|인스타|예약\s*사이트|문의|이메일|비즈니스|협찬|광고|^[#＃]|^[-=*_·\s]*$|^こんにちは|お仕事|^\*?\s*가게\s*정보|^(?:영업\s*시간|주소|전화|예약|휴무|정기\s*휴무)\s*[:：]|^\d{1,2}:\d{2}\s*[~～\-–]\s*\d{1,2}:\d{2}/i;

/**
 * 상호가 아니라 **설명 문장**인 줄. 링크 위에 감상평을 적어 두는 크리에이터가 있는데,
 * 그 문장이 그대로 상호로 들어가 카드 제목이 된 적이 있다:
 *   "조금은 더 맛집을 알려드리고자 영상 만들어봤어요."
 *   "중심지에 있어 전체적으로 크지 않은 그라나다에서 이동이 편리합니다"
 *
 * 종결어미는 **10자 이상일 때만** 본다 — 짧은 상호가 우연히 걸리는 걸 막는다
 * ("스시야마다" 처럼 `다` 로 끝나는 상호가 실제로 있다).
 * 저장된 상호 1857개에 돌려 오탐 0건을 확인했다.
 */
const PROSE =
  /[.!?]$|^.{10,}(?:요|어요|세요|습니다|입니다|합니다|했어요|봤어요|했지만|드릴게요|드려요|가시면|하지만)$|알려드리|기대해주세요|영상\s*만들|저희에겐|여행\s*가시면/;

/**
 * 상호명 앞에 붙는 것들을 떼어낸다.
 * "00:35 토리베이" / "01:02:47 덴푸라 아게나" (타임라인 겸용 줄)
 * "1/ 오호리우나기" / "① 바쿠마츠" / "- 탄가우동" (머리표)
 * "15:00📍EJ보쿠조" (핀 이모지)
 */
const stripBullet = (s) =>
  s
    .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*/, "") // 선행 타임스탬프
    .replace(/^\s*(?:\d+\s*[/.)\-]|[①-⑳]|[▶▪•·※★☆-])\s*/, "") // 머리표
    .replace(/^\s*📍\s*/, "") // 핀 이모지
    .replace(/\s+/g, " ")
    .trim();

/** 타임라인 줄에서 초 단위 시각. "15:00📍EJ보쿠조" / "00:34 바쿠마츠 카레" */
/**
 * 줄에서 언급 타임스탬프를 뽑는다.
 *
 * ⚠️ 영업시간을 타임스탬프로 집지 않는다. "11:30 ~ 21:00" 같은 줄에서 앞 시각을
 *    가져가는 바람에 1분짜리 영상에 `16:30` 이 붙은 장소가 실제로 있었다
 *    (유저가 누르면 영상 끝을 넘어가 아무 데도 안 간다).
 *    범위 표기(`~`,`-`)나 영업/오픈 문구가 있는 줄은 통째로 버린다.
 */
const HOURS_LINE =
  /\d{1,2}:\d{2}\s*[~～\-–—]\s*\d{1,2}:\d{2}|영업\s*시간|오픈|라스트\s*오더|브레이크\s*타임|휴무/i;

const timeOf = (line) => {
  if (!line || HOURS_LINE.test(line)) return null;
  const m = /(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(line);
  if (!m) return null;
  return m[3] ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2];
};

/** 한글 상호 → 슬러그. 로마자가 없으면 videoId+index 로 유일성을 확보한다. */
const slugify = (name, vid, i) => {
  const base = name
    .toLowerCase()
    .replace(/[^\w가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return base ? `${base}-${vid.slice(0, 4).toLowerCase()}` : `place-${vid.toLowerCase()}-${i}`;
};

const api = async (path, params) => {
  const qs = new URLSearchParams({ ...params, key: KEY });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body;
};

// ── 영상 메타 수집 ──
const items = [];
for (let i = 0; i < videoIds.length; i += 50) {
  // contentDetails 도 같이 받는다 — duration 을 안 채우면 타임라인이 "길이(추정)"로 돈다
  // (HANDOFF.md §4-2 에서 79편 중 78편이 NULL 이던 그 문제)
  const r = await api("videos", { part: "snippet,contentDetails", id: videoIds.slice(i, i + 50).join(",") });
  items.push(...(r.items ?? []));
}

/** ISO8601 PT#H#M#S → 초 */
const durationSec = (iso) => {
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!m) return null;
  return (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60 + (+(m[4] || 0));
};

// ── 채널 전체에 반복되는 링크(보일러플레이트) 걸러내기 ──
// 자기 가게·고정 협찬처럼 매 영상에 붙는 링크는 그 영상의 장소가 아니다.
const linkFreq = new Map();
for (const it of items) {
  for (const l of new Set((it.snippet.description.match(/https:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/\w+/g) ?? []).map(stripMapQuery))) {
    linkFreq.set(l, (linkFreq.get(l) ?? 0) + 1);
  }
}
const boilerplate = new Set([
  ...manualExclude,
  ...[...linkFreq].filter(([, n]) => items.length >= 5 && n >= Math.max(5, items.length * 0.3)).map(([l]) => l),
]);
if (items.length < 5 && manualExclude.size === 0) {
  console.error(
    `  ⚠ 영상이 ${items.length}편뿐이라 보일러플레이트 자동 감지가 동작하지 않는다.\n` +
      `    고정 링크(자기 가게·협찬)가 장소로 섞일 수 있으니 결과를 확인하고 --exclude= 로 빼라.`,
  );
}

const videos = [];
const places = [];
let skipped = 0;

for (const it of items) {
  const vid = it.id;
  const lines = it.snippet.description.split("\n").map((l) => l.trim());
  const found = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!isMapLink(line)) continue;
    const mapUrl = stripMapQuery(line);
    if (boilerplate.has(mapUrl) || seen.has(mapUrl)) continue;
    seen.add(mapUrl);

    // 링크 위로 올라가며 URL·빈줄·공통문구가 아닌 첫 줄을 상호명으로 본다
    // (비밀이야 포맷: 상호 → 주소: → 영업 시간: → 맵링크 — NOISE 가 주소/시간을 건너뛴다)
    let name = null;
    let nameLine = -1;
    let address = null;
    for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
      const c = lines[j];
      if (!c || ANY_URL.test(c)) continue;
      const addr = /^(?:주소)\s*[:：]\s*(.+)$/i.exec(c);
      if (addr) {
        address = address ?? addr[1].trim();
        continue;
      }
      if (NOISE.test(c) || PROSE.test(c)) continue;
      name = stripBullet(c);
      nameLine = j;
      break;
    }
    if (!name) continue;

    // "바쿠마츠 카레 (幕末カリー)" → name + name_local 로 나눈다.
    // 괄호 안이 일본어/한자면 현지 표기로 본다 (라틴 문자는 영문 표기라 그대로 둔다).
    let nameLocal = null;
    const paren = /^(.+?)\s*[（(]\s*([^)）]+?)\s*[)）]\s*$/.exec(name);
    if (paren && /[぀-ヿ一-鿿]/.test(paren[2])) {
      name = paren[1].trim();
      nameLocal = paren[2].trim();
    }

    // 타임스탬프: 이름 줄 자체 또는 그 근처에 있으면 쓴다
    // 영상 길이를 넘는 값은 타임스탬프가 아니다 — 무엇을 잘못 집었든 버린다(2차 방어).
    const rawTs = timeOf(lines[nameLine]) ?? (nameLine > 0 ? timeOf(lines[nameLine - 1]) : null);
    const videoLen = durationSec(it.contentDetails?.duration);
    const ts = rawTs !== null && videoLen && rawTs > videoLen ? null : rawTs;

    // 네이버 링크면 숫자 ID 만 담는다 — 좌표는 `backfill-naver.mjs` 가 채운다.
    // 구글 공유링크는 예전대로 `backfill-coords.mjs` 담당.
    const naverPlaceId = naverPlaceIdOf(mapUrl);
    if (NAVER_LINK.test(mapUrl) && !naverPlaceId) continue; // ID 를 못 뽑는 네이버 링크는 장소로 안 친다

    found.push({
      youtubeVideoId: vid,
      citySlug,
      slug: slugify(name, vid, found.length),
      name,
      nameLocal,
      placeType: "unknown", // 업종은 사람이 확정 — 제목만 보고 추측하지 않는다
      lat: null,
      lng: null,
      address,
      googleMapsUrl: naverPlaceId ? null : mapUrl, // backfill-coords 가 좌표로 바꾼다
      kakaoPlaceId: null,
      naverPlaceId,
      timestampSec: ts,
      mentionNote: null,
      sourceNote: `영상 더보기란에 크리에이터가 직접 표기한 상호 + ${
        naverPlaceId ? "네이버 지도 링크" : "구글 공유링크"
      } (${vid})`,
    });
  }

  if (found.length < minPlaces) {
    skipped++;
    console.error(`  · 건너뜀(${found.length}곳 < ${minPlaces}): ${it.snippet.title.slice(0, 44)}`);
    continue;
  }
  videos.push({
    youtubeVideoId: vid,
    title: it.snippet.title,
    publishedAt: it.snippet.publishedAt,
    durationSec: durationSec(it.contentDetails?.duration),
  });
  places.push(...found);
  console.error(`  ✔ ${String(found.length).padStart(2)}곳  ${it.snippet.title.slice(0, 50)}`);
}

console.error(
  `\n영상 ${videos.length}편 · 장소 ${places.length}곳` +
    (skipped ? ` · 건너뜀 ${skipped}편` : "") +
    (boilerplate.size ? ` · 보일러플레이트 링크 ${boilerplate.size}개 제외` : ""),
);

console.log(JSON.stringify({ creatorSlug, videos, places }, null, 2));
