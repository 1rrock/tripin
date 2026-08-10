/**
 * 인제스트 스크립트 공용 — .env.local 로드.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

/** @returns {Record<string, string>} */
export function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {
    // .env.local 없음 — process.env 만 사용
  }
  return { ...env, ...process.env };
}

export function requireEnv(keys) {
  const env = loadEnv();
  const missing = keys.filter((k) => !env[k]);
  if (missing.length) {
    console.error(`✖ .env.local 에 없습니다: ${missing.join(", ")}`);
    process.exit(1);
  }
  return env;
}

export { ROOT };
