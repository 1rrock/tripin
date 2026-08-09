import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTypeDetail, parsePlaceType } from "@/shared/api/place-types";
import { Act, Chip, Icon, Rule } from "@/shared/ui/frame";
import { PLACE_TYPE_LABELS } from "@/shared/ui/place-types";

/**
 * 종류 상세 — 해당 유형 장소를 도시별로 묶는다.
 *
 * 지도는 도시 페이지(`/city/[city]?type=`)에 맡긴다. 여기서는 종류 축 탐색·SEO.
 */
export const revalidate = 3600;

interface Params {
  type: string;
}

function youtubeUrl(videoId: string, sec: number | null): string {
  return `https://www.youtube.com/watch?v=${videoId}${sec !== null ? `&t=${Math.floor(sec)}s` : ""}`;
}

function fmt(sec: number | null): string {
  if (sec === null) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const type = parsePlaceType((await params).type);
  if (!type) return { title: "찾을 수 없는 페이지" };
  const data = await loadTypeDetail(type);
  if (!data) return { title: "찾을 수 없는 페이지" };
  const label = PLACE_TYPE_LABELS[type];
  const cities = data.groups
    .slice(0, 4)
    .map((g) => g.cityName)
    .join(", ");
  return {
    title: `여행 유튜버 ${label} ${data.placeCount}곳 — ${cities}`,
    description: `여행 유튜버가 다녀간 ${label} ${data.placeCount}곳 (${data.cityCount}개 도시). 각 장소마다 출처 영상과 지도 링크가 있습니다.`,
  };
}

export default async function TypeDetailPage({ params }: { params: Promise<Params> }) {
  const type = parsePlaceType((await params).type);
  if (!type) notFound();
  const data = await loadTypeDetail(type);
  if (!data) notFound();

  const label = PLACE_TYPE_LABELS[type];

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      <header className="flex flex-col gap-3">
        <nav className="index flex items-center gap-1.5" style={{ color: "var(--dim)" }}>
          <Link href="/" className="underline-offset-4 hover:underline">
            홈
          </Link>
          <Icon.chevron className="size-2.5" />
          <Link href="/type" className="underline-offset-4 hover:underline">
            종류
          </Link>
          <Icon.chevron className="size-2.5" />
          <span style={{ color: "var(--paper)" }}>{label}</span>
        </nav>

        <h1
          className="font-black"
          style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
        >
          {label}
        </h1>
        <p className="index tnum" style={{ color: "var(--dim)" }}>
          {data.placeCount}곳 · 도시 {data.cityCount}
        </p>
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)", lineHeight: 1.65 }}>
          도시를 누르면 그 도시 지도에서 {label}만 볼 수 있습니다.
        </p>
      </header>

      <div className="flex flex-col gap-(--block)">
        {data.groups.map((g) => (
          <section key={g.citySlug} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                className="font-bold"
                style={{ fontSize: "var(--t-title)", letterSpacing: "-0.025em" }}
              >
                {g.cityName}
                <span className="index tnum ml-2 font-normal" style={{ color: "var(--dim)" }}>
                  {g.places.length}곳
                </span>
              </h2>
              <Chip href={`/city/${g.citySlug}?type=${type}`}>
                지도에서 보기
              </Chip>
            </div>

            <ol>
              {g.places.map((place, i) => (
                <li key={place.id}>
                  <Rule />
                  <div className="flex flex-col gap-2.5 py-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="index tnum shrink-0 pt-0.5"
                        style={{ color: "var(--dim)", minWidth: "1.5rem" }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-bold"
                          style={{
                            fontSize: "var(--t-title)",
                            letterSpacing: "-0.025em",
                            lineHeight: 1.3,
                          }}
                        >
                          {place.name}
                        </p>
                        {place.nameLocal ? (
                          <p
                            className="mt-0.5"
                            lang="ja"
                            style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                          >
                            {place.nameLocal}
                          </p>
                        ) : null}
                        {place.address ? (
                          <p
                            className="mt-0.5"
                            style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
                          >
                            {place.address}
                          </p>
                        ) : null}
                        {place.summaryBullets.length > 0 ? (
                          <ul
                            className="mt-2 flex flex-col gap-1"
                            style={{ fontSize: "var(--t-body)", lineHeight: 1.6 }}
                          >
                            {place.summaryBullets.map((b, bi) => (
                              <li key={bi} className="flex gap-2">
                                <span aria-hidden style={{ color: "var(--dim)" }}>
                                  ·
                                </span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-9">
                      {place.sources.map((s, si) => (
                        <Act
                          key={`${s.youtubeId}-${si}`}
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
                          지도 열기
                        </Act>
                      ) : null}
                      {/* 첫 출처 채널의 조각으로 — 그 도시의 채널 지도 */}
                      {place.sources[0] ? (
                        <Chip href={`/c/${place.sources[0].creatorSlug}/${place.citySlug}`}>
                          채널 지도
                        </Chip>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
              <Rule />
            </ol>
          </section>
        ))}
      </div>

      <Link
        href="/type"
        className="index inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
        style={{ color: "var(--dim)" }}
      >
        <Icon.back className="size-3.5" />
        다른 종류 보기
      </Link>
    </main>
  );
}
