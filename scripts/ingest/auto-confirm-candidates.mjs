#!/usr/bin/env node
/**
 * 후보(candidate) 중 구글 지도·좌표·근거가 있는 곳을:
 *   1) Places API 로 place_id·주소·업종·영업상태 보강
 *   2) CONCEPT 7.3 스타일 요약 불릿 생성 (사실만, 금지어 없음)
 *   3) map_status=confirmed 로 확정
 *      · OPERATIONAL / UNKNOWN → is_published=true
 *      · CLOSED_* / NOT_FOUND → is_published=false (확정은 하되 비공개)
 *
 * 사용:
 *   node scripts/ingest/auto-confirm-candidates.mjs           # 실행
 *   node scripts/ingest/auto-confirm-candidates.mjs --dry-run # 미리보기
 *   node scripts/ingest/auto-confirm-candidates.mjs --limit 5
 *
 * ⛔ 대사 인용·평가·별점 금지. 공개 요약은 자체 작성 사실 불릿만.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
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
const env = { ...loadEnvLocal(), ...process.env };
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : 0;
})();

for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GOOGLE_PLACES_API_KEY"]) {
  if (!env[k]) {
    console.error(`✖ ${k} 없음`);
    process.exit(1);
  }
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const KEY = env.GOOGLE_PLACES_API_KEY;
const PLACES_HEADERS = {
  "Content-Type": "application/json",
  "X-Goog-Api-Key": KEY,
  Referer: "https://eatripin.com",
};

const BANNED = ["진짜", "미쳤", "인생", "존맛", "대박", "JMT", "맛있", "맛없", "불친절", "별로"];

const TYPE_MAP = [
  [/sushi|ramen|restaurant|meal_takeaway|meal_delivery|food/i, "restaurant"],
  [/cafe|coffee|bakery/i, "cafe"],
  [/bar|night_club|pub/i, "bar"],
  [/lodging|hotel|resort|inn/i, "hotel"],
  [/supermarket|convenience|shopping|store|book_store|department/i, "shop"],
  [/tourist|museum|park|temple|shrine|zoo|aquarium|point_of_interest/i, "attraction"],
  [/fishing|fish_farm|marina|campground/i, "fishing"],
];

function mapPlaceType(types = [], primary) {
  const all = [primary, ...types].filter(Boolean).join(" ");
  for (const [re, t] of TYPE_MAP) if (re.test(all)) return t;
  return "unknown";
}

function typeLabel(t) {
  return (
    {
      restaurant: "식당",
      cafe: "카페",
      bar: "바·술집",
      hotel: "숙소",
      shop: "쇼핑·매장",
      attraction: "명소·관광",
      viewpoint: "전망",
      fishing: "낚시장소",
      other: "기타",
      unknown: "장소",
    }[t] || "장소"
  );
}

/** Places text search near known lat/lng */
async function enrichPlace(name, cityName, lat, lng) {
  const body = {
    textQuery: cityName ? `${name} ${cityName}` : name,
    languageCode: "ko",
    maxResultCount: 3,
  };
  if (lat != null && lng != null) {
    body.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius: 800.0 },
    };
  }
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      ...PLACES_HEADERS,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.businessStatus,places.primaryType",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Places ${res.status}: ${t.slice(0, 120)}`);
  }
  const j = await res.json();
  const places = j.places || [];
  if (!places.length) return null;

  // Prefer closest to our pin when we have coords
  let best = places[0];
  if (lat != null && lng != null) {
    let bestD = Infinity;
    for (const p of places) {
      const plat = p.location?.latitude;
      const plng = p.location?.longitude;
      if (plat == null) continue;
      const d = (plat - lat) ** 2 + (plng - lng) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    // if closest is > ~1.5km away, treat as unmatched
    if (bestD > 0.0002) {
      // ~1.5km rough in deg^2 at mid-lat
      // still accept if name strongly matches
      const gName = best.displayName?.text || "";
      const nameHit =
        gName.includes(name.slice(0, 4)) ||
        name.includes(gName.slice(0, 4)) ||
        gName.toLowerCase().includes(name.toLowerCase().slice(0, 6));
      if (!nameHit) return null;
    }
  }
  return {
    placeId: best.id?.startsWith("places/") ? best.id.slice(7) : best.id,
    googleName: best.displayName?.text || null,
    address: best.formattedAddress || null,
    businessStatus: best.businessStatus || "UNKNOWN",
    types: best.types || [],
    primaryType: best.primaryType || null,
    lat: best.location?.latitude ?? null,
    lng: best.location?.longitude ?? null,
  };
}

function shortAddress(addr) {
  if (!addr) return null;
  // drop country prefix noise
  return addr
    .replace(/^대한민국\s*/, "")
    .replace(/^日本[、,]\s*/, "")
    .replace(/일본\s*$/, "")
    .trim()
    .slice(0, 60);
}

/**
 * 구글 주소와 우리가 들고 있는 주소 중 더 구체적인 쪽.
 * Places 가 "대한민국 부산광역시" 처럼 번지 없는 값을 돌려줄 때가 있다 —
 * 그때 우리 주소(영상 설명란에서 받아 검증한 도로명)를 버리면 불릿이 무의미해진다.
 */
