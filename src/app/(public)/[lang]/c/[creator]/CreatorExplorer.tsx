"use client";

/**
 * 채널이 간 곳 목록 — 지역·종류로 걸러 본다.
 *
 * 🔴 **여기에 지도를 두지 않는다.** `/channels` 와 같은 규율이다.
 *
 *   · Google Maps 는 **로드당 과금**이다. 화면마다 지도를 두면 코드도 비용도
 *     그대로 늘어난다 (커밋 c197783 에서 같은 이유로 지도를 /map 하나로 모았다).
 *   · 이 화면이 답하는 질문은 "이 채널이 어디를 다녔나" 이고, 그건 도시 칩과
 *     목록이 더 빨리 답한다. 핀을 뿌려 봐야 채널이 구분되지 않는다.
 *   · 지도가 필요한 순간에는 `/map?channel=…` 으로 넘긴다. 지금 걸어둔
 *     지역·종류 필터를 그대로 들고 가므로 화면이 끊기지 않는다.
 *
 * 목록 행 → 출처 **영상 페이지**(`/c/.../v/...`). 가짜 아코디언 금지.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PlaceType } from "@/shared/api/database.types";
import type { CreatorCityOption } from "@/shared/api/creator-hub";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Chip, FrameNo, Rule } from "@/shared/ui/frame"
import { Icon } from "@/shared/ui/icons";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  displayCityName,
  displayPlaceName,
  displayPlaceSecondary,
  displayPlaceSecondaryLang,
} from "@/shared/i18n/display";

/**
 * 목록 행이 읽는 최소 형태.
 *
 * ⚠️ 예전에는 `summary`(요약 불릿)·`mapUrl`·`address`·`lat`·`lng` 를 같이 넘겼는데
 *    **이 화면은 그중 아무것도 그리지 않는다.** 행은 이름·도시·종류 한 줄이 전부다.
 *    그래서 후쿠오카 아저씨(647곳) 허브의 RSC 페이로드 801KB 중 상당수가 아무도
 *    읽지 않는 값이었다. 타입에만 있고 화면에 없는 필드는 순수한 낭비다 —
 *    tsc 는 이걸 안 잡아 준다(넘기는 쪽이 더 많은 필드를 줘도 `.map()` 을 거치면
 *    초과 속성 검사가 안 걸린다).
 *
 *    필드를 늘리기 전에 647을 곱해 보고, **실제로 렌더하는지** 확인할 것.
 */
export interface CreatorPlace {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  /** EN 표시명. `displayPlaceName` 이 EN 에서 이걸 먼저 본다(display.ts). */
  nameEn: string | null;
  placeType: PlaceType;
  citySlug: string;
  cityName: string;
  cityNameEn: string | null;
  /** 행 목적지 계산용 — 첫 출처 영상. 예전엔 sources[] 전체를 넘기고 [0]만 썼다. */
  firstVideoId: string | null;
}

/**
 * 첫 진입의 쿼리 — `useSearchParams()` 를 **쓰지 않는다.**
 *
 * 그 훅은 정적(ISR) 프리렌더 중에 `BailoutToCSRError` 를 던져, 가장 가까운
 * Suspense 경계(= 이 라우트의 `loading.tsx`) 아래를 통째로 클라이언트 렌더로
 * 돌린다. 그러면 이 채널의 장소 목록이 서버 HTML 에서 통째로 사라진다.
 * 그래서 하이드레이션 뒤 `window.location.search` 를 한 번 읽는다 —
 * 첫 페인트는 필터 없는 전체 목록이고, 깊은 링크의 필터는 그 다음 프레임에 걸린다.
 */
