#!/usr/bin/env node
/**
 * SQL 파일을 SUPABASE_DB_URL(.env.local)로 psql 실행 — 마이그레이션 적용용.
 *
 *   npm run db:run -- supabase/migrations/0001_init.sql
 *   npm run db:migrate                                    (미적용 마이그레이션 전부)
 *
 * SUPABASE_DB_URL 은 Supabase 대시보드 → Settings → Database →
 *   Connection string → "Session pooler" URI (비밀번호 채워서) 를 .env.local 에 넣는다.
 *
 * ⚠️ supabase CLI 를 쓰지 않는 이유:
 *    CLI 는 머신당 하나의 계정으로만 로그인된다. 이 머신은 히든스팟 계정으로 로그인돼 있고
 *    Tripin 은 별도 계정이라 `supabase link` 가 안 된다. psql 직결이면 계정 전환이 필요 없다.
 *
 * 적용 이력은 _migrations 테이블에 남는다 — 같은 파일을 두 번 돌리지 않는다.
 *
 * ⚠️ 이력에 남는 건 `supabase/migrations/` **안**의 파일뿐이다. 임시 SQL 을 이 도구로
 *    돌려도 이력을 더럽히지 않는다. 키는 리포 기준 상대경로다(예전엔 basename 이라
 *    `q.sql` 같은 임시 파일이 26건 쌓였고, 같은 이름의 정식 마이그레이션이 조용히
 *    스킵됐다). 그 오염 행을 지우는 SQL 은 `scripts/clean-migration-ledger.sql`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, relative, resolve, sep } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnvLocal();
const dbUrl = process.env["SUPABASE_DB_URL"] || env["SUPABASE_DB_URL"];

if (!dbUrl) {
  console.error(
    "\n✖ SUPABASE_DB_URL 이 .env.local 에 없습니다.\n\n" +
      "  Supabase 대시보드 → Settings → Database → Connection string\n" +
      "  → 'Session pooler' 탭의 URI 를 복사하고 [YOUR-PASSWORD] 를 실제 비밀번호로 바꿔\n" +
      "  .env.local 의 SUPABASE_DB_URL 에 넣으세요.\n\n" +
      "  형식: postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres\n",
  );
  process.exit(1);
}

/**
 * 접속 정보를 URL 인자 대신 PGPASSWORD 환경변수 + 개별 플래그로 넘긴다.
 *
 * ⚠️ psql 에 접속 URL 을 argv 로 주면 비밀번호가
 *    (1) `ps` 프로세스 목록과 (2) execFileSync 실패 시 에러 메시지에 그대로 노출된다.
 *    실제로 한 번 로그에 찍혀서 이 방식으로 바꿨다.
 */
const conn = (() => {
  let u;
  try {
    u = new URL(dbUrl);
  } catch {
    console.error("✖ SUPABASE_DB_URL 형식이 올바르지 않습니다.");
    process.exit(1);
  }
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "") || "postgres",
  };
})();

const PSQL_BASE = [
  "-h", conn.host,
  "-p", conn.port,
  "-U", conn.user,
  "-d", conn.database,
  "-v", "ON_ERROR_STOP=1",
];

const PSQL_ENV = { ...process.env, PGPASSWORD: conn.password };

/** 실패 시 접속 정보가 새지 않도록 에러를 직접 처리한다. */
function run(args, opts = {}) {
  try {
    return execFileSync("psql", [...PSQL_BASE, ...args], {
      stdio: opts.inherit ? "inherit" : ["ignore", "pipe", "inherit"],
      encoding: "utf8",
      env: PSQL_ENV,
    });
  } catch (err) {
    // err.message 에는 argv 가 통째로 들어간다 — 절대 그대로 출력하지 않는다.
    console.error(`\n✖ psql 실행 실패 (exit ${err.status ?? "?"})`);
    console.error(`  대상: ${conn.user}@${conn.host}:${conn.port}/${conn.database}`);
    if (err.status === 2) {
      console.error(
        "\n  인증 실패라면 DB 비밀번호를 확인하세요.\n" +
          "  대시보드 → Settings → Database → Reset database password 로 재발급 후\n" +
          "  .env.local 의 SUPABASE_DB_URL 비밀번호 부분을 교체하면 됩니다.\n" +
          "  ⚠️ 비밀번호에 @ : / ? # 가 있으면 URL 인코딩 필요 (@ → %40).\n",
      );
    }
    process.exit(1);
  }
}