function pickAddress(googleAddr, ownAddr) {
  if (!googleAddr) return ownAddr;
  if (!ownAddr) return googleAddr;
  const hasNo = (a) => /\d/.test(a);
  if (hasNo(googleAddr) !== hasNo(ownAddr)) return hasNo(googleAddr) ? googleAddr : ownAddr;
  return googleAddr.length >= ownAddr.length ? googleAddr : ownAddr;
}

function buildBullets({ name, cityName, placeType, address, sourceNote, googleName, creatorHint }) {
  const bullets = [];
  bullets.push(`${typeLabel(placeType)}.`);
  if (cityName) {
    const area = shortAddress(address);
    bullets.push(area ? `${cityName} · ${area}` : `${cityName}.`);
  } else if (address) {
    bullets.push(shortAddress(address));
  }
  if (creatorHint) {
    bullets.push(`${creatorHint} 영상에서 소개.`);
  } else if (sourceNote?.includes("더보기")) {
    bullets.push("크리에이터 더보기란에 상호·지도 링크로 표기.");
  } else if (sourceNote?.includes("먹을텐데")) {
    bullets.push("성시경 먹을텐데 제목에 상호 표기.");
  } else {
    bullets.push("영상 출처로 확인된 장소.");
  }
  if (googleName && googleName !== name && !name.includes(googleName.slice(0, 6))) {
    bullets.push(`구글 등록명: ${googleName}.`);
  } else {
    bullets.push("구글 지도에서 위치 확인.");
  }
  // 3~5
  return bullets.filter(Boolean).slice(0, 5);
}

/**
 * 폴백 슬러그 구조.
 *
 * 상호가 한글·로마자 밖(태국어·일본어 등)이면 파서의 slugify 가 문자를 전부 지워
 * `place-{vid}` 로 폴백한다(parse-description.mjs). 파싱 시점엔 달리 쓸 이름이
 * 없지만, 확정 시점엔 구글 등록명(languageCode=ko → 대개 한글)이 손에 있다 —
 * 여기서 한 번 더 슬러그를 만들어 준다. 색인되기 전이 URL 을 고칠 제일 싼 때다.
 *
 * 접미사는 옛 폴백 슬러그에 박힌 videoId 앞 4자를 그대로 이어받는다 —
 * 파서의 `{base}-{vid4}` 규칙과 같은 모양이 된다.
 */
