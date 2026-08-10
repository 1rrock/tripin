#!/usr/bin/env node
/**
 * 채널 후보 실측 프로브 — 인제스트 대상으로 쓸 만한지 YouTube Data API 로 확인한다.
 *
 * 사용: node scripts/ingest/probe-channel.mjs @handle [@handle2 ...] [--pages=2]
 *      node scripts/ingest/probe-channel.mjs UCxxxx --json
 *      node scripts/ingest/probe-channel.mjs UCxxxx --pages=3 --dump   # 전 영상 TSV (미수집 diff 용)
 *
 * 쿼터: 채널당 1(channels) + pages(playlistItems) + pages(videos) ≈ 5 units.
 * search.list 는 쓰지 않는다 (100 units — INGEST.md §2-①).
 *
 * ⛔ 이 스크립트는 로컬 조사용이다. 조회수·구독자수는 요청도 출력도 하지 않는다
 *    (YouTube API §III.E.2 — LEGAL.md). 결과를 DB 에 저장하지 않는다.
 */
import { loadEnv } from "./_lib/env.mjs";



const KEY = loadEnv().YOUTUBE_API_KEY;
if (!KEY) {
  console.error("✖ .env.local 에 YOUTUBE_API_KEY 가 없습니다");
  process.exit(1);
}

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const asDump = args.includes("--dump");
const pages = Number(args.find((a) => a.startsWith("--pages="))?.split("=")[1] ?? 2);
const targets = args.filter((a) => !a.startsWith("--"));
if (targets.length === 0) {
  console.error("사용: node scripts/ingest/probe-channel.mjs @handle [...] [--pages=2] [--json]");
  process.exit(1);
}

/**
 * 더보기란의 구글맵 공유링크. **채널 판정의 최상위 기준이다.**
 * 이게 있으면 자막 추출·LLM 장소 분석·지도 검색 매칭이 전부 불필요하고,
 * 링크가 지점을 특정하므로 동명이점 오확정 리스크도 사라진다.
 * 근거와 실측은 `docs/CHANNEL-CANDIDATES.md` §1·§2.
 */
const MAP_LINK_RE = /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/\w+/g;

/**
 * 링크 없이 **주소로** 장소를 적는 포맷도 쓸 수 있다 (또간집이 이 방식).
 *   15:00📍EJ보쿠조
 *   〒595-0013 Osaka, Izumiotsu, Miyacho, 1−28 EJ牧場
 * 주소가 있으면 `backfill-coords.mjs` 의 2순위 경로(일본 GSI 주소검색, 무료)가 그대로 먹는다.
 * → 📍 마커와 일본 우편번호를 따로 세서, 링크가 0이어도 놓치지 않는다.
 */
const PIN_MARK_RE = /📍/g;
const JP_POSTAL_RE = /〒\s?\d{3}-?\d{4}/g;

/** 이미 데이터가 있는 도시 — 교차 뷰 가치 판정용 (DB 기준 2026-08-09) */
const OWNED_CITIES = ["도쿄", "동경", "오사카", "후쿠오카", "삿포로", "고베", "닛코", "기노사키", "오키나와", "부산", "LA", "로스앤젤레스"];

/** 도시·국가 키워드 — 제목에서 여행지 언급 밀도를 센다 */
const PLACE_WORDS = [
  ...OWNED_CITIES,
  "교토", "나고야", "요코하마", "가고시마", "나가사키", "구마모토", "히로시마", "가나자와", "센다이", "벳푸", "유후인", "다카마쓰", "마쓰야마", "돗토리", "일본",
  "방콕", "치앙마이", "다낭", "하노이", "호치민", "나트랑", "푸꾸옥", "싱가포르", "쿠알라룸푸르", "발리", "자카르타", "마닐라", "세부", "홍콩", "마카오", "타이베이", "대만", "상하이", "베이징", "칭다오",
  "파리", "런던", "로마", "바르셀로나", "마드리드", "리스본", "포르투", "프라하", "빈", "부다페스트", "베를린", "뮌헨", "암스테르담", "취리히", "이스탄불", "아테네",
  "뉴욕", "샌프란시스코", "시애틀", "라스베이거스", "하와이", "밴쿠버", "토론토", "멕시코", "쿠바", "페루", "브라질",
  "서울", "제주", "강릉", "속초", "전주", "대구", "여수", "경주",
];

/** 맛집·상호 언급 가능성이 높은 제목 신호 */
const FOOD_WORDS = ["맛집", "먹방", "식당", "라멘", "스시", "초밥", "돈카츠", "우동", "소바", "야키니쿠", "이자카야", "카페", "빵집", "노포", "미슐랭", "먹을텐데", "먹방", "현지인", "로컬", "코스", "오마카세", "술집", "포차", "시장"];

const api = async (path, params) => {
  const qs = new URLSearchParams({ ...params, key: KEY });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
};

/** ISO8601 PT#H#M#S → 초 */
const durationSec = (iso) => {
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!m) return 0;
  return (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60 + (+(m[4] || 0));
};

const countHits = (text, words) => {
  const hit = new Set();
  for (const w of words) if (text.includes(w)) hit.add(w);
  return hit;
};

const results = [];

