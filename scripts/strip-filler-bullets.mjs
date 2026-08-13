/**
 * 자동 채움 불릿 제거 — 수집 파이프라인이 요약 자리를 메우려고 넣은 무정보 문장을 지운다.
 *
 * 왜: `summary_bullets` 는 "영상에서만 알 수 있는 것"을 담는 자리인데, 상당수 장소가
 * 아래 네 종류로 채워져 있었다. 전부 화면 다른 곳에 이미 있거나(주소·유형 칩),
 * 페이지 전체가 그 얘기라(출처 영상) 정보량이 0이다. 게다가 같은 문자열이 수십~백여 회
 * 반복돼 thin·중복 콘텐츠 신호가 된다 — 2026-08-13 SEO 감사에서 "식당." 116회,
 * "…영상에서 소개." 96회, "구글 지도에서 위치 확인." 71회로 확인.
 *
 *   1) 유형 라벨      "식당." · "카페." · "숙소." …
 *   2) 도시 · 주소 줄  "후쿠오카 · 2-chōme-3-1 Enokida, Hakata Ward, …"
 *   3) 출처 상투구     "곽튜브 영상에서 소개."
 *   4) 지도 상투구     "구글 지도에서 위치 확인."
 *
 * ⚠️ "구글 등록명: X." 는 **지우지 않는다.** 장소마다 문자열이 달라 중복 신호가 아니고,
 *    `name` 과 다른 검색 별칭을 담고 있는데(예: "니타카쇼쿠도" → "하루요시 쇼쿠도")
 *    이 값을 담을 다른 컬럼이 없다. `name_local` 은 **현지어** 자리라(EN 화면의 주 표기,
 *    `shared/i18n/display.ts:17`) 한국어 별칭을 넣으면 의미가 틀린다.
 *
 * 불릿이 전부 지워진 장소는 `SummaryBlock`(`shared/ui/SummaryBlock.tsx:36`)이 블록째
 * 렌더하지 않는다 — 상호명·주소·타임코드·영상/지도 링크는 다른 필드라 그대로 남는다.
 *
 * 사용:
 *   node scripts/strip-filler-bullets.mjs --city=fukuoka --dry-run   # 미리보기(기본)
 *   node scripts/strip-filler-bullets.mjs --city=fukuoka --apply     # 실제 반영
 *   node scripts/strip-filler-bullets.mjs --apply                    # 전 도시
 *
 * 되돌리기: --apply 전에 원본을 `tmp/filler-backup-<city>-<stamp>.json` 로 떨군다.
 *
 * ⚠️ 반영 후 공개 화면은 데이터 캐시(TTL 1h) 때문에 바로 안 바뀐다 —
 *    `/admin` 에서 아무 저장이나 한 번 하거나 1시간 기다릴 것 (docs/HANDOFF.md §5-3).
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요하다.");
  console.error("  set -a && source .env.local && set +a");
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const citySlug = args.find((a) => a.startsWith("--city="))?.slice("--city=".length) ?? null;

/**
 * 유형 라벨 — 수집 파이프라인이 쓰는 어휘. **`messages/ko.ts` 의 placeTypes 와 다르다**
 * (거긴 "맛집"인데 여기는 "식당."). 그래서 화면 어휘로 짐작하지 말고 DB 를 전수 조사해
 * 실제로 나온 것만 적었다 — 전 확정 장소 기준 식당 48 · 쇼핑·매장 11 · 명소·관광 5 ·
 * 숙소 5 · 바·술집 3 · 카페 1.
 *
 * ⚠️ **완전 일치로만 본다.** 길이나 접두사로 자르면 진짜 문장을 먹는다 —
 *    "카페."는 라벨이지만 "해변·카페 밀집 지역."은 내용이고, "식당."은 라벨이지만
 *    "모츠나베 런치 식당."·"부산 남포동 중국집."은 내용이다.
 */
const TYPE_LABELS = new Set([
  "식당.",
  "카페.",
  "바·술집.",
  "숙소.",
  "명소·관광.",
  "쇼핑·매장.",
  "상점.",
  "관광지.",
]);

/**
 * "{도시명} · {주소}" 줄.
 *
 * 처음엔 우편번호·`chōme`·`Ward` 토큰으로 알아보려 했는데 일본 주소에만 맞아서
 * "서울 · 서울특별시 중구 충무로 19-1 1층"이 남았다. 그다음엔 `address` 필드와
 * 앞부분 대조를 했는데 그것도 실패한다 — 불릿은 구글 표기("서울특별시 중구 … 1층"),
 * `address` 는 축약 표기("서울 중구 충무로 19-1")로 **서로 다른 문자열**이다.
 *
 * 남는 확실한 신호는 접두사뿐이다. 실제 문장은 "{도시명} · "로 시작하지 않는다
 * (전 확정 장소 58개가 전부 주소였다 — 전수 확인). 뒤가 너무 짧으면 제외한다.
 */
