/**
 * 통합 검색 — 순수 매칭·채점.
 *
 * 검색 서버를 두지 않는다. 색인 전체가 gzip 14KB(이름만이면 5.6KB)라 브라우저에
 * 통째로 올려놓고 여기서 훑는 편이 왕복 한 번보다 빠르다. 엔티티가 216개다.
 *
 * DOM·로케일을 모른다 — 서버에서도 테스트에서도 그대로 돈다.
 */

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

/** "도쿄" → "ㄷㅋ". 한글이 아닌 글자는 그대로 둔다 */
export function choseong(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0) - HANGUL_BASE;
    out += code >= 0 && code < HANGUL_COUNT ? CHOSEONG[Math.floor(code / JUNG_JONG)] : ch;
  }
  return out;
}

/** 질의가 초성만으로 이루어졌는가 — 그럴 때만 초성 매칭을 켠다 */
export function isChoseongQuery(q: string): boolean {
  return q.length > 0 && /^[ㄱ-ㅎ]+$/.test(q);
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

/** 0 이면 매칭 없음 */
export function scoreDoc(doc: SearchDoc, query: string): number {
  const cho = isChoseongQuery(query);
  let best = 0;
  for (const field of doc.hay) {
    if (!field) continue;
    const hay = field.toLowerCase();
    let s = 0;
    if (hay === query) s = 100;
    else if (hay.startsWith(query)) s = 80;
    else if (hay.includes(query)) s = 55;
    else if (cho && choseong(field).includes(query)) s = 45;
    if (s > best) best = s;
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
  const query = rawQuery.trim().toLowerCase();
  if (!query) return { top: null, groups: [] };

  const hits = index
    .map((doc) => ({ doc, score: scoreDoc(doc, query) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.doc.name.length - b.doc.name.length);

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
