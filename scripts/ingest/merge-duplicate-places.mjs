#!/usr/bin/env node
/**
 * 같은 가게가 여러 행으로 들어간 것을 하나로 합친다.
 *
 * 사용:
 *   node scripts/ingest/merge-duplicate-places.mjs           무엇이 합쳐질지만 본다
 *   node scripts/ingest/merge-duplicate-places.mjs --apply   실제로 합친다
 *
 * 왜 이게 있나 — 한 영상 더보기란에 같은 가게 링크가 두 번 있거나, 여러 영상이 같은
 * 가게를 가리키면 인제스트가 행을 따로 만든다. 그러면 지도에 핀이 둘 뜨고 목록에도
 * 두 번 나온다. 실측 1737행 중 155행이 그런 잉여였다.
 *
 * ⚠️ **그냥 지우면 안 된다.** places 에 매달린 세 테이블이 전부 `on delete cascade` 다:
 *      video_places       출처 영상 연결 — 이게 사라지면 "어느 영상에 나왔는지"를 잃는다
 *      saved_places       유저 하트·방문
 *      saved_list_places  유저 목록
 *    그래서 자식들을 남길 행으로 **옮긴 뒤에** 지운다.
 *
 * ⚠️ **이름이 다르면 합치지 않는다.** 같은 google_place_id 라도 이름이 서로 다르면
 *    중복이 아니라 place_id 가 잘못 붙은 것일 수 있다 — "키수이마루"와 "메이쿄시스이
 *    하카타점"이 한 ID 를 공유하고 있었다. 합치면 서로 다른 가게가 하나로 사라진다.
 *    한쪽이 다른 쪽을 품는 관계(지점 접미·음차 병기)까지만 같은 가게로 본다.
 *
 * ⛔ 로컬(어드민) 전용. 지운 행의 slug 로 들어오던 주소는 404 가 된다 — 색인된 지 오래된
 *    장소를 지울 때는 리다이렉트를 따로 생각해야 한다.
 */
import { requireEnv } from "./_lib/env.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");

const env = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

/** PostgREST 는 한 번에 1000행까지만 준다. */
async function all(path) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await (await fetch(`${URL_}/rest/v1/${path}&limit=1000&offset=${offset}`, { headers: H })).json();
    if (!Array.isArray(page)) throw new Error(`조회 실패: ${JSON.stringify(page)}`);
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

