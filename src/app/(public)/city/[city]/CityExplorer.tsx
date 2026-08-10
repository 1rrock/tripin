"use client";

/**
 * 도시 지도 — 채널 무관. 이 도시에 간 **모든 채널**의 장소가 한 지도에 모인다.
 *
 * 조각(`/c/[creator]/[city]`)과 화면 골격은 같지만 성격이 다르다. 조각은 "이 사람을
 * 따라가기"고 여기는 "이 도시에서 고르기"라, 한 장소에 출처 채널이 여러 개 붙을 수 있고
 * 그게 이 화면의 값이다.
 *
 * 선택의 두 갈래를 구분한다:
 *   · **핀** 을 누르면 상세 시트가 열린다 — 지도에는 이름 말고 들어갈 자리가 없으니까
 *   · **목록 행** 을 누르면 지도만 그 핀으로 옮긴다 — 행 자체가 이미 상세다
 * 둘 다 같은 activeId 를 쓰므로 지도와 목록의 강조는 항상 일치한다.
 *
 * 필터는 클라이언트. `?type=`·`?channel=` 은 replace 로 동기화해 공유·뒤로가기가 된다.
 * 지도 뷰포트 초기화를 피하려고 풀 네비게이션은 쓰지 않는다.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PlaceType } from "@/shared/api/database.types";
import type { CityCreator, PlaceSource } from "@/shared/api/cities";
import { MapView } from "@/shared/ui/MapView";
import { PlaceSheet } from "@/shared/ui/PlaceSheet";
import { Act, Chip, FrameNo, Icon, Rule } from "@/shared/ui/frame";
import { FILTERABLE_TYPES } from "@/shared/ui/place-types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { displayPlaceName, displayPlaceSecondary } from "@/shared/i18n/display";
import type { SummaryDisplay } from "@/shared/i18n/display";
import { SummaryBlock } from "@/shared/ui/SummaryBlock";

/**
 * `CityPlaceRaw`(shared/api/cities.ts) 에서 요약을 로케일 하나로 확정한 표시용 형태.
 * `city/[city]/page.tsx` 가 로케일을 알고 있으므로 거기서 `displaySummary()` 로 만들어 넘긴다 —
 * 원본 ko/en 을 그대로 넘기면 클라이언트 props 직렬화로 EN 페이지에 한국어 원문이 새어 나간다.
 */
export interface CityPlace {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  placeType: PlaceType;
  lat: number;
  lng: number;
  address: string | null;
  summary: SummaryDisplay;
  mapUrl: string | null;
  sources: PlaceSource[];
}

