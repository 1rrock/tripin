import type { Metadata } from "next";
import Link from "next/link";
import { loadTypeIndex } from "@/shared/api/place-types";
import { Icon, Index, Rule } from "@/shared/ui/frame";
import { PLACE_TYPE_LABELS } from "@/shared/ui/place-types";

/**
 * 종류 목록 — 세 번째 진입축.
 *
 * "맛집부터 / 숙소부터" 보고 싶은 사람. 전역 지도(`/map`) 대신 이 문이 메뉴에 있다.
 * 도시·채널을 몰라도 유형만으로 들어올 수 있다.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "종류별 여행 유튜버 장소 — 맛집·카페·숙소·명소",
  description:
    "맛집, 카페, 숙소, 명소 등 종류를 고르면 여행 유튜버가 다녀간 장소가 도시별로 모입니다. 모든 장소에 출처 영상 링크가 있습니다.",
};

export default async function TypeIndexPage() {
  const types = await loadTypeIndex();
  const totalPlaces = types.reduce((s, t) => s + t.placeCount, 0);

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
          뭐 볼래요?
        </h1>
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          종류 {types.length} · 간 곳 {totalPlaces}
        </p>
        <p
          className="max-w-[42ch]"
          style={{
            fontSize: "var(--t-body)",
            color: "var(--dim)",
            lineHeight: 1.7,
          }}
        >
          맛집·카페·숙소·명소 같은 종류를 고르면, 그 유형의 장소가 도시별로 모입니다.
        </p>
      </header>

      {types.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
          아직 공개된 장소가 없어요.
        </p>
      ) : (
        <ul className="md:grid md:grid-cols-2 md:gap-x-(--block)">
          {types.map((t) => (
            <li key={t.type}>
              <Rule />
              <Link
                href={`/type/${t.type}`}
                className="flex items-center gap-3 py-3.5"
                aria-label={`${PLACE_TYPE_LABELS[t.type]} — ${t.placeCount}곳, 도시 ${t.cityCount}`}
              >
                <Icon.pin className="size-[18px] shrink-0" style={{ color: "var(--wax)" }} />
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate font-bold"
                    style={{
                      fontSize: "var(--t-title)",
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {PLACE_TYPE_LABELS[t.type]}
                  </span>
                  <span className="index mt-1 block" style={{ color: "var(--dim)" }}>
                    도시 {t.cityCount} · 채널 {t.creatorCount}
                  </span>
                </span>
                <Index className="tnum shrink-0">{t.placeCount}곳</Index>
                <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
              </Link>
            </li>
          ))}
          <Rule />
        </ul>
      )}
    </main>
  );
}
