"use client";

/**
 * 채널의 영상 목록 — 제목 검색 + 지역·타입 필터.
 *
 * 채널이 1개뿐인 지금은 홈의 채널 검색보다 이 화면의 검색이 실질적이다
 * (영상 16편 × 도시 7곳 × 타입 5종). 전부 클라이언트 필터라 API 호출이 없다 —
 * YouTube `search.list` 는 100 units 라 런타임 검색에 쓸 수 없다(INGEST.md).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlaceType } from "@/shared/api/database.types";
import type { VideoSummary } from "@/shared/api/videos";
import { PLACE_TYPE_LABELS } from "@/shared/ui/place-types";

function fmt(sec: number | null): string {
  if (sec === null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoList({
  videos,
  creatorSlug,
}: {
  videos: VideoSummary[];
  creatorSlug: string;
}) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [type, setType] = useState<PlaceType | null>(null);

  const allCities = useMemo(
    () => [...new Set(videos.flatMap((v) => v.cities))].sort(),
    [videos],
  );
  const allTypes = useMemo(
    () => [...new Set(videos.flatMap((v) => v.types))],
    [videos],
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return videos.filter((v) => {
      if (needle && !v.title.toLowerCase().includes(needle)) return false;
      if (city && !v.cities.includes(city)) return false;
      if (type && !v.types.includes(type)) return false;
      return true;
    });
  }, [videos, q, city, type]);

  const chip = (label: string, on: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center rounded-full px-4 text-[13px] font-bold transition active:scale-[0.97] ${
        on ? "bg-ink text-paper" : "bg-fill hover:bg-line"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <label className="block">
        <span className="sr-only">영상 제목 검색</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="영상 제목으로 찾기"
          className="h-12 w-full rounded-full border border-line bg-card px-5 text-[15px] text-ink outline-none transition placeholder:text-ink-soft focus:border-ink"
        />
      </label>

      {allCities.length > 1 ? (
        <div className="no-scrollbar -mx-6 mt-4 flex gap-2.5 overflow-x-auto px-6 md:-mx-8 md:px-8 lg:mx-0 lg:flex-wrap lg:px-0">
          {chip("전체 도시", city === null, () => setCity(null))}
          {allCities.map((c) => chip(c, city === c, () => setCity(city === c ? null : c)))}
        </div>
      ) : null}

      {allTypes.length > 1 ? (
        <div className="no-scrollbar -mx-6 mt-3 flex gap-2.5 overflow-x-auto px-6 md:-mx-8 md:px-8 lg:mx-0 lg:flex-wrap lg:px-0">
          {chip("전체 종류", type === null, () => setType(null))}
          {allTypes.map((t) =>
            chip(PLACE_TYPE_LABELS[t], type === t, () => setType(type === t ? null : t)),
          )}
        </div>
      ) : null}

      <p className="tnum mt-5 text-[13px] text-ink-soft">
        영상 <b className="font-bold text-ink">{shown.length}</b>
        {shown.length !== videos.length ? ` / ${videos.length}` : ""}편
      </p>

      {shown.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line py-14 text-center text-sm text-ink-soft">
          조건에 맞는 영상이 없어요.
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCity(null);
              setType(null);
            }}
            className="mt-3 block w-full cursor-pointer text-[13px] font-bold text-ink underline underline-offset-4"
          >
            필터 지우기
          </button>
        </div>
      ) : (
        <ol className="mt-3">
          {shown.map((v) => (
            <li key={v.youtubeId} className="border-b border-line last:border-b-0">
              {/* 행 전체를 넉넉한 패딩으로 — 영상 고르기 터치 타깃 */}
              <Link
                href={`/c/${creatorSlug}/v/${v.youtubeId}`}
                className="group block py-5 transition"
              >
                <div className="flex items-start gap-3.5">
                  <span className="tnum mt-0.5 shrink-0 rounded-md bg-fill px-2.5 py-1.5 text-[12px] font-bold text-ink-soft">
                    {fmt(v.lastStopSec)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] leading-snug font-bold group-hover:underline">
                      {v.title}
                    </h3>
                    <p className="tnum mt-1.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-soft">
                      <span>
                        나온 곳 <b className="font-bold text-ink">{v.stopCount}</b>곳
                      </span>
                      {v.cities.length ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{v.cities.join(", ")}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