function fmt(sec: number | null): string {
  if (sec === null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function youtubeUrl(videoId: string, sec: number | null): string {
  return `https://www.youtube.com/watch?v=${videoId}${sec !== null ? `&t=${Math.floor(sec)}s` : ""}`;
}

export function CityExplorer({
  cityName,
  citySlug,
  places,
  creators,
  initialType,
  initialChannel,
}: {
  cityName: string;
  citySlug: string;
  places: CityPlace[];
  creators: CityCreator[];
  initialType: PlaceType | null;
  initialChannel: string | null;
}) {
  const { messages: m, href, t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [type, setType] = useState<PlaceType | null>(initialType);
  const [channel, setChannel] = useState<string | null>(initialChannel);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rowRefs = useRef<globalThis.Map<string, HTMLLIElement>>(new globalThis.Map());

  /** 지도 뷰포트 유지 — scroll:false replace */
  const syncQuery = useCallback(
    (nextType: PlaceType | null, nextChannel: string | null) => {
      const params = new URLSearchParams();
      if (nextType) params.set("type", nextType);
      if (nextChannel) params.set("channel", nextChannel);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const selectType = (next: PlaceType | null) => {
    setType(next);
    syncQuery(next, channel);
  };

  const selectChannel = (next: string | null) => {
    setChannel(next);
    syncQuery(type, next);
  };

  const shown = useMemo(
    () =>
      places.filter((p) => {
        if (type && p.placeType !== type) return false;
        if (channel && !p.sources.some((s) => s.creatorSlug === channel)) return false;
        return true;
      }),
    [places, type, channel],
  );

  // 필터로 가려진 선택은 지도에도 목록에도 없다 — 표시 기준은 항상 이 값
  const visibleActiveId =
    activeId !== null && shown.some((p) => p.id === activeId) ? activeId : null;

  // 핀 번호는 **보이는 목록** 기준이다. 전체 기준으로 매기면 필터 후 번호가 띄엄띄엄해진다
  const pins = useMemo(
    () =>
      shown.map((p, i) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        index: i + 1,
      })),
    [shown],
  );

  const presentTypes = FILTERABLE_TYPES.filter((t) => places.some((p) => p.placeType === t));

  /** 지도 핀 → 상세 시트. 지도에는 이름 말고 들어갈 자리가 없다 */
  const onPinClick = useCallback(
    (id: string) => {
      if (activeId === id && sheetOpen) {
        setSheetOpen(false);
        setActiveId(null);
        return;
      }
      setActiveId(id);
      setSheetOpen(true);
      const el = rowRefs.current.get(id);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    },
    [activeId, sheetOpen],
  );

  /** 목록 행 → 지도만 옮긴다. 행 자체가 이미 상세라 시트를 겹쳐 띄우지 않는다 */
  const onRowClick = (id: string) => {
    setSheetOpen(false);
    setActiveId((prev) => (prev === id ? null : id));
  };

  const activeIndex = shown.findIndex((p) => p.id === visibleActiveId);
  const activePlace = activeIndex >= 0 ? shown[activeIndex]! : null;

  /** 채널 필터 중이면 출처도 그 채널만 — "이 사람이 간 장면"에 맞춤 */
  const sourcesFor = (place: CityPlace) =>
    channel ? place.sources.filter((s) => s.creatorSlug === channel) : place.sources;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start lg:gap-7 lg:px-(--gutter) lg:pt-4">
      {/* 지도 — 이 화면의 본체. 시트가 데스크톱에서 이 안에 절대배치되므로 relative 필수 */}
      <div className="relative lg:sticky lg:top-4 lg:order-2">
        <MapView
          className="h-[42dvh] w-full lg:h-[calc(100dvh-2rem)]"
          pins={pins}
          activeId={visibleActiveId}
          onPinClick={onPinClick}
          cluster
        />
        {sheetOpen && activePlace ? (
          <PlaceSheet
            index={activeIndex + 1}
            place={{
              name: displayPlaceName(activePlace, locale),
              nameLocal: activePlace.nameLocal,
              typeLabel: m.placeTypes[activePlace.placeType],
              address: activePlace.address,
              summary: activePlace.summary,
              mapUrl: activePlace.mapUrl,
              sources: sourcesFor(activePlace),
            }}
            onClose={() => setSheetOpen(false)}
          />
        ) : null}
      </div>

      <section className="lg:order-1">
        <div className="flex flex-col gap-3 px-(--gutter) pt-5 pb-4 lg:px-0 lg:pt-0">
          {presentTypes.length > 1 ? (
            <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
              <Chip active={type === null} onClick={() => selectType(null)}>
                {m.cityDetail.allTypes}
              </Chip>
              {presentTypes.map((t) => (
                <Chip
                  key={t}
                  active={type === t}
                  onClick={() => selectType(type === t ? null : t)}
                >
                  {m.placeTypes[t]}
                </Chip>
              ))}
            </div>
          ) : null}

          {/* 채널 필터 — 2명 이상일 때. URL ?channel= 과 동기화 */}
          {creators.length > 1 ? (
            <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
              <Chip active={channel === null} onClick={() => selectChannel(null)}>
                {m.cityDetail.allChannels}
              </Chip>
              {creators.map((c) => (
                <Chip
                  key={c.slug}
                  active={channel === c.slug}
                  onClick={() => selectChannel(channel === c.slug ? null : c.slug)}
                >
                  {c.displayName}
                  <span className="tnum ml-1.5 opacity-60">{c.placeCount}</span>
                </Chip>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="index tnum" style={{ color: "var(--dim)" }}>
              {shown.length === places.length
                ? t(m.cityDetail.placesAll, { n: places.length })
                : t(m.cityDetail.placesFiltered, { shown: shown.length, total: places.length })}
              {m.cityDetail.pinHint}
            </p>
            {channel ? (
              <Link
                href={href(`/c/${channel}/${citySlug}`)}
                className="index underline-offset-4 hover:underline"
                style={{ color: "var(--wax)" }}
              >
                {m.cityDetail.onlyThisChannel}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-(--block) px-(--gutter) pb-10 lg:px-0">
          {shown.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
                {m.cityDetail.noMatch}
              </p>
              <Chip
                onClick={() => {
                  setType(null);
                  setChannel(null);
                  syncQuery(null, null);
                }}
              >
                {m.cityDetail.clearFilters}
              </Chip>
            </div>
          ) : (
            <ol>
              {shown.map((place, index) => {
                const active = place.id === visibleActiveId;
                const rowSources = sourcesFor(place);
                return (
                  <li
                    key={place.id}
                    ref={(el: HTMLLIElement | null) => {
                      if (el) rowRefs.current.set(place.id, el);
                      else rowRefs.current.delete(place.id);
                    }}
                  >
                    <Rule />
                    <div
                      className="-mx-2.5 flex flex-col gap-3 px-2.5 py-4 transition-colors"
                      style={{
                        background: active ? "var(--sheet)" : undefined,
                        borderRadius: active ? "var(--r-control)" : undefined,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onRowClick(place.id)}
                        aria-pressed={active}
                        className="flex w-full cursor-pointer items-start gap-3 text-left"
                      >
                        <FrameNo n={index + 1} active={active} />
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
                            className="mt-1 block"
                            style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                          >
                            {m.placeTypes[place.placeType]}
                            {displayPlaceSecondary(place, locale) ? (
                              <>
                                {" · "}
                                <span lang={locale === "en" ? "ko" : "ja"}>
                                  {displayPlaceSecondary(place, locale)}
                                </span>
                              </>
                            ) : null}
                          </span>
                          {place.address ? (
                            <span
                              className="mt-0.5 block"
                              style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                            >
                              {place.address}
                            </span>
                          ) : null}
                        </span>
                        <Icon.chevron
                          className="mt-1 size-4 shrink-0 transition-transform"
                          style={{
                            color: "var(--dim)",
                            transform: active ? "rotate(90deg)" : undefined,
                          }}
                        />
                      </button>

                      <SummaryBlock className="pl-10" display={place.summary} showPriceHint={false} />

                      {/* 출처 — 채널 필터 중이면 그 채널만 */}
                      <div className="flex flex-wrap items-center gap-2 pl-10">
                        {rowSources.map((s, i) => (
                          <Act
                            key={`${s.youtubeId}-${i}`}
                            icon="play"
                            href={youtubeUrl(s.youtubeId, s.timestampSec)}
                            title={s.videoTitle}
                          >
                            {s.creatorName}
                            {s.timestampSec !== null ? ` ${fmt(s.timestampSec)}` : ""}
                          </Act>
                        ))}
                        {place.mapUrl ? (
                          <Act icon="out" href={place.mapUrl}>
                            {m.cityDetail.openMap}
                          </Act>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
              <Rule />
            </ol>
          )}

          {/* 다음 행동 — 채널×도시 조각으로 */}
          {creators.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="index" style={{ color: "var(--dim)" }}>
                {t(m.cityDetail.channelsInCity, { city: cityName })}
              </h2>
              <div className="flex flex-wrap gap-2">
                {creators.map((c) => (
                  <Chip key={c.slug} href={href(`/c/${c.slug}/${citySlug}`)}>
                    {c.displayName}
                    <span className="tnum ml-1.5 opacity-60">{c.placeCount}</span>
                  </Chip>
                ))}
              </div>
            </section>
          ) : null}

          <Link
            href={href("/city")}
            className="index inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
            style={{ color: "var(--dim)" }}
          >
            <Icon.back className="size-3.5" />
            {m.cityDetail.otherCities}
          </Link>
        </div>
      </section>
    </div>
  );
}