const norm = (s) =>
  (s ?? "").normalize("NFKC").replace(/[\s·・,.'"’”\-–—/|()（）[\]]/g, "").toLowerCase();

/** 한쪽이 다른 쪽을 품으면 같은 가게로 본다 — "마막" ⊂ "Mamak Haymarket" 은 여기서 안 걸린다(문자가 다름). */
function sameish(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 3 && long.includes(short);
}

/** 남길 행 — 공개·확정·네이버ID·요약·출처영상이 많은 쪽. 같으면 먼저 만들어진 쪽. */
function score(p, videoCount) {
  return (
    (p.is_published ? 100 : 0) +
    (p.map_status === "confirmed" ? 50 : 0) +
    (p.naver_place_id ? 30 : 0) +
    (p.address ? 10 : 0) +
    ((p.summary_bullets?.length ?? 0) > 0 ? 10 : 0) +
    videoCount * 5
  );
}

async function patch(table, filter, body) {
  const res = await fetch(`${URL_}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  return res.ok ? null : `${res.status} ${await res.text()}`;
}
async function del(table, filter) {
  const res = await fetch(`${URL_}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: { ...H, Prefer: "return=minimal" },
  });
  return res.ok ? null : `${res.status} ${await res.text()}`;
}

// ── 모으기 ────────────────────────────────────────────────────────────────
const places = await all(
  "places?select=id,name,address,google_place_id,naver_place_id,map_status,is_published,summary_bullets,created_at" +
    "&google_place_id=not.is.null&order=google_place_id",
);
const videoLinks = await all("video_places?select=video_id,place_id");
const saves = await all("saved_places?select=user_id,place_id");
const listItems = await all("saved_list_places?select=list_id,place_id");

const vpBy = {}, spBy = {}, slpBy = {};
for (const r of videoLinks) (vpBy[r.place_id] ??= []).push(r.video_id);
for (const r of saves) (spBy[r.place_id] ??= []).push(r.user_id);
for (const r of listItems) (slpBy[r.place_id] ??= []).push(r.list_id);

const groups = {};
for (const p of places) (groups[p.google_place_id] ??= []).push(p);

const mergeable = [];
const skipped = [];
for (const [pid, rows] of Object.entries(groups)) {
  if (rows.length < 2) continue;
  let alike = true;
  for (let i = 0; i < rows.length && alike; i++)
    for (let j = i + 1; j < rows.length && alike; j++) if (!sameish(rows[i].name, rows[j].name)) alike = false;
  (alike ? mergeable : skipped).push([pid, rows]);
}

console.log(
  `중복 그룹 ${mergeable.length + skipped.length}개 · 합칠 그룹 ${mergeable.length}개 · ` +
    `이름이 달라 건너뛴 그룹 ${skipped.length}개${APPLY ? "" : " (미리보기)"}`,
);

let deleted = 0, movedVideos = 0, movedSaves = 0, movedLists = 0, failed = 0;
for (const [, rows] of mergeable) {
  const ranked = [...rows].sort(
    (a, b) => score(b, (vpBy[b.id] ?? []).length) - score(a, (vpBy[a.id] ?? []).length) || a.created_at.localeCompare(b.created_at),
  );
  const keep = ranked[0];
  const drop = ranked.slice(1);
  const keepVideos = new Set(vpBy[keep.id] ?? []);
  const keepUsers = new Set(spBy[keep.id] ?? []);
  const keepLists = new Set(slpBy[keep.id] ?? []);

  console.log(`  ${APPLY ? "✔" : "→"} 남김 "${keep.name}" ← ${drop.map((d) => `"${d.name}"`).join(", ")}`);

  for (const d of drop) {
    /* 자식을 먼저 옮긴다. 남길 행이 이미 가진 (영상/유저/목록) 은 옮기지 않는다 —
       기본키가 겹쳐 실패한다. 그건 어차피 같은 연결이라 잃는 게 없다. */
    for (const vid of vpBy[d.id] ?? []) {
      if (keepVideos.has(vid)) continue;
      if (APPLY) {
        const err = await patch("video_places", `place_id=eq.${d.id}&video_id=eq.${vid}`, { place_id: keep.id });
        if (err) { console.log(`       ✖ 영상 연결 이동 실패(${vid}): ${err}`); failed++; continue; }
      }
      keepVideos.add(vid);
      movedVideos++;
    }
    for (const uid of spBy[d.id] ?? []) {
      if (keepUsers.has(uid)) continue;
      if (APPLY) {
        const err = await patch("saved_places", `place_id=eq.${d.id}&user_id=eq.${uid}`, { place_id: keep.id });
        if (err) { console.log(`       ✖ 저장 이동 실패: ${err}`); failed++; continue; }
      }
      keepUsers.add(uid);
      movedSaves++;
    }
    for (const lid of slpBy[d.id] ?? []) {
      if (keepLists.has(lid)) continue;
      if (APPLY) {
        const err = await patch("saved_list_places", `place_id=eq.${d.id}&list_id=eq.${lid}`, { place_id: keep.id });
        if (err) { console.log(`       ✖ 목록 이동 실패: ${err}`); failed++; continue; }
      }
      keepLists.add(lid);
      movedLists++;
    }

    if (APPLY) {
      const err = await del("places", `id=eq.${d.id}`);
      if (err) { console.log(`       ✖ 삭제 실패 "${d.name}": ${err}`); failed++; continue; }
    }
    deleted++;
  }
}

if (skipped.length) {
  console.log(`\n건너뛴 ${skipped.length}개 그룹 — 같은 구글 ID 인데 이름이 다르다. place_id 오배정일 수 있어 사람이 봐야 한다:`);
  for (const [pid, rows] of skipped) {
    console.log(`  ${pid}`);
    for (const r of rows) console.log(`      "${r.name}" [${r.map_status}${r.is_published ? "" : "·비공개"}] ${r.address ?? "(주소 없음)"}`);
  }
}

console.log(
  `\n${APPLY ? "합침" : "합칠 예정"} — 지운 행 ${deleted} · 옮긴 영상연결 ${movedVideos} · 저장 ${movedSaves} · 목록 ${movedLists}` +
    (failed ? ` · 실패 ${failed}` : "") +
    (APPLY ? " — 공개 화면 반영은 캐시 만료(1시간) 후" : " · 실제로 쓰려면 --apply"),
);
