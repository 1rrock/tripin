import type { CSSProperties } from "react";
import Link from "next/link";
import type { PlaceType } from "@/shared/api/database.types";
import type { Locale } from "@/shared/i18n/config";
import type { Messages } from "@/shared/i18n/messages/ko";
import { t } from "@/shared/i18n/get-dictionary";
import { displayCityName, displayPlaceName, displayPlaceSecondary } from "@/shared/i18n/display";
import { localePath } from "@/shared/i18n/locale";
import { placePath } from "@/shared/lib/place-path";
import { Chip, Frame, Index, Rule } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { VISIBLE_PER_CITY, type TypeListGroup } from "./list-payload";

/**
 * 종류 페이지의 도시 한 묶음.
 *
 * **"use client" 를 붙이지 않는다.** 훅이 없어서 서버·클라이언트 양쪽 트리에
 * 그대로 들어간다 — `page.tsx`(앞 3그룹, 서버)와 `TypeMoreCities`(꼬리, 클라이언트)가
 * 같은 컴포넌트를 쓰므로 "더 보기"로 이어붙인 그룹이 문서의 그룹과 한 획도
 * 다르지 않다. 로케일·문구는 프롭으로 받는다(클라이언트 쪽은 `useLocale()` 에서).
 */
export function TypeCityGroupSection({
  group,
  type,
  locale,
  m,
  eagerFirstCut = false,
}: {
  group: TypeListGroup;
  type: PlaceType;
  locale: Locale;
  m: Messages;
  /** 이 페이지의 LCP 후보 — 첫 도시의 첫 컷 하나만 true */
  eagerFirstCut?: boolean;
}) {
  const cityLabel = displayCityName(
    { name: group.cityName, nameEn: group.cityNameEn },
    locale,
  );
  const mapHref = localePath(`/city/${group.citySlug}?type=${type}`, locale);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          className="font-bold"
          style={{ fontSize: "var(--t-title)", letterSpacing: "-0.025em" }}
        >
          {cityLabel}
          <span className="index tnum ml-2 font-normal" style={{ color: "var(--dim)" }}>
            {t(m.typeDetail.placesUnit, { n: group.count })}
          </span>
        </h2>
        <Chip href={mapHref}>{m.typeDetail.viewOnMap}</Chip>
      </div>

      <ol className="flex flex-col">
        {group.places.map((place, i) => {
          /* 대표 컷 — 이 장소를 실은 첫 출처 영상. 썸네일이 이 월드의 서명인데
             이 화면만 텍스트 목록이었다. 컷은 원본 그대로여야 하므로
             프레임 비율(16:9)을 건드리지 않는다(LEGAL.md 4.5) */
          const cut = place.cut;
          return (
            <li key={place.id} className="develop" style={{ "--i": i } as CSSProperties}>
              <Rule />
              {/* 행 전체가 장소 페이지 링크다. 예전에는 여기에 출처·지도
                  링크가 장소마다 붙어 /type/restaurant 이 3030KB 였고,
                  정작 `/place` 링크는 하나도 없어서 크롤러가 이 페이지에서
                  장소로 갈 길이 없었다. 도시·조각 목록과 같은 규율로 맞춘다 —
                  아웃링크는 장소 페이지가 맡는다. */}
              <Link
                href={localePath(placePath(place.slug), locale)}
                className="flex items-start gap-3.5 py-(--stack)"
              >
                {cut ? (
                  <span className="w-[104px] shrink-0 sm:w-[132px]">
                    <Frame>
                      <Thumb
                        youtubeId={cut.youtubeId}
                        alt={cut.videoTitle}
                        eager={eagerFirstCut && i === 0}
                      />
                    </Frame>
                  </span>
                ) : null}

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <Index tone="wax" className="tnum shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </Index>
                    <span
                      className="min-w-0 font-bold"
                      style={{
                        fontSize: "var(--t-title)",
                        letterSpacing: "-0.025em",
                        lineHeight: 1.3,
                      }}
                    >
                      {displayPlaceName(place, locale)}
                    </span>
                  </span>
                  {displayPlaceSecondary(place, locale) ? (
                    <span
                      className="mt-1 block"
                      style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                    >
                      {displayPlaceSecondary(place, locale)}
                    </span>
                  ) : null}
                  {place.address ? (
                    <span
                      className="mt-0.5 block"
                      style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                    >
                      {place.address}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
        {group.count > VISIBLE_PER_CITY ? (
          <li>
            <Rule />
            <div className="py-(--stack)">
              <Chip href={mapHref}>
                {t(m.typeDetail.moreInCity, { n: group.count - VISIBLE_PER_CITY })}
              </Chip>
            </div>
          </li>
        ) : null}
        <Rule />
      </ol>
    </section>
  );
}