function psql(args) {
  return run(args);
}

/** 적용 이력 테이블 — 없으면 만든다. */
function ensureLedger() {
  psql([
    "-q",
    "-c",
    "create table if not exists _migrations (" +
      "name text primary key, applied_at timestamptz not null default now())",
  ]);
}

function appliedSet() {
  const out = psql(["-tAq", "-c", "select name from _migrations"]);
  return new Set(
    out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * 이력에 남길 키 — `supabase/migrations/` **안**의 파일만, 그것도 **상대경로**로.
 *
 * ⚠️ 예전엔 아무 파일이나 basename 으로 넣었다. 그래서 `q.sql`·`check.sql` 같은
 *    임시 파일 26건이 이력을 채웠고(실측 44행 중 26행), 나중에 같은 basename 의
 *    정식 마이그레이션이 들어오면 "이미 적용됨"으로 **조용히 스킵**됐다.
 *    임시 SQL 은 이력에 남길 대상이 아니고, 키가 basename 이면 서로 다른 디렉터리의
 *    같은 이름이 충돌한다.
 * 정리용 SQL 은 `scripts/clean-migration-ledger.sql` 에 있다 — 사람이 직접 돌린다.
 */
function ledgerKey(file) {
  const abs = resolve(file);
  const rel = relative(MIGRATIONS_DIR, abs);
  if (!rel || rel.startsWith("..") || rel.includes(sep)) return null; // 디렉터리 밖 = 이력 대상 아님
  return relative(ROOT, abs).split(sep).join("/");
}

function apply(file) {
  const label = basename(file);
  const key = ledgerKey(file);
  console.log(`\n▶ ${label}`);
  run(["-f", file], { inherit: true });
  if (key) {
    /* 값을 SQL 문자열에 보간하지 않는다 — psql 변수로 넘기고 `:'v'` 로 인용시킨다.
       파일명에 따옴표가 들어가면 보간은 그대로 깨진다(그리고 그 자리는 SQL 이다). */
    psql([
      "-q",
      "-v", `mname=${key}`,
      "-c", "insert into _migrations(name) values (:'mname') on conflict do nothing",
    ]);
  } else {
    console.log("  (supabase/migrations 밖의 파일이라 적용 이력에 남기지 않습니다)");
  }
  console.log(`✔ ${label} 적용 완료`);
}

const args = process.argv.slice(2);
ensureLedger();

if (args.length > 0) {
  // 명시된 파일만 적용 (이력 무시 — 재실행용)
  for (const file of args) {
    if (!existsSync(file)) {
      console.error(`파일 없음: ${file}`);
      process.exit(1);
    }
    apply(file);
  }
} else {
  // 미적용 마이그레이션 전부 순서대로
  const done = appliedSet();
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    // 키를 상대경로로 바꾸기 전 이력은 basename 으로 들어 있다 — 둘 다 적용된 것으로 본다.
    // (안 그러면 이미 적용된 마이그레이션이 전부 다시 돌아간다)
    .filter((f) => !done.has(ledgerKey(join(MIGRATIONS_DIR, f))) && !done.has(f));

  if (pending.length === 0) {
    console.log("✔ 적용할 마이그레이션이 없습니다. (최신 상태)");
    process.exit(0);
  }
  console.log(`${pending.length}개 마이그레이션 적용:`);
  for (const f of pending) apply(join(MIGRATIONS_DIR, f));
}

console.log("\n완료.\n");
