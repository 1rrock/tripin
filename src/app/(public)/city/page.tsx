import type { Metadata } from "next";
import Link from "next/link";
import { loadCityIndex } from "@/shared/api/cities";
import { Chip, Icon, Index, Rule } from "@/shared/ui/frame";
import { PLACE_TYPE_LABELS } from "@/shared/ui/place-types";

/**
 * 지역 목록 — 채널 무관 진입점의 입구.
 *
 * "도쿄 가는데 뭐 있지"로 온 사람은 유튜버 이름을 모른다. 그 사람이 채널을
 * 먼저 고르지 않고도 들어올 수 있게 하는 문이다.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "지역별 여행 유튜버 맛집 지도",
  description:
    "도시를 고르면 그 도시에 다녀간 여행 유튜버들의 맛집·명소가 한 지도에 뜹니다. 모든 장소에 출처 영상 링크가 있습니다.",
};

export default async function CityIndexPage() {
  const cities = await loadCityIndex();
  const totalPlaces = cities.reduce((sum, c) => sum + c.placeCount, 0);

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <header className="flex flex-col gap-3.5">
        <h1
          className="font-black"
          style={{
            fontSize: "var(--t-display)",
            letterSpacing: "-0.045em",
            lineHeight: 1.12,
          }}
        >
          어디 가세요?
        </h1>
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          도시 {cities.length} · 간 곳 {totalPlaces}
        </p>
        <p
          className="max-w-[42ch]"
          style={{
            fontSize: "var(--t-body)",
            color: "var(--dim)",
            lineHeight: 1.7,
          }}
        >
          도시를 고르면 그 도시에 간 채널들의 장소가 한 지도에 모입니다.
        </p>
      </header>

      {cities.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
          아직 공개된 도시가 없어요.
        </p>
      ) : (
        <ul className="md:grid md:grid-cols-2 md:gap-x-(--block)">
          {cities.map((c) => (
            <li key={c.slug}>
              <Rule />
              <Link
                href={`/city/${c.slug}`}
                className="flex items-center gap-3 py-3.5"
                aria-label={`${c.name} 지도 열기 — 간 곳 ${c.placeCount}곳, 채널 ${c.creatorCount}`}
              >
                <Icon.pin
                  className="size-[18px] shrink-0"
                  style={{ color: "var(--wax)" }}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate font-bold"
                    style={{
                      fontSize: "var(--t-title)",
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {c.name}
                  </span>
                  <span
                    className="index mt-1 block"
                    style={{ color: "var(--dim)" }}
                  >
                    {c.nameEn}
                  </span>
                </span>
                <Index className="tnum shrink-0">
                  {c.placeCount}곳 · 채널 {c.creatorCount}
                </Index>
                <Icon.chevron
                  className="size-4 shrink-0"
                  style={{ color: "var(--dim)" }}
                />
              </Link>

              {c.types.length > 1 ? (
                <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) pb-3.5 md:mx-0 md:flex-wrap md:px-0">
                  {c.types.map(({ type, count }) => (
                    <Chip key={type} href={`/city/${c.slug}?type=${type}`}>
                      {PLACE_TYPE_LABELS[type]}
                      <span className="tnum ml-1.5 opacity-60">{count}</span>
                    </Chip>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
          <Rule />
        </ul>
      )}
    </main>
  );
}
