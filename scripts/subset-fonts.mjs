#!/usr/bin/env node
/**
 * Paperlogy 를 **실제로 쓰는 글리프**만 남긴 조각으로 자른다.
 *
 *   npm run fonts:subset
 *
 * 왜: 원본은 한글 음절 11,172자를 전부 담아 단당 157KB 다. 그런데 이 사이트가
 * 실제로 그리는 음절은 DB 콘텐츠 + UI 문구를 다 합쳐도 1,200자 안팎 — 10% 다.
 * 나머지 90% 는 한 번도 화면에 안 나오는데 매번 내려간다. `preload: false` 라
 * LCP 를 막지는 않지만, 스왑이 늦어지는 만큼 폴백 글꼴이 오래 보인다.
 *
 * 자르는 방식 — 잘라낸 글자를 **버리지 않는다**:
 *   core   : 코퍼스에 실제로 등장한 음절 + 라틴 + 자모 + 문장부호   (~65KB/단)
 *   ext0-3 : 나머지 음절 전부를 코드포인트 순으로 4등분          (~22-30KB/단)
 *
 * 브라우저는 글자가 앞 패밀리에 없으면 다음 패밀리로 넘어간다. 그래서 유저가
 * 저장 목록 이름에 희귀 음절을 치거나, 새 인제스트로 못 보던 상호가 들어와도
 * ext 조각이 그때 받아져 글자가 깨지지 않는다. **부분 서브셋의 흔한 사고
 * ("두부" 네모)가 이 구조에선 안 난다** — 커버리지는 원본과 동일하다.
 *
 * ⚠️ 코퍼스가 커져도 **다시 돌릴 필요는 없다**(ext 가 받아준다). 다시 돌리는 건
 *    core 히트율을 올리고 싶을 때뿐이다. 산출물은 커밋한다 — 빌드 때 파이썬을
 *    요구하지 않으려고.
 *
 * 필요: pyftsubset (`pip install fonttools brotli`), 그리고 코퍼스를 DB 에서
 * 뽑으려면 .env.local 의 SUPABASE_DB_URL + psql. DB 없이 돌리면 소스 트리
 * 문구만으로 core 를 만든다(그래도 ext 가 있어 깨지진 않는다).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC_DIR = join(ROOT, "src", "app", "fonts");
const OUT_DIR = join(SRC_DIR, "subset");

/** 자를 단. `fonts.ts` 가 싣는 5단과 같아야 한다. */
const WEIGHTS = [
  { file: "Paperlogy-4Regular.woff2", weight: "400" },
  { file: "Paperlogy-5Medium.woff2", weight: "500" },
  { file: "Paperlogy-6SemiBold.woff2", weight: "600" },
  { file: "Paperlogy-7Bold.woff2", weight: "700" },
  { file: "Paperlogy-9Black.woff2", weight: "900" },
];

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/**
 * core 에 무조건 넣는 것 — 원본이 가진 **비한글 글리프 전부**(551자).
 *
 * 처음엔 "쓸 만한 것"만 손으로 골랐다(라틴 기본·자모·따옴표 몇 개). 그러다
 * `Đà Nẵng` 의 `ẵ`(U+1EB5)와 하이픈류(U+2010·U+2012)가 통째로 빠진 걸 검증에서
 * 잡았다 — 원본엔 있는데 조각엔 없으니 **원본보다 나빠지는** 유일한 경로였다.
 * 골라내지 말고 전부 싣는다. 551자는 다 합쳐도 몇 KB 라 아낄 값이 아니다.
 *
 * fontTools 없이 파이썬을 또 부르지 않으려고 pyftsubset 에 `--unicodes` 로
 * 넘길 목록을 폰트에서 직접 읽는다.
 */
function nonHangulFromFont(fontPath) {
  const out = execFileSync(
    "python3",
    [
      "-c",
      "import sys;from fontTools.ttLib import TTFont;" +
        "print(' '.join(str(c) for c in sorted(TTFont(sys.argv[1]).getBestCmap()) " +
        "if not (0xAC00<=c<=0xD7A3)))",
      fontPath,
    ],
    { encoding: "utf8" },
  );
  return out.trim().split(/\s+/).filter(Boolean).map(Number);
}

