import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import { fetchAll } from "@/shared/api/chunked-in";
import { loadCityIndex } from "@/shared/api/cities";
import { loadHomeFeed } from "@/shared/api/home";
import { loadTypeIndex } from "@/shared/api/place-types";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import type { Locale } from "@/shared/i18n/config";
import {
  cityHay,
  packHay,
  KIND_WIRE,
  type PackedDoc,
  type PackedIndex,
  type SearchKind,
} from "@/shared/lib/search";

/**
 * 통합 검색 색인 — 채널·지역·종류·장소·영상을 한 배열로.
 *
 * 왜 검색 서버가 없나: 브라우저에 통째로 올려놓고 훑는 편이 어떤 검색 API
 * 왕복보다 빠르고, 오타·초성·행정 접미 처리도 우리가 쥔다.
 *
 * ⚠️ 이 로더는 **로케일을 모른다.** ko/en 을 둘 다 실어 보내고, 로케일을 아는
 *    쪽(`/api/search-index` 라우트)이 한쪽만 골라 내보낸다. 둘 다 넘기면 EN 응답에
 *    한국어 원문이 통째로 실린다 — HANDOFF §3-2 에 실제로 걸렸던 함정이다.
 *
 * ⚠️ 캐시 태그를 기존 로더들과 나눠 쓰지 않는다. 여기서 조합하는 세 로더가
 *    각자의 태그로 이미 캐시되므로, 무효화는 그쪽에서 함께 일어난다.
 */

/** 한 문서의 로케일별 표시·매칭 텍스트 */
interface Loc {
  name: string;
  sub: string;
  hay: string[];
}

/** 로더가 돌려주는 원본 — ko/en 둘 다 */
export interface SearchDocRaw {
  kind: SearchKind;
  /** 경로의 **가변부만** 쥔다 — 접두사는 kind 가 안다(`unpackPath`). 완성된
      `path` 는 클라이언트가 조립한다. video 는 youtubeId 다(썸네일 id 와 같은 값) */
  slug: string;
  /** video 전용 — `/c/{creatorSlug}/v/{slug}` 의 가운데 칸 */
  creatorSlug?: string;
  ko: Loc;
  en: Loc;
  accent?: string;
  avatarUrl?: string | null;
}

/** 요약 불릿에서 매칭용 텍스트만 — "라멘"은 상호명이 아니라 여기 산다 */
const BULLET_CAP = 120;

