/**
 * 통합 검색 — 순수 매칭·채점.
 *
 * 검색 서버를 두지 않는다. 색인을 브라우저에 올려놓고 여기서 훑는 편이
 * 왕복 한 번보다 빠르고, 오타·초성·행정 접미 처리도 우리가 쥔다.
 *
 * DOM·로케일을 모른다 — 서버에서도 테스트에서도 그대로 돈다.
 */

import { placePath } from "@/shared/lib/place-path";

export type SearchKind = "city" | "channel" | "type" | "place" | "video";

/** 화면으로 나가는 문서 — **한 로케일만** 담는다(원문 누수 방지, HANDOFF §3-2) */
export interface SearchDoc {
  kind: SearchKind;
  /** 로케일 접두사 없는 경로. 화면에서 `localePath`/`href` 로 감싼다 */
  path: string;
  name: string;
  /** 이름 아래 한 줄 — "Tokyo · 20곳" */
  sub: string;
  /** 매칭 대상. 이름 말고도 핸들·요약 불릿 같은 걸 넣는다 */
  hay: string[];
  /** `unpackIndex` 가 색인을 되읽으며 **그 자리에서 한 번** 붙이는 사전계산값.
      `hay` 와 자리(index)가 1:1 로 맞는다. 서버·테스트에서 그냥 만든 문서는
      비어 있고, 그때는 `scoreDoc` 이 예전처럼 즉석에서 계산한다 */
  lcHay?: string[];
  choHay?: string[];
  /** 채널 고유색 — 아바타 링 */
  accent?: string;
  avatarUrl?: string | null;
  /** 영상 썸네일용 */
  youtubeId?: string;
}

/* ── 한글 초성 ────────────────────────────────────────────────────────
   "ㄷㅋ" 로 도쿄를 찾게 한다. 모바일에서 이름 전체를 치는 건 번거롭고,
   한국어 사용자에게 초성 검색은 기본 기대치다.
   라이브러리를 쓰지 않는다 — 필요한 건 초성 추출 한 줄뿐이다. */

const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const HANGUL_BASE = 0xac00;
const HANGUL_COUNT = 11172;
const JUNG_JONG = 588; // 중성 21 × 종성 28

/* 같은 문자열의 초성을 몇 번이고 다시 만들던 자리다. `textMatchesQuery` 는
   지도 필터에서 같은 hay 를 타건마다 다시 훑기 때문에 한 번 만든 건 들고 있는다.
   상한을 두는 건 지도의 장소·질의 조합이 무한히 늘어날 수 있어서다 —
   넘치면 통째로 버린다(LRU 를 흉내 낼 만큼 비싼 계산이 아니다). */
const CHOSEONG_CACHE = new Map<string, string>();
const CHOSEONG_CACHE_CAP = 20000;

/** "도쿄" → "ㄷㅋ". 한글이 아닌 글자는 그대로 둔다 */
export function choseong(text: string): string {
  const hit = CHOSEONG_CACHE.get(text);
  if (hit !== undefined) return hit;
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0) - HANGUL_BASE;
    out += code >= 0 && code < HANGUL_COUNT ? CHOSEONG[Math.floor(code / JUNG_JONG)] : ch;
  }
  if (CHOSEONG_CACHE.size >= CHOSEONG_CACHE_CAP) CHOSEONG_CACHE.clear();
  CHOSEONG_CACHE.set(text, out);
  return out;
}

/** 질의가 초성만으로 이루어졌는가 — 그럴 때만 초성 매칭을 켠다 */
export function isChoseongQuery(q: string): boolean {
  return q.length > 0 && /^[ㄱ-ㅎ]+$/.test(q);
}

/**
 * 행정 접미를 떼면 "제주도"가 "제주"와 같아진다.
 * 긴 접미부터 본다 — "서울특별시" 가 "시" 만 잃고 "서울특별" 이 되면 안 된다.
 *
 * 실측: search_misses 의 "제주도"(2026-08-13) 는 도시명 "제주" 와 글자가
 * 안 겹쳐 0건이었다. hay.includes(query) 방향이라 "제주".includes("제주도") 가
 * false 다. 질의 쪽을 정규화하는 편이 도시마다 동의어를 적는 것보다 싸다.
 */
const ADMIN_SUFFIX = /(특별자치시|특별자치도|광역시|특별시|자치시|자치도|시|군|구|도|현|부)$/;