function rescueSlug(oldSlug, googleName) {
  if (!/^place-/.test(oldSlug || "") || !googleName) return null;
  const base = googleName
    .toLowerCase()
    .replace(/[^\w가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  if (!base) return null;
  const vid4 = oldSlug.replace(/^place-/, "").slice(0, 4);
  return `${base}-${vid4}`;
}

/**
 * 금지어 검사 — **상호는 검사에서 뺀다.**
 * "알래스카에서 온 연어가 맛있는 집" 처럼 간판에 금지어가 든 가게가 실제로 있고,
 * 불릿은 상호를 담을 수밖에 없다. 이 규칙은 평가 표현을 막자는 것이지
 * 등록된 상호를 막자는 게 아니다 (이것 때문에 그 가게가 계속 후보로 묶여 있었다).
 *
 * 구글 등록명은 우리 `name` 과 띄어쓰기가 다른 경우가 많아(`알래스카연어가 맛있는집`)
 * 따로 넘겨야 한다 — `name` 만 지워서는 안 걸러진다.
 */
function hasBanned(bullets, names = []) {
  const j = names
    .filter(Boolean)
    .reduce((t, n) => t.split(n).join(""), bullets.join(""));
  return BANNED.filter((w) => j.toUpperCase().includes(w.toUpperCase()));
}

async function main() {
  let q = db
    .from("places")
    .select(
      "id, name, name_local, slug, place_type, address, lat, lng, google_maps_url, google_place_id, source_note, summary, summary_bullets, map_status, is_published, city_id, cities(slug, name)",
    )
    .eq("map_status", "candidate")
    .not("lat", "is", null)
    .not("source_note", "is", null)
    .order("name");
  if (LIMIT) q = q.limit(LIMIT);
  const { data: places, error } = await q;
  if (error) throw error;

  // video → creator hints
  const ids = places.map((p) => p.id);
  const creatorByPlace = new Map();
  if (ids.length) {
    // chunk in
    for (let i = 0; i < ids.length; i += 80) {
      const chunk = ids.slice(i, i + 80);
      const { data: links } = await db
        .from("video_places")
        .select("place_id, videos(creators(display_name, slug))")
        .in("place_id", chunk);
      for (const l of links || []) {
        const dn = l.videos?.creators?.display_name;
        if (dn && !creatorByPlace.has(l.place_id)) creatorByPlace.set(l.place_id, dn);
      }
    }
  }

  console.log(
    `대상 ${places.length}곳${DRY ? " (dry-run)" : ""} · Places 보강 → 요약 → 확정\n`,
  );

  const report = {
    confirmedPublished: [],
    confirmedHidden: [],
    skipped: [],
    failed: [],
  };

  for (const [i, p] of places.entries()) {
    const label = `[${i + 1}/${places.length}] ${p.name}`;
    try {
      // skip garbage names
      if (/^(영업\s*시간|주소:)/.test(p.name) || /습니다|하세요|드립니다|바랍니다|가세요|만들어봤|기대해|편리합니다|만족은 했지만|여행 가시면/.test(p.name)) {
        report.skipped.push({ name: p.name, reason: "bad-name" });
        console.log(`  · skip bad-name ${p.name}`);
        continue;
      }

      let enriched = null;
      if (p.google_place_id) {
        // still fetch status
        const res = await fetch(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(p.google_place_id)}?languageCode=ko&regionCode=KR`,
          {
            headers: {
              ...PLACES_HEADERS,
              "X-Goog-FieldMask":
                "id,displayName,formattedAddress,types,businessStatus,primaryType,location",
            },
          },
        );
        if (res.ok) {
          const d = await res.json();
          enriched = {
            placeId: p.google_place_id,
            googleName: d.displayName?.text || null,
            address: d.formattedAddress || p.address,
            businessStatus: d.businessStatus || "UNKNOWN",
            types: d.types || [],
            primaryType: d.primaryType || null,
            lat: d.location?.latitude ?? p.lat,
            lng: d.location?.longitude ?? p.lng,
          };
        }
      }
      if (!enriched) {
        enriched = await enrichPlace(p.name, p.cities?.name, p.lat, p.lng);
      }

      const placeType =
        p.place_type && p.place_type !== "unknown"
          ? p.place_type
          : mapPlaceType(enriched?.types, enriched?.primaryType);

      const businessStatus = enriched?.businessStatus || "UNKNOWN";
      const closed =
        businessStatus === "CLOSED_PERMANENTLY" ||
        businessStatus === "CLOSED_TEMPORARILY" ||
        businessStatus === "NOT_FOUND";

      const bullets =
        p.summary_bullets?.length > 0
          ? p.summary_bullets
          : buildBullets({
              name: p.name,
              cityName: p.cities?.name,
              placeType,
              address: pickAddress(enriched?.address, p.address),
              sourceNote: p.source_note,
              googleName: enriched?.googleName,
              creatorHint: creatorByPlace.get(p.id) || null,
            });

      const banned = hasBanned(bullets, [p.name, p.name_local, enriched?.googleName]);
      if (banned.length) {
        report.skipped.push({ name: p.name, reason: `banned:${banned.join(",")}` });
        console.log(`  ⚠ skip banned ${p.name}`);
        continue;
      }

      const publish = !closed;
      const patch = {
        map_status: "confirmed",
        is_published: publish,
        place_type: placeType,
        summary_bullets: bullets,
        updated_at: new Date().toISOString(),
      };
      if (enriched?.placeId) patch.google_place_id = enriched.placeId;
      if (enriched?.address && !p.address) patch.address = enriched.address;
      else if (enriched?.address && (!p.address || p.address.length < 8))
        patch.address = enriched.address;

      // 폴백 슬러그면 구글 등록명으로 구조 — 충돌 시엔 그냥 폴백을 유지한다.
      const rescued = rescueSlug(p.slug, enriched?.googleName);
      if (rescued) {
        const { data: dup } = await db
          .from("places")
          .select("id")
          .eq("slug", rescued)
          .neq("id", p.id)
          .maybeSingle();
        if (!dup) patch.slug = rescued;
      }

      if (DRY) {
        console.log(
          `  · dry ${label} → ${publish ? "PUB" : "HIDE"} ${businessStatus} type=${placeType} bullets=${bullets.length} pid=${!!enriched?.placeId}`,
        );
        (publish ? report.confirmedPublished : report.confirmedHidden).push(p.name);
      } else {
        const { error: e } = await db.from("places").update(patch).eq("id", p.id);
        if (e) throw e;
        console.log(
          `  ✔ ${label} → ${publish ? "공개확정" : "비공개확정"} (${businessStatus}) [${placeType}]`,
        );
        (publish ? report.confirmedPublished : report.confirmedHidden).push({
          name: p.name,
          status: businessStatus,
          type: placeType,
        });
      }
    } catch (err) {
      report.failed.push({ name: p.name, reason: err.message });
      console.log(`  ✖ ${label} — ${err.message}`);
    }
    await sleep(130);
  }

  if (!DRY) {
    try {
      await db.rpc("recount_stats");
      console.log("\n통계 재계산 완료.");
    } catch (e) {
      console.log("\n⚠ recount_stats 실패:", e.message);
    }
  }

  const out = join(ROOT, "tmp-auto-confirm-report.json");
  writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), dry: DRY, report }, null, 2));
  console.log("\n── 집계 ──");
  console.log(`  공개 확정   ${report.confirmedPublished.length}`);
  console.log(`  비공개 확정 ${report.confirmedHidden.length}`);
  console.log(`  스킵        ${report.skipped.length}`);
  console.log(`  실패        ${report.failed.length}`);
  console.log(`리포트: ${out}`);
}

main().catch((e) => {
  console.error("✖", e);
  process.exit(1);
});
