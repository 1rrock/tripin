"use client";

/**
 * 전체 지도 — 도시를 지도 위에서 고른다.
 *
 * ⚠️ 전 도시를 한 번에 담지 않는다. 지금 도시가 일본·한국·미국에 걸쳐 있어서
 *    bounds 를 다 채우면 화면의 절반이 태평양이 된다. "빈 지도는 아무것도 없는
 *    서비스로 읽힌다"(PRODUCT.md 원칙 P1)는 경고가 정확히 이 그림을 말한다.
 *    그래서 나라 단위로 끊고, 기본값은 장소가 가장 많은 나라다.
 *
 * 마커는 번호가 아니라 "도쿄 8" 같은 라벨이다 — 여기서는 순서가 아니라
 * 어디에 얼마나 있는지가 정보다.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CityRow } from "@/shared/api/cities";
import { MapView } from "@/shared/ui/MapView";
import { Chip, Icon, Index, Rule } from "@/shared/ui/frame";

/** 표기용 나라 이름. 없는 코드는 코드 그대로 — 틀린 이름을 지어내지 않는다. */
const COUNTRY_NAMES: Record<string, string> = {
  JP: "일본",
  KR: "한국",
  US: "미국",
  TW: "대만",
  TH: "태국",
  VN: "베트남",
  CN: "중국",
  HK: "홍콩",
  SG: "싱가포르",
};

function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

export function WorldMap({ cities }: { cities: CityRow[] }) {
  const router = useRouter();

  const countries = useMemo(() => {
    const by = new Map<string, { code: string; cities: number; places: number }>();
    for (const c of cities) {
      const hit = by.get(c.countryCode) ?? { code: c.countryCode, cities: 0, places: 0 };
      hit.cities += 1;
      hit.places += c.placeCount;
      by.set(c.countryCode, hit);
    }
    return [...by.values()].sort((a, b) => b.places - a.places);
  }, [cities]);

  const [country, setCountry] = useState<string>(() => countries[0]?.code ?? "");

  const shown = useMemo(
    () => cities.filter((c) => c.countryCode === country),
    [cities, country],
  );

  const pins = useMemo(
    () =>
      shown.map((c) => ({
        id: c.slug,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        label: `${c.name} ${c.placeCount}`,
      })),
    [shown],
  );

  return (
    <div className="flex flex-col gap-(--stack)">
      {countries.length > 1 ? (
        <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter)">
          {countries.map((c) => (
            <Chip key={c.code} active={country === c.code} onClick={() => setCountry(c.code)}>
              {countryName(c.code)}
              <span className="tnum ml-1.5 opacity-60">{c.places}</span>
            </Chip>
          ))}
        </div>
      ) : null}

      <MapView
        className="h-[52dvh] w-full lg:h-[60dvh]"
        pins={pins}
        onPinClick={(slug) => router.push(`/city/${slug}`)}
        singlePinZoom={11}
      />

      <p className="index" style={{ color: "var(--dim)" }}>
        지도의 도시를 누르면 그 도시 지도가 열립니다
      </p>

      {/* 지도를 못 쓰는 상황(로드 실패·스크린리더)에서도 같은 목적지로 갈 수 있어야 한다 */}
      <ul>
        {shown.map((c) => (
          <li key={c.slug}>
            <Rule />
            <Link href={`/city/${c.slug}`} className="flex items-center gap-3 py-3.5">
              <Icon.pin className="size-[18px] shrink-0" style={{ color: "var(--wax)" }} />
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate font-bold"
                  style={{ fontSize: "var(--t-title)", letterSpacing: "-0.025em" }}
                >
                  {c.name}
                </span>
                <span
                  className="index mt-1 block"
                  style={{ color: "var(--dim)", textTransform: "none" }}
                >
                  {c.nameEn}
                </span>
              </span>
              <Index className="tnum shrink-0">{c.placeCount}곳</Index>
              <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
            </Link>
          </li>
        ))}
        <Rule />
      </ul>
    </div>
  );
}
