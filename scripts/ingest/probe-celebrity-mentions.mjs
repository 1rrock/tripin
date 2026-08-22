#!/usr/bin/env node
/**
 * 연예인 언급 수율 프로브 — 장소가 연결된 영상의 제목+더보기란에서
 * "OO가 다녀간/단골/방문" 류 문구를 찾아 **후보 수를 실측**한다.
 *
 * 사용:
 *   node scripts/ingest/probe-celebrity-mentions.mjs                 # 전량(장소 연결 영상)
 *   node scripts/ingest/probe-celebrity-mentions.mjs --limit=20      # 스모크
 *   node scripts/ingest/probe-celebrity-mentions.mjs --out=report.md # 보고서 경로
 *   node scripts/ingest/probe-celebrity-mentions.mjs --offset=400 --limit=400
 *     ↑ 슬라이스 실행 — 1,000편 넘는 전량은 셸 타임아웃에 걸리므로 나눠 돌리고
 *       보고서를 이어 붙인다(정렬이 published_at,id 고정이라 슬라이스가 겹치지 않는다)
 *
 * 기본은 보고서만 쓴다. `--insert` 를 주면 **후보를 DB 에 적재**하되
 * 반드시 `is_published=false` 다 — 공개는 언제나 사람이 검수 후 올린다
 * (자동 확정 금지, supabase/migrations/0014_celebrity_mentions.sql 주석 참조).
 * 적재 조건도 보수적이다: 사전(KNOWN)에 있는 실명이 잡혔고, 영상에 연결된
 * 장소가 **정확히 1곳**일 때만 — 여러 곳이면 어느 장소 언급인지 기계가 모른다.
 * 나머지는 보고서에서 사람이 판단한다. 근거 문장은 source_note 로 남는다(0015).
 *
 * 왜 프로브가 먼저인가: 화면·훅을 만들기 전에 이 패턴이 실제 몇 건이나
 * 나오는지 세어야 한다(부산 자막 삽질의 교훈). 설명란은 DB 에 없으므로
 * InnerTube 로 읽는다 — 키 불필요, 쿼터 소모 없음.
 *
 * 2026-08-22 전량(1,094편) 실측: 후보 영상 7편(0.6%) — 대부분 제목 스캔과 겹쳤고
 * 더보기란 단독 신규는 사실상 없었다. 재실행은 새 영상 인제스트 뒤에만 의미 있다.
 */
import { requireEnv } from "./_lib/env.mjs";
import { fetchVideoItems } from "./_lib/youtube.mjs";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? null;
const LIMIT = opt("limit") === null ? Infinity : Math.max(1, Number(opt("limit")));
const OFFSET = Math.max(0, Number(opt("offset") ?? 0));
const OUT = opt("out") ?? "data/celebrity-mention-probe.md";
const INSERT = args.includes("--insert");

const env = requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const H = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};

/** 방문 동사 — 이 중 하나가 줄에 있어야 후보다. "감탄하고 간"류 변형 포함(1차 실측서 누락 교훈) */
const VISIT =
  /(다녀간|다녀온|다녀갔|방문한|방문했|왔다\s*간|왔던|들렀던|단골|오신|간\s?곳|갔던\s?곳|갔다\s?온|감탄하고 간|먹고 간|찾은 집|찾았던)/;
/**
 * 인물 신호 — 방문 동사만으로는 "동네 단골" 같은 잡음이 너무 많다.
 * 알려진 이름 사전 + 호칭·직함 마커 중 하나가 같은 줄에 있어야 통과.
 * 사전은 지금까지 실측에서 본 이름들 — 새 이름은 보고서 검수 때 늘린다.
 */
const KNOWN =
  /(성시경|백종원|신동엽|추성훈|이영자|차승원|최강록|강레오|이보영|안성재|이연복|유재석|강호동|아이유|화사|덱스|기안84|풍자|쯔양|히밥|전현무|박나래|이서진|류수영|김수미|홍석천|이대호|임지연|지드래곤|김희철|김종국|이경규|탁재훈)/;
const MARKER = /(연예인|셀럽|유명인|스타|배우|가수|셰프|개그맨|방송인|부부가|님도|씨도)/;

