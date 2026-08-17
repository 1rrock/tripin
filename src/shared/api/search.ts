import { supabase } from "@/shared/api/supabase";
import { cachePublic } from "@/shared/api/cache";
import { fetchAll } from "@/shared/api/chunked-in";
import { loadCityIndex } from "@/shared/api/cities";
import { loadHomeFeed } from "@/shared/api/home";
import { loadTypeIndex } from "@/shared/api/place-types";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import type { Locale } from "@/shared/i18n/config";
import type { SearchDoc, SearchKind } from "@/shared/lib/search";

/**
 * 통합 검색 색인 — 채널·지역·종류·장소·영상을 한 배열로.
 *
 * 왜 검색 서버가 없나: 색인 전체가 gzip 14KB 다(216개). 브라우저에 통째로
 * 올려놓고 훑는 편이 어떤 검색 API 왕복보다 빠르고, 오타·초성 처리도 우리가 쥔다.
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
  path: string;
  ko: Loc;
  en: Loc;
  accent?: string;
  avatarUrl?: string | null;
  youtubeId?: string;
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
        .select("name, name_en, city_id, summary_bullets, summary_bullets_en, map_status")
        .eq("map_status", "confirmed")
        .range(from, to),
    ),
  ]);

  const ko = getDictionary("ko");
  const en = getDictionary("en");
  const docs: SearchDocRaw[] = [];

  // ── 지역 — "도쿄"의 가장 좋은 답은 영상 목록이 아니라 도쿄 지도다
  const cityById = new Map<string, (typeof cities)[number]>();
  for (const c of cities) {
    docs.push({
      kind: "city",
      path: `/city/${c.slug}`,
      ko: {
        name: c.name,
        sub: t(ko.cityIndex.minorMeta, { places: c.placeCount, videos: c.videoCount }),
        hay: [c.name, c.nameEn, c.slug],
      },
      en: {
        name: c.nameEn || c.name,
        sub: t(en.cityIndex.minorMeta, { places: c.placeCount, videos: c.videoCount }),
        hay: [c.nameEn, c.name, c.slug],
      },
    });
  }

  // ── 채널 — 채널명은 번역하지 않는다(HANDOFF §2-4). ko/en 이 같은 문자열이다
  for (const cr of feed.creators) {
    const hay = [cr.displayName, cr.slug, cr.handle ?? ""];
    docs.push({
      kind: "channel",
      path: `/c/${cr.slug}`,
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
      path: `/type/${row.type}`,
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

  // ── 장소 — 핀은 도시 지도 안에 산다. 장소 전용 공개 라우트가 없어 도시로 보낸다
  for (const c of cities) cityById.set(c.slug, c);
  const citySlugById = new Map<string, string>();
  {
    const { data: cityRows } = await supabase.from("cities").select("id, slug, name, name_en");
    for (const row of cityRows ?? []) citySlugById.set(row.id, row.slug);
    for (const p of placeRows ?? []) {
      const citySlug = citySlugById.get(p.city_id);
      const city = citySlug ? cityById.get(citySlug) : undefined;
      if (!city) continue;
      const bulletsKo = (p.summary_bullets ?? []).join(" ").slice(0, BULLET_CAP);
      const bulletsEn = (p.summary_bullets_en ?? []).join(" ").slice(0, BULLET_CAP);
      docs.push({
        kind: "place",
        path: `/city/${city.slug}`,
        ko: { name: p.name, sub: city.name, hay: [p.name, bulletsKo] },
        // 장소명은 번역하지 않는다(§2-4) — EN 에서도 원문 상호명이다
        en: { name: p.name, sub: city.nameEn || city.name, hay: [p.name, bulletsEn] },
      });
    }
  }

  // ── 영상 — 제목은 유튜브 원문 그대로다. 변형 금지(§III.E.3)
  for (const v of feed.videos) {
    const hay = [v.title, v.creatorName];
    docs.push({
      kind: "video",
      path: `/c/${v.creatorSlug}/v/${v.youtubeId}`,
      ko: { name: v.title, sub: v.creatorName, hay },
      en: { name: v.title, sub: v.creatorName, hay },
      youtubeId: v.youtubeId,
    });
  }

  return docs;
}, ["search:index"]);

/** 로케일 하나만 남긴다 — 이 함수를 거쳐야 클라이언트로 나갈 수 있다 */
export function pickLocale(docs: SearchDocRaw[], locale: Locale): SearchDoc[] {
  return docs.map((d) => {
    const loc = locale === "en" ? d.en : d.ko;
    return {
      kind: d.kind,
      path: d.path,
      name: loc.name,
      sub: loc.sub,
      hay: loc.hay.filter(Boolean),
      ...(d.accent ? { accent: d.accent } : {}),
      ...(d.avatarUrl ? { avatarUrl: d.avatarUrl } : {}),
      ...(d.youtubeId ? { youtubeId: d.youtubeId } : {}),
    } satisfies SearchDoc;
  });
}
