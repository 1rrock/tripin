/**
 * JSON-LD — 검색엔진용 구조화 데이터.
 *
 * 쓰지 않는 것 (LEGAL · PRODUCT):
 *   · Review / AggregateRating — 장소 평가 금지
 *   · VideoObject 조회수 — YouTube §III.E.2
 *   · SearchAction — 검색이 클라이언트 전용이라 크롤 가능한 결과 URL 이 없다
 *
 * 쓰는 것: WebSite · Organization · BreadcrumbList · ItemList(Place).
 * 핵심 랜딩은 `/c/[creator]/[city]` 의 장소 목록이다.
 */

type JsonLdNode = Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  const payload = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : { "@context": "https://schema.org", ...data };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function websiteNode(site: string, name: string, description: string): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": `${site}/#website`,
    name,
    url: site,
    description,
    inLanguage: ["ko", "en"],
    publisher: { "@id": `${site}/#org` },
  };
}

export function organizationNode(site: string, name: string, description: string): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": `${site}/#org`,
    name,
    url: site,
    logo: `${site}/icon.svg`,
    description,
  };
}

export function breadcrumbList(items: { name: string; url: string }[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface SchemaPlace {
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  url?: string;
}

export function placeList(name: string, places: SchemaPlace[]): JsonLdNode {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: places.length,
    itemListElement: places.map((p, i) => {
      const place: JsonLdNode = { "@type": "Place", name: p.name };
      if (p.url) place.url = p.url;
      if (p.address) place.address = p.address;
      if (p.lat != null && p.lng != null) {
        place.geo = {
          "@type": "GeoCoordinates",
          latitude: p.lat,
          longitude: p.lng,
        };
      }
      return {
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        item: place,
      };
    }),
  };
}

export function linkList(
  name: string,
  items: { name: string; url: string }[],
): JsonLdNode {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