/** 원문 + 접미를 뗀 변이. 초성 질의는 원문만. */
export function queryVariants(raw: string): string[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  if (isChoseongQuery(q)) return [q];
  const stripped = q.replace(ADMIN_SUFFIX, "");
  if (stripped.length >= 2 && stripped !== q) return [q, stripped];
  return [q];
}

/** 지도 필터·드롭다운 검색 — 접미 정규화와 초성을 같은 규칙으로. */
export function textMatchesQuery(hay: string, rawQuery: string): boolean {
  const variants = queryVariants(rawQuery);
  if (variants.length === 0) return true;
  const h = hay.toLowerCase();
  for (const v of variants) {
    if (h.includes(v)) return true;
    if (isChoseongQuery(v) && choseong(hay).includes(v)) return true;
  }
  return false;
}

/**
 * 도시명 동의어 — 색인 hay 에 얹는다.
 * 질의 접미 정규화와 겹쳐도 해가 없다. 접미가 아닌 별명(동경)만 여기 산다.
 */
export const CITY_SYNONYMS: Record<string, readonly string[]> = {
  제주: ["제주도", "제주특별자치도"],
  서울: ["서울시", "서울특별시"],
  부산: ["부산시", "부산광역시"],
  인천: ["인천시", "인천광역시"],
  대구: ["대구시", "대구광역시"],
  광주: ["광주시", "광주광역시"],
  대전: ["대전시", "대전광역시"],
  울산: ["울산시", "울산광역시"],
  도쿄: ["동경", "도쿄도"],
  오사카: ["오사카부"],
  후쿠오카: ["후쿠오카현"],
  교토: ["교토부"],
};

/** 도시 문서 hay — 이름·영문·슬러그 + 동의어 + 한글이면 `시` 접미. */
export function cityHay(name: string, nameEn: string, slug: string): string[] {
  const hay = [name, nameEn, slug, ...(CITY_SYNONYMS[name] ?? [])];
  if (/^[가-힣]+$/.test(name) && !/(시|군|구|도)$/.test(name)) hay.push(`${name}시`);
  return hay;
}

/* ── 채점 ─────────────────────────────────────────────────────────────
   "도쿄"의 가장 좋은 답은 영상 목록이 아니라 **도쿄 지도**다. 그래서 점수는
   문자열 유사도만으로 정해지지 않는다 — 목적지(도시·채널·종류)에 가산점을 준다.
   이 가산점이 곧 "대표 결과"를 결정한다. */

const KIND_WEIGHT: Record<SearchKind, number> = {
  city: 30,
  channel: 30,
  type: 26,
  place: 10,
  video: 6,
};

/* ── 전선 형식 ────────────────────────────────────────────────────────
   `/api/search-index` 는 `SearchDoc[]` 을 그대로 싣지 않는다. 실측(ko, 3,015 항목)
   으로 805,618 bytes 였고 그 절반 가까이가 **되풀이되는 군더더기**였다:

     · `path` 34% — 접두사가 4종뿐인데(`/city/` `/c/` `/type/` `/place/`) 항목마다
       실렸고, 장소 경로는 한글 slug 를 퍼센트 인코딩한 상태라 글자당 9바이트였다
       (날 UTF-8 이면 3바이트다)
     · `hay[0]` 27% 중 절반 — ko 에서 3,015/3,015 항목이 `name` 과 같은 문자열이다
     · `kind` 9% — 서로 다른 값 5개가 3,015번
     · 키 이름 자체 — `"kind":"path":"name":"sub":"hay":` 가 항목마다 한 벌씩

   그래서 **튜플 + 사전**으로 바꾼다. 실측 −49% raw / −26% gzip.

   ⚠️ gzip 은 되풀이되는 접두사·키 이름을 이미 잘 압축한다 — raw 가 반으로 줄어도
      gzip 은 4분의 1만 준다. 그래도 값어치가 있는 건 전송량이 아니라 **파싱 비용과
      메모리**다: `JSON.parse` 가 만들던 키 8개짜리 객체 3,015개가 배열 3,015개가
      되고, 되풀이 문자열(kind·접두사·hay[0]·youtubeId)이 애초에 힙에 안 올라온다.

   ⚠️ 사전(`k`·`c`)을 **응답에 함께 싣는다.** 클라이언트가 자기 쪽 상수로 되읽으면
      캐시에 굳은 옛 응답이 새 코드를 만났을 때 종류가 통째로 어긋난다 — 이 응답은
      브라우저 5분·CDN 1시간 캐시다. 사전을 같이 실으면 그런 어긋남이 없다. */