/** 소스 트리의 한글 — UI 문구는 첫 화면에 반드시 뜨므로 core 에 들어가야 한다. */
function hangulFromSource() {
  const found = new Set();
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "node_modules" && e.name !== "fonts") walk(p);
      } else if (/\.(ts|tsx|css|json)$/.test(e.name)) {
        for (const ch of readFileSync(p, "utf8")) {
          const c = ch.codePointAt(0);
          if (c >= HANGUL_START && c <= HANGUL_END) found.add(ch);
        }
      }
    }
  };
  walk(join(ROOT, "src"));
  return found;
}

/**
 * DB 콘텐츠의 한글. psql 직결 — `db-run.mjs` 와 같은 이유로 supabase CLI 를 안 쓴다.
 * 실패해도 죽지 않는다: core 가 좁아질 뿐 ext 가 받아주므로 글자는 안 깨진다.
 */
function hangulFromDb() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return { chars: new Set(), note: ".env.local 없음" };
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  if (!env.SUPABASE_DB_URL) return { chars: new Set(), note: "SUPABASE_DB_URL 없음" };

  /* 사람이 읽는 텍스트 컬럼만. slug·url·id 계열은 한글이 있어도 화면에 안 뜨거나
     뜨더라도 name 과 같은 글자라 core 를 넓히지 않는다. */
  const sql = `
    select coalesce(name,'')||' '||coalesce(name_local,'')||' '||coalesce(address,'')||' '||
           coalesce(summary,'')||' '||coalesce(tips,'')||' '||coalesce(price_hint,'') from places
    union all select coalesce(name,'')||' '||coalesce(name_local,'') from cities
    union all select coalesce(display_name,'')||' '||coalesce(bio,'')||' '||coalesce(celebrity_name,'') from creators
    union all select coalesce(intro_text,'') from creator_cities
    union all select coalesce(person_name,'') from place_celebrity_mentions
    union all select coalesce(mention_note,'') from video_places
    union all select coalesce(title,'') from videos where title is not null
    union all select coalesce(name,'') from saved_lists;
  `;
  let out;
  try {
    out = execFileSync("psql", [env.SUPABASE_DB_URL, "-tA", "-c", sql], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    return { chars: new Set(), note: `psql 실패: ${String(e.message).split("\n")[0]}` };
  }
  const chars = new Set();
  for (const ch of out) {
    const c = ch.codePointAt(0);
    if (c >= HANGUL_START && c <= HANGUL_END) chars.add(ch);
  }
  return { chars, note: `${chars.size}자` };
}

/**
 * 조각이 **덮는 구역**을 성글게 적는다 — 담은 글자를 정확히 나열하지 않는다.
 *
 * 정확히 나열하면 core 는 907구간(≈10KB)이 되고, 그게 단마다 반복돼 렌더를
 * 막는 CSS 가 50KB 불어난다. 폰트에서 아낀 것보다 CSS 로 더 쓰는 꼴이다.
 *
 * 성글게 적어도 안전한 이유: unicode-range 는 "이 파일을 받을지"만 정하고,
 * 받아 보니 글자가 없으면 브라우저는 **다음 패밀리로 넘어간다.** 그러니
 * core 가 한글 블록 전체를 덮는다고 적어도, core 에 없는 음절은 ext 로 흘러간다.
 * 대가는 라틴만 있는 화면도 core 를 받는다는 것 — 이 사이트에선 어차피 상호가
 * 한글이라 그런 화면이 없다.
 */
function coarseRange(codepoints, extra = []) {
  const sorted = [...new Set(codepoints)].sort((a, b) => a - b);
  const hex = (c) => c.toString(16).toUpperCase().padStart(4, "0");
  return [...extra, `U+${hex(sorted[0])}-${hex(sorted[sorted.length - 1])}`].join(",");
}