async function linkedVideos() {
  // 장소가 연결된 영상만 — 언급을 승인해도 카드가 링크할 장소가 있어야 한다.
  // ⚠️ id 를 2차 정렬로 — published_at 동점·null 에서 순서가 흔들리면
  //    슬라이스(--offset) 실행이 영상을 빠뜨리거나 중복 조사한다(1차 실측서 실제 발생).
  const q =
    "videos?select=id,youtube_video_id,title,creators(slug),video_places!inner(place_id)" +
    "&order=published_at.desc.nullslast,id.asc";
  const res = await fetch(`${URL_}/rest/v1/${q}`, {
    headers: { ...H, Range: "0-1999", Prefer: "count=exact" },
  });
  if (!res.ok) throw new Error(`videos 조회 실패 ${res.status}`);
  return res.json();
}

function scan(text) {
  const hits = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || !VISIT.test(line)) continue;
    const known = line.match(KNOWN)?.[1] ?? null;
    if (!known && !MARKER.test(line)) continue;
    hits.push({ line: line.slice(0, 160), known });
  }
  return hits;
}

const rows = (await linkedVideos()).slice(OFFSET, OFFSET + LIMIT);
console.log(`대상 영상 ${rows.length}편 (장소 연결분). InnerTube 로 더보기란을 읽는다…`);

const found = [];
let done = 0;
const items = await fetchVideoItems(
  rows.map((r) => r.youtube_video_id),
  {
    onItem: () => {
      done += 1;
      if (done % 50 === 0) console.log(`  … ${done}/${rows.length}`);
    },
  },
);
const byYt = new Map(items.map((it) => [it.id, it]));
for (const r of rows) {
  const it = byYt.get(r.youtube_video_id);
  if (!it) continue;
  const hits = scan(`${it.snippet.title}\n${it.snippet.description}`);
  if (hits.length === 0) continue;
  found.push({
    channel: r.creators?.slug ?? "?",
    videoId: r.id,
    youtubeId: r.youtube_video_id,
    title: it.snippet.title,
    places: r.video_places.length,
    placeId: r.video_places.length === 1 ? r.video_places[0].place_id : null,
    hits,
  });
}

if (INSERT) {
  // 실명 + 단일 장소만 — 그 외에는 기계가 place 를 특정할 수 없다
  const rowsToInsert = found.flatMap((f) =>
    f.placeId
      ? f.hits
          .filter((h) => h.known)
          .map((h) => ({
            place_id: f.placeId,
            person_name: h.known,
            source_video_id: f.videoId,
            source_note: h.line,
            is_published: false,
          }))
      : [],
  );
  if (rowsToInsert.length > 0) {
    const res = await fetch(
      `${URL_}/rest/v1/place_celebrity_mentions?on_conflict=place_id,person_name`,
      {
        method: "POST",
        headers: { ...H, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify(rowsToInsert),
      },
    );
    if (!res.ok) throw new Error(`후보 적재 실패 ${res.status}: ${await res.text()}`);
    console.log(`후보 ${rowsToInsert.length}행 적재 (is_published=false — 검수 대기)`);
  } else {
    console.log("적재 조건(실명+단일 장소)에 맞는 후보 없음");
  }
}

const byChannel = new Map();
for (const f of found) byChannel.set(f.channel, (byChannel.get(f.channel) ?? 0) + 1);

const lines = [
  "# 연예인 언급 프로브 — 제목+더보기란 실측",
  "",
  `조사: ${rows.length}편(장소 연결 영상) · 후보 영상: ${found.length}편`,
  "채널별: " + [...byChannel.entries()].map(([c, n]) => `${c} ${n}`).join(" · "),
  "",
  "⚠️ 기계 선별 후보다 — 시드 전 반드시 사람이 판정한다.",
  "",
];
for (const f of found) {
  lines.push(`## ${f.channel} · ${f.title}`);
  lines.push(`https://youtu.be/${f.youtubeId} (연결 장소 ${f.places})`);
  for (const h of f.hits) lines.push(`- ${h.known ? `**${h.known}**` : "(이름 미상)"} — ${h.line}`);
  lines.push("");
}
writeFileSync(OUT, lines.join("\n"));
console.log(`\n후보 영상 ${found.length}편 → ${OUT}`);