/** 전선 사전의 kind 순서. **`KIND_ORDER`(화면 노출 순서)와 일부러 분리한다** —
    노출 순서를 손댔다고 전선 형식이 따라 바뀌면 안 된다 */
export const KIND_WIRE: readonly SearchKind[] = ["city", "channel", "type", "place", "video"];

/**
 * 압축된 한 항목.
 *
 * 0 kind — 사전(`PackedIndex.k`)의 자리
 * 1 slug — 경로의 **가변부만**. video 는 youtubeId(경로의 마지막 칸이자 화면이 쓰는
 *          썸네일 id — 둘이 늘 같은 문자열이라 따로 싣지 않는다)
 * 2 name
 * 3 sub
 * 4 hay  — `name` 과 겹치는 머리를 뗀 나머지(`packHay`)
 * 5 video: 채널 slug 사전(`PackedIndex.c`)의 자리 · channel: accent
 * 6 channel: avatarUrl
 */
export type PackedDoc = [
  kind: number,
  slug: string,
  name: string,
  sub: string,
  hay: string[],
  extraA?: string | number,
  extraB?: string,
];

export interface PackedIndex {
  /** kind 사전 */
  k: readonly SearchKind[];
  /** 채널 slug 사전 — 영상 경로 `/c/{slug}/v/{id}` 의 가운데 칸(16종뿐이다) */
  c: string[];
  /** 항목 */
  d: PackedDoc[];
}

/**
 * `hay` 에서 `name` 과 겹치는 머리를 뗀다 — 되읽을 때 `name` 을 도로 붙인다.
 *
 * ko 색인은 3,015/3,015 항목이 `hay[0] === name` 이다(장소명·영상 제목·채널명·
 * 도시명이 곧 첫 건초더미다). 즉 이름이 항목마다 두 번 실려 있었다.
 *
 * ⚠️ **en 에서는 늘 같지 않다.** 도시(132)와 종류(6)는 `name` 이 영문 표기인데
 *    `hay[0]` 은 한국어 원문이다("Tokyo" vs "도쿄"). 거기서 머리를 그냥 떼면
 *    EN 화면에서 "도쿄"로 Tokyo 를 못 찾게 된다 — 그래서 **같을 때만** 뗀다.
 *    다를 때는 hay 를 통째로 싣고, 되읽은 결과는 `[name, ...hay]` 가 된다.
 *    `name` 은 그런 항목에서도 언제나 hay 안에 이미 있는 값이라(en 도시의 name 은
 *    hay[1]) 늘어나는 건 중복 하나뿐이고, `scoreDoc` 은 필드들의 **최댓값**만
 *    보므로 점수가 달라지지 않는다. 자리(순서)만 바뀐다.
 */
export function packHay(hay: string[], name: string): string[] {
  return (hay[0] === name ? hay.slice(1) : hay).filter(Boolean);
}

/** 접두사를 kind 로 되살린다 — **로더가 만들던 문자열과 글자 하나까지 같다.**
    장소만 `placePath()`(퍼센트 인코딩)를 거치고 나머지는 날 slug 그대로다 —
    채널·영상 경로의 한글 slug 는 예나 지금이나 인코딩하지 않는다 */
function unpackPath(kind: SearchKind, slug: string, creator: string): string {
  switch (kind) {
    case "city":
      return `/city/${slug}`;
    case "channel":
      return `/c/${slug}`;
    case "type":
      return `/type/${slug}`;
    case "place":
      return placePath(slug);
    case "video":
      return `/c/${creator}/v/${slug}`;
  }
}

/**
 * 받은 압축 색인을 `SearchDoc[]` 으로 되돌린다 — **소문자·초성 사전계산까지 한 번에.**
 *
 * 사전계산을 여기서 하는 이유: 이걸 안 하면 `scoreDoc` 이 타건마다
 * `field.toLowerCase()` 를 문서×필드만큼 새로 할당했다(3,015 문서 × hay 약 3 필드
 * ≈ 9,000 회/키 — 연속으로 빠르게 치면 탭이 통째로 굳었다). 질의가 바뀌어도 문서
 * 쪽 문자열은 그대로라 다시 만들 이유가 없다. 어차피 되읽느라 한 번 도는 순회라
 * 여기 얹으면 공짜다.
 */