function readInitialFilter(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function parseType(v: string | null): PlaceType | null {
  return v && (FILTERABLE_TYPES as string[]).includes(v) ? (v as PlaceType) : null;
}

function parseCity(v: string | null, cities: { slug: string }[]): string | null {
  if (!v) return null;
  return cities.some((c) => c.slug === v) ? v : null;
}

/** 목록 행 목적지 — 첫 출처 영상. 없으면 도시 조각으로 물러난다. */
function placeHref(
  creatorSlug: string,
  place: CreatorPlace,
  href: (path: string) => string,
): string {
  if (place.firstVideoId) return href(`/c/${creatorSlug}/v/${place.firstVideoId}`);
  return href(`/c/${creatorSlug}/${place.citySlug}`);
}

export function CreatorExplorer({
  creatorSlug,
  places: headPlaces,
  total,
  presentTypes,
  cities,
}: {
  creatorSlug: string;
  /** 서버가 문서에 그린 **앞줄**만(`hub-payload.ts` `HUB_PLACE_HEAD`). 전체가 아니다 */
  places: CreatorPlace[];
  /** 이 채널의 장소 전체 수 — 개수 라벨이 앞줄만 세지 않게 서버가 넘긴다 */
  total: number;
  /** 전체 기준으로 서버가 센 종류 칩 — 꼬리가 와도 칩 줄이 안 튄다 */
  presentTypes: PlaceType[];
  cities: CreatorCityOption[];
}) {
  const { messages: m, href, t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [type, setType] = useState<PlaceType | null>(null);
  const [city, setCity] = useState<string | null>(null);

  /**
   * 목록의 꼬리 — 문서에는 앞줄 `HUB_PLACE_HEAD` 곳만 실린다(`hub-payload.ts`).
   * 마운트 즉시 한 번 받아 통째로 갈아 끼운다. `/city/[city]`·조각 화면이 쓰는
   * 그 방식이고, 원류는 `/map` 의 씨앗 6곳이다.
   *
   * 실패해도 `[]` 로 덮지 않는다 — 서버가 이미 그려 둔 앞줄까지 지우면 목록이
   * 통째로 빈 화면이 된다.
   */
  const [fetchedPlaces, setFetchedPlaces] = useState<CreatorPlace[] | null>(null);
  const places = fetchedPlaces ?? headPlaces;
  /** 앞줄이 곧 전체인 작은 채널은 처음부터 준비된 상태다 */
  const placesReady = fetchedPlaces !== null || headPlaces.length >= total;
  useEffect(() => {
    if (headPlaces.length >= total) return;
    let alive = true;
    fetch(`/api/creator/${creatorSlug}/places`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { places?: CreatorPlace[] } | null) => {
        if (alive && data?.places?.length) setFetchedPlaces(data.places);
      })
      .catch(() => {
        /* 앞줄은 그대로 둔다 — 위 주석 */
      });
    return () => {
      alive = false;
    };
  }, [creatorSlug, headPlaces.length, total]);

  /* 깊은 링크(`/map` 이나 조각에서 넘어오는 `?type=`·`?city=`)를 하이드레이션
     직후 한 번 적용한다. 서버에서 읽으면 이 페이지가 ISR 에서 빠진다. */
  useEffect(() => {
    const q = readInitialFilter();
    const t0 = parseType(q.get("type"));
    const c0 = parseCity(q.get("city"), cities);
    /* eslint-disable react-hooks/set-state-in-effect --
       마운트 직후 1회. 서버는 이 값을 읽을 수 없다(readInitialFilter 주석). */
    if (t0) setType(t0);
    if (c0) setCity(c0);
    /* eslint-enable react-hooks/set-state-in-effect */
    // 이후 필터 변경은 select* 가 상태와 URL 을 함께 움직인다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncQuery = useCallback(
    (nextType: PlaceType | null, nextCity: string | null) => {
      const params = new URLSearchParams();
      if (nextType) params.set("type", nextType);
      if (nextCity) params.set("city", nextCity);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const selectType = (next: PlaceType | null) => {
    setType(next);
    syncQuery(next, city);
  };

  const selectCity = (next: string | null) => {
    setCity(next);
    syncQuery(type, next);
  };

  const shown = useMemo(
    () =>
      places.filter((p) => {
        if (type && p.placeType !== type) return false;
        if (city && p.citySlug !== city) return false;
        return true;
      }),
    [places, type, city],
  );

  /* 지금 화면의 필터를 그대로 지도로 넘긴다. /map 은 channel·city·type 을
     같은 이름으로 읽는다(`HomeCanvas.tsx`) — 여기서 이름을 바꾸면 조용히 무시된다. */
  const mapHref = useMemo(() => {
    const params = new URLSearchParams({ channel: creatorSlug });
    if (city) params.set("city", city);
    if (type) params.set("type", type);
    return href(`/map?${params.toString()}`);
  }, [creatorSlug, city, type, href]);

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col px-(--gutter) lg:max-w-3xl">
      <div className="flex flex-col gap-2 pt-1 pb-2">
        {cities.length > 1 ? (
          <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
            <Chip active={city === null} onClick={() => selectCity(null)}>
              {m.hub.allCities}
            </Chip>
            {cities.map((c) => (
              <Chip
                key={c.slug}
                active={city === c.slug}
                onClick={() => selectCity(city === c.slug ? null : c.slug)}
              >
                {displayCityName(c, locale)}
                <span className="tnum ml-1.5 opacity-60">{c.placeCount}</span>
              </Chip>
            ))}
          </div>
        ) : null}

        {presentTypes.length > 1 ? (
          <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
            <Chip active={type === null} onClick={() => selectType(null)}>
              {m.hub.allTypes}
            </Chip>
            {presentTypes.map((tKey) => (
              <Chip
                key={tKey}
                active={type === tKey}
                onClick={() => selectType(type === tKey ? null : tKey)}
              >
                {m.placeTypes[tKey]}
              </Chip>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="index tnum" style={{ color: "var(--dim)" }}>
            {/* 개수는 늘 **전체**(서버가 센 total)를 기준으로 말한다. 필터를 건
                숫자 짝은 꼬리가 도착한 뒤에만 — 앞줄 36곳만 든 순간의 shown 은
                "몇 곳이 걸렸나"의 답이 아니라, 잠깐 떴다 뛰는 값이 된다
                (`/map` 이 씨앗 6곳에서 겪은 그 버그다). */}
            {!placesReady || shown.length === places.length
              ? t(m.hub.placesAll, { n: total })
              : t(m.hub.placesFiltered, { shown: shown.length, total })}
            {m.hub.pinHint}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {city ? (
              <Link
                href={href(`/c/${creatorSlug}/${city}`)}
                className="index underline-offset-4 hover:underline"
                style={{ color: "var(--wax)" }}
              >
                {m.hub.onlyThisCity}
              </Link>
            ) : null}
            {/* 지도는 /map 의 것이다. 필터를 들고 넘어간다. */}
            <Link
              href={mapHref}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 px-3.5 font-bold"
              style={{
                fontSize: "var(--t-meta)",
                borderRadius: "var(--r-frame)",
                background: "var(--halo)",
                color: "var(--halo-ink)",
              }}
            >
              <Icon.map className="size-4" />
              {m.hub.openMap}
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col pb-10">
        {shown.length === 0 && !placesReady ? (
          /* 꼬리가 오기 전 — 깊은 링크 필터가 앞줄 36곳에서만 안 걸린 것일 수
             있다. "조건에 맞는 장소가 없어요" 를 띄웠다가 곧 목록이 차면 그건
             거짓말이다. 자리를 비워 두고 도착을 기다린다(대개 한 프레임). */
          <span aria-hidden />
        ) : shown.length === 0 ? (
          /* 빈 화면 문법은 `EmptyState` 하나다 — 다음 행동(필터 지우기)은 이미
             있었으니 상자만 갈아 끼운다. `/city/[city]`·`/c/[creator]/[city]` 의
             같은 자리와 판형·칩 크기(36px)가 한 벌로 선다. */
          <EmptyState message={m.hub.noMatch} className="pt-8 pb-10">
            <Chip
              size="md"
              onClick={() => {
                setType(null);
                setCity(null);
                syncQuery(null, null);
              }}
            >
              {m.hub.clearFilters}
            </Chip>
          </EmptyState>
        ) : (
          <ol>
            {shown.map((place, index) => {
              const cityLabel = displayCityName(
                { name: place.cityName, nameEn: place.cityNameEn },
                locale,
              );
              const secondary = displayPlaceSecondary(place, locale);
              return (
                <li key={place.id} id={place.slug}>
                  <Rule />
                  <Link
                    href={placeHref(creatorSlug, place, href)}
                    className="roll -mx-2.5 flex items-start gap-3 rounded-(--r-control) px-2.5 py-2.5"
                    aria-label={t(m.hub.openVideoAria, {
                      name: displayPlaceName(place, locale),
                    })}
                  >
                    <FrameNo n={index + 1} />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block font-bold"
                        style={{
                          fontSize: "var(--t-title)",
                          letterSpacing: "-0.025em",
                          lineHeight: 1.3,
                        }}
                      >
                        {displayPlaceName(place, locale)}
                      </span>
                      <span
                        className="mt-0.5 block"
                        style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                      >
                        {cityLabel}
                        {" · "}
                        {m.placeTypes[place.placeType]}
                        {secondary ? (
                          <>
                            {" · "}
                            <span lang={displayPlaceSecondaryLang(place, locale)}>{secondary}</span>
                          </>
                        ) : null}
                      </span>
                    </span>
                    <Icon.chevron
                      className="mt-1 size-4 shrink-0"
                      style={{ color: "var(--dim)" }}
                    />
                  </Link>
                </li>
              );
            })}
            <Rule />
          </ol>
        )}
      </div>
    </section>
  );
}