for (const target of targets) {
  try {
    const isId = /^UC[\w-]{22}$/.test(target);
    const ch = await api("channels", {
      part: "snippet,contentDetails",
      ...(isId ? { id: target } : { forHandle: target.startsWith("@") ? target : `@${target}` }),
    });
    const c = ch.items?.[0];
    if (!c) {
      results.push({ target, error: "채널을 찾을 수 없음" });
      continue;
    }
    const uploads = c.contentDetails.relatedPlaylists.uploads;

    // 최근 업로드 수집
    const items = [];
    let token;
    for (let p = 0; p < pages; p++) {
      const pl = await api("playlistItems", {
        part: "contentDetails",
        playlistId: uploads,
        maxResults: "50",
        ...(token ? { pageToken: token } : {}),
      });
      items.push(...(pl.items ?? []));
      token = pl.nextPageToken;
      if (!token) break;
    }

    // 제목·길이·자막 플래그
    const videos = [];
    for (let i = 0; i < items.length; i += 50) {
      const ids = items.slice(i, i + 50).map((it) => it.contentDetails.videoId).join(",");
      const vs = await api("videos", { part: "snippet,contentDetails", id: ids });
      for (const v of vs.items ?? []) {
        const desc = v.snippet.description ?? "";
        videos.push({
          id: v.id,
          title: v.snippet.title,
          publishedAt: v.snippet.publishedAt,
          sec: durationSec(v.contentDetails.duration),
          caption: v.contentDetails.caption === "true",
          // 더보기란 구글맵 공유링크 — 최상위 판정 기준 (docs/CHANNEL-CANDIDATES.md §1)
          mapLinks: [...new Set(desc.match(MAP_LINK_RE) ?? [])].length,
          pinMarks: (desc.match(PIN_MARK_RE) ?? []).length,
          jpPostal: (desc.match(JP_POSTAL_RE) ?? []).length,
        });
      }
    }

    const long = videos.filter((v) => v.sec >= 180);
    const allTitles = videos.map((v) => v.title).join(" | ");
    const placeHits = countHits(allTitles, PLACE_WORDS);
    const ownedHits = countHits(allTitles, OWNED_CITIES);
    const foodHits = countHits(allTitles, FOOD_WORDS);
    const travelish = long.filter((v) => countHits(v.title, PLACE_WORDS).size > 0 || countHits(v.title, FOOD_WORDS).size > 0);
    const newest = videos.map((v) => v.publishedAt).sort().at(-1);

    results.push({
      target,
      channelId: c.id,
      ...(asDump ? { all: videos } : {}),
      title: c.snippet.title,
      handle: c.snippet.customUrl,
      country: c.snippet.country ?? "-",
      sampled: videos.length,
      newest: newest?.slice(0, 10),
      longRatio: videos.length ? Math.round((long.length / videos.length) * 100) : 0,
      travelish: travelish.length,
      travelRatio: long.length ? Math.round((travelish.length / long.length) * 100) : 0,
      mapVideos: videos.filter((v) => v.mapLinks > 0).length,
      mapPlaces: videos.reduce((n, v) => n + v.mapLinks, 0),
      pinVideos: videos.filter((v) => v.pinMarks > 0).length,
      pinMarks: videos.reduce((n, v) => n + v.pinMarks, 0),
      postalMarks: videos.reduce((n, v) => n + v.jpPostal, 0),
      cities: [...placeHits],
      ownedCities: [...ownedHits],
      foodWords: [...foodHits],
      manualCaption: videos.filter((v) => v.caption).length,
      samples: travelish.slice(0, 5).map((v) => v.title),
    });
  } catch (e) {
    results.push({ target, error: String(e.message ?? e) });
  }
}

if (asDump && !asJson) {
  // TSV: videoId \t 초 \t 제목  — DB 보유분과 diff 해서 미수집 영상을 찾는 용도
  for (const r of results) {
    for (const v of r.all ?? []) console.log(`${v.id}\t${v.sec}\t${v.title.replace(/\s+/g, " ")}`);
  }
} else if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const r of results) {
    if (r.error) {
      console.log(`\n✖ ${r.target} — ${r.error}`);
      continue;
    }
    console.log(`\n━━ ${r.title}  (${r.handle} · ${r.channelId})`);
    console.log(`   최근 업로드 ${r.newest} · 샘플 ${r.sampled}편 · 롱폼(3분+) ${r.longRatio}%`);
    console.log(`   여행/맛집 제목 ${r.travelish}편 (롱폼의 ${r.travelRatio}%) · 수동자막 ${r.manualCaption}편`);
    console.log(
      `   ★ 더보기 지도링크: ${r.mapVideos}편 / 장소 ${r.mapPlaces}곳` +
        (r.mapVideos ? ` (평균 ${(r.mapPlaces / r.mapVideos).toFixed(1)}곳/편)` : ""),
    );
    console.log(
      `   ★ 더보기 📍마커: ${r.pinVideos}편 / ${r.pinMarks}개 · 일본주소(〒) ${r.postalMarks}개` +
        (r.mapVideos || r.pinVideos ? "" : " ← 둘 다 0이면 자막 의존"),
    );
    console.log(`   보유 도시 교차: ${r.ownedCities.join(", ") || "(없음)"}`);
    console.log(`   등장 도시: ${r.cities.join(", ") || "(없음)"}`);
    console.log(`   음식 키워드: ${r.foodWords.slice(0, 12).join(", ") || "(없음)"}`);
    for (const s of r.samples) console.log(`     · ${s}`);
  }
}