export function unpackIndex(packed: PackedIndex): SearchDoc[] {
  const { k: kinds, c: creators, d: rows } = packed;
  const out: SearchDoc[] = new Array(rows.length);
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const kind = kinds[row[0]];
    const slug = row[1];
    const name = row[2];
    // 뗐던 머리를 도로 붙인다 — `packHay` 참고
    const hay = [name, ...row[4]];
    const doc: SearchDoc = {
      kind,
      path: unpackPath(kind, slug, kind === "video" ? (creators[row[5] as number] ?? "") : ""),
      name,
      sub: row[3],
      hay,
      lcHay: hay.map((f) => (f ? f.toLowerCase() : "")),
      choHay: hay.map((f) => (f ? choseong(f) : "")),
    };
    if (kind === "video") doc.youtubeId = slug;
    else if (kind === "channel") {
      // 옛 응답과 같게 — 값이 있을 때만 붙인다(`pickLocale` 이 그랬다)
      if (row[5]) doc.accent = row[5] as string;
      if (row[6]) doc.avatarUrl = row[6];
    }
    out[i] = doc;
  }
  return out;
}

/** 0 이면 매칭 없음 */
export function scoreDoc(doc: SearchDoc, query: string): number {
  const cho = isChoseongQuery(query);
  const { hay: fields, lcHay, choHay } = doc;
  let best = 0;
  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    if (!field) continue;
    // 사전계산이 있으면 읽기만 한다(`prepareIndex`). 없으면 예전 경로 그대로
    const hay = lcHay ? lcHay[i] : field.toLowerCase();
    let s = 0;
    if (hay === query) s = 100;
    else if (hay.startsWith(query)) s = 80;
    else if (hay.includes(query)) s = 55;
    else if (cho && (choHay ? choHay[i] : choseong(field)).includes(query)) s = 45;
    if (s > best) best = s;
    if (best === 100) break; // 완전 일치가 최대치 — 남은 필드를 볼 이유가 없다
  }
  return best === 0 ? 0 : best + KIND_WEIGHT[doc.kind];
}

/** 결과 묶음 — 대표 하나 + 종류별 그룹 */
export interface SearchResults {
  top: SearchDoc | null;
  groups: { kind: SearchKind; total: number; docs: SearchDoc[] }[];
}

/** 그룹 노출 순서 — 목적지 먼저, 내용 나중 */
export const KIND_ORDER: SearchKind[] = ["city", "channel", "type", "place", "video"];

/** 그룹마다 몇 개까지 펼치나 */
const KIND_CAP: Record<SearchKind, number> = {
  city: 4,
  channel: 4,
  type: 4,
  place: 6,
  video: 6,
};

export function search(index: SearchDoc[], rawQuery: string): SearchResults {
  const variants = queryVariants(rawQuery);
  if (variants.length === 0) return { top: null, groups: [] };

  /* 예전엔 `.map(...).filter(...)` 이라 문서 수만큼 래퍼 객체를 만들고 대부분
     버렸다(타건마다 3,015 개). 맞은 것만 담는다 — 정렬은 안정 정렬이라
     원래 순서가 유지되고 결과·순위는 그대로다 */
  const hits: { doc: SearchDoc; score: number }[] = [];
  for (const doc of index) {
    let score = 0;
    for (const v of variants) {
      const s = scoreDoc(doc, v);
      if (s > score) score = s;
    }
    if (score > 0) hits.push({ doc, score });
  }
  hits.sort((a, b) => b.score - a.score || a.doc.name.length - b.doc.name.length);

  if (hits.length === 0) return { top: null, groups: [] };

  const [first, ...rest] = hits;
  const groups = KIND_ORDER.map((kind) => {
    const all = rest.filter((h) => h.doc.kind === kind);
    return { kind, total: all.length, docs: all.slice(0, KIND_CAP[kind]).map((h) => h.doc) };
  }).filter((g) => g.docs.length > 0);

  return { top: first.doc, groups };
}

/**
 * 매칭 구간을 잘라 준다 — 화면에서 그 조각만 왁스로 칠한다.
 * 초성 질의는 원문에 그 글자가 없으므로 강조하지 않는다.
 */
export function highlight(text: string, rawQuery: string): [string, string, string] {
  const query = rawQuery.trim().toLowerCase();
  if (!query || isChoseongQuery(query)) return [text, "", ""];
  const at = text.toLowerCase().indexOf(query);
  if (at < 0) return [text, "", ""];
  return [text.slice(0, at), text.slice(at, at + query.length), text.slice(at + query.length)];
}