function isCityAddress(b, cityName) {
  if (!cityName) return false;
  const prefix = `${cityName} · `;
  return b.startsWith(prefix) && b.slice(prefix.length).trim().length >= 8;
}

/**
 * 출처 상투구 — 두 가지 표기가 섞여 있다. 마침표 유무까지 봐야 다 걸린다.
 *   "후쿠오카 아저씨 영상에서 소개."      (마침표 있음)
 *   "성시경 먹을텐데 도쿄 편에서 소개"     (없음)
 * 어느 쪽이든 출처 영상은 제목·타임코드와 함께 화면에 이미 있다.
 */
const SOURCE_BOILERPLATE = /(영상에서 소개|편에서 소개)\.?$/;

function isFiller(b, cityName) {
  const s = String(b).trim();
  return (
    TYPE_LABELS.has(s) ||
    SOURCE_BOILERPLATE.test(s) ||
    /^구글 지도에서 위치 확인\.$/.test(s) ||
    isCityAddress(s, cityName)
  );
}

/*
 * 지우지 않기로 한 것 — 상투구처럼 보이지만 정보가 있다:
 *
 * · "더보기란에 신사이바시 주소 표기" (21회/고유 14) — 지점을 구분해 주는 게 섞여 있고
 *   ("본관", "신점(New Branch)") 반복도 낮아 중복 신호가 아니다.
 * · "스시 전문점" · "에도마에 스시" · "프렌치 레스토랑" — 유형 칩("맛집")이 못 담는
 *   요리 종류다. 검색어가 되는 쪽은 오히려 이쪽이다.
 * · "도쿄 롯폰기" · "부산 수영구 광안동" — 동네. 주소 줄과 달리 사람이 검색하는 단위다.
 * · "구글 등록명: X." — 장소마다 다르고(중복 아님) `name` 과 다른 검색 별칭을 담는데
 *   담을 컬럼이 없다. `name_local` 은 **현지어** 자리라(`shared/i18n/display.ts:17`)
 *   한국어 별칭을 넣으면 EN 화면의 주 표기가 한국어가 된다.
 */

const sb = createClient(url, key);

const { data: cities, error: cityErr } = await sb.from("cities").select("id, slug, name");
if (cityErr) throw cityErr;

let cityId = null;
if (citySlug) {
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) {
    console.error(`도시 slug "${citySlug}" 를 찾지 못했다.`);
    process.exit(1);
  }
  cityId = city.id;
}

let q = sb
  .from("places")
  .select("id, name, slug, city_id, address, summary_bullets, summary_bullets_en")
  .eq("map_status", "confirmed");
if (cityId) q = q.eq("city_id", cityId);
const { data: places, error } = await q;
if (error) throw error;

const cityNameById = new Map(cities.map((c) => [c.id, c.name]));

const changes = [];
for (const p of places) {
  const city = cityNameById.get(p.city_id);
  const keep = (b) => !isFiller(b, city);
  const before = p.summary_bullets ?? [];
  const after = before.filter(keep);
  const beforeEn = p.summary_bullets_en ?? [];
  const afterEn = beforeEn.filter(keep);
  if (after.length === before.length && afterEn.length === beforeEn.length) continue;
  changes.push({ id: p.id, name: p.name, before, after, beforeEn, afterEn });
}

const removed = changes.reduce((n, c) => n + (c.before.length - c.after.length), 0);
const removedEn = changes.reduce((n, c) => n + (c.beforeEn.length - c.afterEn.length), 0);
const emptied = changes.filter((c) => c.after.length === 0).length;

console.log(`대상 장소(확정)      : ${places.length}${citySlug ? ` · ${citySlug}` : " · 전 도시"}`);
console.log(`바뀌는 장소          : ${changes.length}`);
console.log(`지워지는 불릿(ko/en) : ${removed} / ${removedEn}`);
console.log(`불릿이 비는 장소     : ${emptied}`);

if (!apply) {
  console.log("\n--- 미리보기 (앞 5곳) ---");
  for (const c of changes.slice(0, 5)) {
    console.log(`\n· ${c.name}`);
    for (const b of c.before) console.log(`   ${c.after.includes(b) ? "유지" : "삭제"}  ${b}`);
  }
  console.log("\n실제로 반영하려면 --apply 를 붙여라.");
  process.exit(0);
}

mkdirSync("tmp", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = `tmp/filler-backup-${citySlug ?? "all"}-${stamp}.json`;
writeFileSync(backup, JSON.stringify(changes, null, 2));
console.log(`\n백업: ${backup}`);

let ok = 0;
for (const c of changes) {
  const { error: upErr } = await sb
    .from("places")
    .update({ summary_bullets: c.after, summary_bullets_en: c.afterEn })
    .eq("id", c.id);
  if (upErr) {
    console.error(`실패 ${c.name}:`, upErr.message);
    continue;
  }
  ok++;
}
console.log(`반영 완료: ${ok}/${changes.length}`);
console.log("⚠️ 공개 화면은 데이터 캐시(TTL 1h) — /admin 에서 저장 한 번 하거나 기다릴 것.");
