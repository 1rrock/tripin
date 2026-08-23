"use client";

/**
 * 종류 페이지의 **꼬리 도시들**.
 *
 * 문서에는 앞 `VISIBLE_CITY_GROUPS` 개 도시만 행으로 그린다(`list-payload.ts`).
 * 예전에는 그룹 수에 상한이 아예 없어서 도시 46곳 × 12곳 = 552행이 HTML 마크업
 * 한 벌 + RSC 플라이트 한 벌로 실렸다 — `/type/restaurant` gzip 244KB(원본 1.91MB).
 *
 * 잘린 나머지를 감추지는 않는다. 남은 도시가 전부 **실링크 칩**으로 문서에 남아
 * (`/city/[slug]?type=`) 크롤러도 사람도 거기서 이어 갈 수 있고, 행이 필요하면
 * "더 보기"가 `/api/type/[type]/groups` 로 받아 서버가 그린 것과 같은 컴포넌트로
 * 이어 붙인다. 칩 46개는 무게가 없다 — 행 519개가 무거웠던 것이다.
 *
 * 마운트 즉시 받지 않는 이유: 목록·핀이 본체인 도시·조각 화면과 달리 여기 꼬리는
 * "42번째 도시의 맛집"이라 첫 화면의 값이 아니다. 자동으로 받으면 방금 덜어낸
 * 519행을 모두가 도로 그린다.
 */

import { useState } from "react";
import type { PlaceType } from "@/shared/api/database.types";
import { displayCityName } from "@/shared/i18n/display";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Chip } from "@/shared/ui/frame";
import { TypeCityGroupSection } from "./TypeCityGroup";
import {
  VISIBLE_CITY_GROUPS,
  type TypeListGroup,
  type TypeRestCity,
} from "./list-payload";

export function TypeMoreCities({
  type,
  rest,
}: {
  type: PlaceType;
  /** 문서에 행으로 안 그린 도시들 — 이름·개수만이라 칩으로 전부 실린다 */
  rest: TypeRestCity[];
}) {
  const { messages: m, locale, href } = useLocale();
  const [groups, setGroups] = useState<TypeListGroup[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (loading) return;
    setLoading(true);
    fetch(`/api/type/${type}/groups`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { groups?: TypeListGroup[] } | null) => {
        /* 응답도 **전체** 그룹이다(`/api/map/index` 와 같은 계약) — 앞 3그룹은
           서버가 이미 그렸으니 여기서는 그 뒤만 쓴다. */
        if (data?.groups?.length) setGroups(data.groups.slice(VISIBLE_CITY_GROUPS));
        setLoading(false);
      })
      .catch(() => {
        /* 칩은 그대로 남는다 — 실링크라 그 자체로 길이다. 버튼만 다시 연다 */
        setLoading(false);
      });
  };

  if (groups) {
    return (
      <>
        {groups.map((g) => (
          <TypeCityGroupSection
            key={g.citySlug}
            group={g}
            type={type}
            locale={locale}
            m={m}
          />
        ))}
      </>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="index" style={{ color: "var(--dim)" }}>
        {m.cityIndex.minorHeading}
      </h2>
      <div className="flex flex-wrap gap-2">
        {rest.map((c) => (
          <Chip key={c.citySlug} href={href(`/city/${c.citySlug}?type=${type}`)}>
            {displayCityName({ name: c.cityName, nameEn: c.cityNameEn }, locale)}
            <span className="tnum ml-1.5 opacity-60">{c.count}</span>
          </Chip>
        ))}
      </div>
      <div>
        {/* 문구는 `m.home` 것을 빌려 쓴다 — i18n 은 다른 소유자라 키를 새로
            만들지 않았다(`typeDetail.loadMore` 가 생기면 그쪽이 맞다. 보고서에
            적어 뒀다). 개수를 붙이지 않는 이유: 눌러도 도시당 12곳까지만
            펼쳐지므로 "519곳 더" 는 지키지 못할 약속이다. 개수는 칩이 말한다. */}
        <Chip onClick={load}>{loading ? m.common.loading : m.home.loadMore}</Chip>
      </div>
    </section>
  );
}