function run() {
  try {
    execFileSync("pyftsubset", ["--help"], { stdio: "ignore" });
  } catch {
    console.error("pyftsubset 이 없다. `pip install fonttools brotli` 후 다시 돌려라.");
    process.exit(1);
  }

  const src = hangulFromSource();
  const db = hangulFromDb();
  const used = new Set([...src, ...db.chars]);
  console.log(`소스 트리 한글 : ${src.size}자`);
  console.log(`DB 콘텐츠 한글 : ${db.note}`);
  console.log(`core 대상      : ${used.size}자 (전체 11,172 중 ${((used.size / 11172) * 100).toFixed(1)}%)`);

  const rest = [];
  for (let c = HANGUL_START; c <= HANGUL_END; c++) {
    if (!used.has(String.fromCodePoint(c))) rest.push(c);
  }

  /* ext 를 4등분한다. 코드포인트 순으로 나눠 각 조각의 unicode-range 가
     좁고 연속되게 — 희귀 음절 하나 때문에 조각 4개를 다 받는 일이 없도록. */
  const EXT_PARTS = 4;
  const step = Math.ceil(rest.length / EXT_PARTS);
  const nonHangul = nonHangulFromFont(join(SRC_DIR, WEIGHTS[0].file));
  console.log(`비한글 글리프  : ${nonHangul.length}자 (전부 core 로 — 골라내면 원본보다 나빠진다)`);
  const chunks = [
    { name: "core", codepoints: [...used].map((c) => c.codePointAt(0)).concat(nonHangul) },
  ];
  for (let i = 0; i < EXT_PARTS; i++) {
    const part = rest.slice(i * step, (i + 1) * step);
    if (part.length) chunks.push({ name: `ext${i}`, codepoints: part });
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const tmp = join(tmpdir(), `paperlogy-subset-${process.pid}`);
  mkdirSync(tmp, { recursive: true });

  const manifest = [];
  let total = 0;
  for (const chunk of chunks) {
    const textFile = join(tmp, `${chunk.name}.txt`);
    writeFileSync(textFile, chunk.codepoints.map((c) => String.fromCodePoint(c)).join(""), "utf8");
    /* core 는 원본의 비한글을 전부 갖고 있으므로 구역도 그만큼 넓게 적는다.
       U+3008-33DD 는 가나(U+3040-30FF)까지 삼키는데, core 엔 가나가 없으니
       일본어 상호는 지금처럼 시스템 글꼴로 흘러간다 — 원본도 가나가 없었다.
       ext 는 한글 블록 안의 연속 조각이라 시작-끝 하나로 충분하다. */
    const range =
      chunk.name === "core"
        ? "U+0020-2FFF,U+3008-33DD,U+AC00-D7A3,U+1F10B-1F10C"
        : coarseRange(chunk.codepoints);
    const files = [];
    for (const w of WEIGHTS) {
      const outName = `Paperlogy-${w.weight}-${chunk.name}.woff2`;
      const outPath = join(OUT_DIR, outName);
      execFileSync("pyftsubset", [
        join(SRC_DIR, w.file),
        `--text-file=${textFile}`,
        "--flavor=woff2",
        "--layout-features=*",
        "--no-hinting",
        "--desubroutinize",
        `--output-file=${outPath}`,
      ], { stdio: ["ignore", "ignore", "pipe"] });
      const kb = statSync(outPath).size / 1024;
      total += kb;
      files.push({ weight: w.weight, file: outName, kb: Number(kb.toFixed(1)) });
    }
    manifest.push({ name: chunk.name, glyphs: chunk.codepoints.length, unicodeRange: range, files });
    console.log(
      `  ${chunk.name.padEnd(5)} ${String(chunk.codepoints.length).padStart(6)}자  ` +
        `${files.map((f) => f.kb.toFixed(0) + "K").join(" ")}  (range ${range.split(",").length}구간)`,
    );
  }
  rmSync(tmp, { recursive: true, force: true });

  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`\n산출 ${OUT_DIR} — 총 ${total.toFixed(0)}KB (원본 5단 786KB)`);
  console.log(`한 페이지가 받는 양: core 만 = ${manifest[0].files.reduce((a, f) => a + f.kb, 0).toFixed(0)}KB (5단 전부일 때)`);
  console.log(`\nmanifest.json 의 unicodeRange 를 src/app/fonts.ts 에 반영해라.`);
}

run();
