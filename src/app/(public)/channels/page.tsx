import type { Metadata } from "next";
import Link from "next/link";
import { loadHomeFeed } from "@/shared/api/home";
import { Avatar, Chip, Icon, Index, Rule } from "@/shared/ui/frame";

/**
 * 채널 목록 — 기존 축(유튜버부터 고르기)의 전용 입구.
 *
 * 홈 하단에도 같은 목록이 있지만 거기는 영상 시트에 딸린 꼬리다. 메뉴에서
 * "채널"을 눌러 온 사람에게는 채널이 화면의 본문이어야 한다.
 *
 * 로더는 홈과 같은 것을 쓴다 — 공개 게이트 판정이 한 곳에만 있어야 두 화면이
 * 다른 채널 집합을 보여주는 사고가 안 난다.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "채널 목록 — 여행 유튜버별 맛집 지도",
  description:
    "채널을 고르면 그 여행 유튜버가 다녀간 도시와 맛집·명소 지도가 열립니다. 모든 장소에 출처 영상 링크가 있습니다.",
};

export default async function ChannelsPage() {
  const { creators, totals } = await loadHomeFeed();

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <header className="flex flex-col gap-3.5">
        <h1
          className="font-black"
          style={{ fontSize: "var(--t-display)", letterSpacing: "-0.045em", lineHeight: 1.12 }}
        >
          누구 따라갈까요?
        </h1>
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          채널 {totals.creators} · 간 곳 {totals.places} · 도시 {totals.cities}
        </p>
      </header>

      {creators.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>
          아직 공개된 채널이 없어요.
        </p>
      ) : (
        <ul className="md:grid md:grid-cols-2 md:gap-x-(--block)">
          {creators.map((c) => (
            <li key={c.slug}>
              <Rule />
              <Link
                href={`/c/${c.slug}`}
                className="flex items-center gap-3.5 py-4"
                aria-label={`${c.displayName} 채널 열기 — 간 곳 ${c.placeCount}곳`}
              >
                <Avatar
                  initials={c.initials}
                  accent={c.accentColor}
                  src={c.avatarUrl}
                  size={42}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate font-bold"
                    style={{ fontSize: "var(--t-title)", letterSpacing: "-0.025em" }}
                  >
                    {c.displayName}
                  </span>
                  <span
                    className="mt-1 block truncate"
                    style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                  >
                    {c.cities.map((x) => x.name).join(" · ")}
                  </span>
                </span>
                <Index className="tnum shrink-0">{c.placeCount}곳</Index>
                <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
              </Link>

              {/* 도시로 바로 — 채널 허브를 한 단계 건너뛴다 */}
              {c.cities.length > 1 ? (
                <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) pb-4 md:mx-0 md:flex-wrap md:px-0">
                  {c.cities.map((city) => (
                    <Chip key={city.slug} href={`/c/${c.slug}/${city.slug}`}>
                      {city.name}
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