export const loadSearchIndex = cachePublic(async (): Promise<SearchDocRaw[]> => {
  const [cities, feed, types, placeRows] = await Promise.all([
    loadCityIndex(),
    loadHomeFeed(),
    loadTypeIndex(),
    fetchAll((from, to) =>
      supabase
        .from("places")
        .select("slug, name, name_en, city_id, summary_bullets, summary_bullets_en, map_status")
        .eq("map_status", "confirmed")
        .range(from, to),
    ),
  ]);

  const ko = getDictionary("ko");
  const en = getDictionary("en");
  const docs: SearchDocRaw[] = [];

  // ── 지역 — "도쿄"의 가장 좋은 답은 영상 목록이 아니라 도쿄 지도다
  for (const c of cities) {
    docs.push({
      kind: "city",
      slug: c.slug,
      ko: {
        name: c.name,
        sub: t(ko.cityIndex.minorMeta, { places: c.placeCount, videos: c.videoCount }),
        hay: cityHay(c.name, c.nameEn, c.slug),
      },
      en: {
        name: c.nameEn || c.name,
        sub: t(en.cityIndex.minorMeta, { places: c.placeCount, videos: c.videoCount }),
        hay: cityHay(c.name, c.nameEn, c.slug),
      },
    });
  }

  // ── 채널 — 채널명은 번역하지 않는다(HANDOFF §2-4). ko/en 이 같은 문자열이다
  for (const cr of feed.creators) {
    const hay = [cr.displayName, cr.slug, cr.handle ?? ""];
    docs.push({
      kind: "channel",
      slug: cr.slug,
      ko: {
        name: cr.displayName,
        sub: t(ko.channels.rollMeta, { videos: cr.videoCount, places: cr.placeCount }),
        hay,
      },
      en: {
        name: cr.displayName,
        sub: t(en.channels.rollMeta, { videos: cr.videoCount, places: cr.placeCount }),
        hay,
      },
      accent: cr.accentColor,
      avatarUrl: cr.avatarUrl,
    });
  }

  // ── 종류 — 라벨이 DB 가 아니라 메시지 카탈로그에 있어 양쪽을 다 매칭에 넣는다
  //    ("카페"로도 "cafe"로도 찾혀야 한다)
  for (const row of types) {
    const koLabel = ko.placeTypes[row.type];
    const enLabel = en.placeTypes[row.type];
    const hay = [koLabel, enLabel, row.type];
    docs.push({
      kind: "type",
      slug: row.type,
      ko: {
        name: koLabel,
        sub: t(ko.typeIndex.citiesChannels, { cities: row.cityCount, creators: row.creatorCount }),
        hay,
      },
      en: {
        name: enLabel,
        sub: t(en.typeIndex.citiesChannels, { cities: row.cityCount, creators: row.creatorCount }),
        hay,
      },
    });
  }

  // ── 장소 — 상호명 질의의 착지는 `/place/[slug]` 다. 도시로 보내면
  //    "잇케이 JRJP 하카타점" 이 후쿠오카 561곳 문서에 묻힌다.
  {
    const { data: cityRows } = await supabase.from("cities").select("id, slug, name, name_en");
    const cityByUuid = new Map((cityRows ?? []).map((row) => [row.id, row]));
    for (const p of placeRows ?? []) {
      if (!p.slug) continue;
      const city = cityByUuid.get(p.city_id);
      if (!city) continue;
      const bulletsKo = (p.summary_bullets ?? []).join(" ").slice(0, BULLET_CAP);
      const bulletsEn = (p.summary_bullets_en ?? []).join(" ").slice(0, BULLET_CAP);
      docs.push({
        kind: "place",
        slug: p.slug,
        ko: { name: p.name, sub: city.name, hay: [p.name, p.name_en ?? "", bulletsKo] },
        // 장소명은 번역하지 않는다(§2-4) — EN 에서도 원문 상호명이다
        en: { name: p.name, sub: city.name_en || city.name, hay: [p.name, p.name_en ?? "", bulletsEn] },
      });
    }
  }

  // ── 영상 — 제목은 유튜브 원문 그대로다. 변형 금지(§III.E.3)
  for (const v of feed.videos) {
    const hay = [v.title, v.creatorName];
    docs.push({
      kind: "video",
      slug: v.youtubeId,
      creatorSlug: v.creatorSlug,
      ko: { name: v.title, sub: v.creatorName, hay },
      en: { name: v.title, sub: v.creatorName, hay },
    });
  }

  return docs;
}, ["search:index"]);

/**
 * 로케일 하나만 남기고 **전선 형식으로 압축한다** — 이 함수를 거쳐야 클라이언트로
 * 나갈 수 있다. 되읽는 쪽은 `unpackIndex`(shared/lib/search.ts)이고, 형식이 왜
 * 이렇게 생겼는지는 거기 "전선 형식" 주석에 있다.
 *
 * 여기서 버리는 것은 전부 **되살릴 수 있는 것들뿐**이다:
 *   · 경로 접두사 → kind 가 안다
 *   · `hay[0]` → 이름과 같을 때만 뗀다(`packHay`)
 *   · `youtubeId` → 영상 항목의 slug 가 곧 그것이다
 *   · 채널 slug(영상 경로의 가운데 칸) → 16종뿐이라 사전으로 접는다
 */
export function pickLocale(docs: SearchDocRaw[], locale: Locale): PackedIndex {
  /* 채널 사전은 **영상이 실제로 가리키는 slug** 로 짓는다 — `feed.creators` 를
     그대로 쓰면 목록에 없는 채널의 영상이 섞였을 때 자리가 어긋난다 */
  const creators: string[] = [];
  const creatorAt = new Map<string, number>();

  const d: PackedDoc[] = docs.map((doc) => {
    const loc = locale === "en" ? doc.en : doc.ko;
    const row: PackedDoc = [
      KIND_WIRE.indexOf(doc.kind),
      doc.slug,
      loc.name,
      loc.sub,
      packHay(loc.hay, loc.name),
    ];
    if (doc.kind === "channel") {
      // 옛 응답은 값이 있을 때만 키를 넣었다 — 되읽는 쪽이 빈 문자열을 그렇게 읽는다
      row[5] = doc.accent ?? "";
      row[6] = doc.avatarUrl ?? "";
    } else if (doc.kind === "video") {
      const slug = doc.creatorSlug ?? "";
      let at = creatorAt.get(slug);
      if (at === undefined) {
        at = creators.length;
        creators.push(slug);
        creatorAt.set(slug, at);
      }
      row[5] = at;
    }
    return row;
  });

  return { k: KIND_WIRE, c: creators, d };
}
