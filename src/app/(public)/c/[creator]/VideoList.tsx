"use client";

/**
 * 채널의 영상 목록 — 제목 검색 + 지역·타입 필터. 공항 사인 시스템.
 *
 * 채널이 1개뿐인 지금은 홈의 채널 검색보다 이 화면의 검색이 실질적이다
 * (영상 16편 × 도시 7곳 × 타입 5종). 전부 클라이언트 필터라 API 호출이 없다 —
 * YouTube `search.list` 는 100 units 라 런타임 검색에 쓸 수 없다(INGEST.md).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlaceType } from "@/shared/api/database.types";
import type { VideoSummary } from "@/shared/api/videos";
import { Box, Card, Chip, DataRow, Divider, Icon } from "@/shared/ui/sign";
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

  const allCities = useMemo(() => [...new Set(videos.flatMap((v) => v.cities))].sort(), [videos]);
  const allTypes = useMemo(() => [...new Set(videos.flatMap((v) => v.types))], [videos]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return videos.filter((v) => {
      if (needle && !v.title.toLowerCase().includes(needle)) return false;
      if (city && !v.cities.includes(city)) return false;
      if (type && !v.types.includes(type)) return false;
      return true;
    });
  }, [videos, q, city, type]);

  const clearAll = () => {
    setQ("");
    setCity(null);
    setType(null);
  };

  return (
    <div className="flex flex-col gap-(--stack)">
      <label
        className="flex items-center gap-3 p-(--card-pad)"
        style={{
          border: "var(--stroke-card) solid var(--hairline)",
          borderRadius: "var(--r-field)",
        }}
      >
        <span className="sr-only">영상 제목 검색</span>
        <Icon.search
          aria-hidden
          style={{
            width: "var(--icon-field)",
            height: "var(--icon-field)",
            fill: "var(--ink)",
            flex: "none",
          }}
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="영상 제목으로 찾기"
          className="w-full bg-transparent text-ink outline-none placeholder:opacity-50"
          style={{ fontSize: "var(--t-body)" }}
        />
      </label>

      {allCities.length > 1 ? (
        <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
          <Chip active={city === null} onClick={() => setCity(null)}>
            전체 도시
          </Chip>
          {allCities.map((c) => (
            <Chip key={c} active={city === c} onClick={() => setCity(city === c ? null : c)}>
              {c}
            </Chip>
          ))}
        </div>
      ) : null}

      {allTypes.length > 1 ? (
        <div className="no-scrollbar -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) lg:mx-0 lg:flex-wrap lg:px-0">
          <Chip active={type === null} onClick={() => setType(null)}>
            전체 종류
          </Chip>
          {allTypes.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>
              {PLACE_TYPE_LABELS[t]}
            </Chip>
          ))}
        </div>
      ) : null}

      <p className="tnum" style={{ fontSize: "var(--t-meta)" }}>
        영상 <b className="font-bold">{shown.length}</b>
        {shown.length !== videos.length ? ` / ${videos.length}` : ""}편
      </p>

      {shown.length === 0 ? (
        <div
          className="flex flex-col items-start gap-3 p-(--card-pad)"
          style={{
            border: "var(--stroke-card) dashed var(--hairline)",
            borderRadius: "var(--r-card)",
          }}
        >
          <p style={{ fontSize: "var(--t-body)" }}>조건에 맞는 영상이 없어요.</p>
          <Chip onClick={clearAll}>필터 지우기</Chip>
        </div>
      ) : (
        <ol className="flex flex-col gap-(--stack)">
          {shown.map((v) => (
            <Card as="li" key={v.youtubeId} className="flex flex-col gap-(--card-pad)">
              <Link
                href={`/c/${creatorSlug}/v/${v.youtubeId}`}
                className="flex items-center gap-4"
                aria-label={`${v.title} 타임라인 열기`}
              >
                <Box icon="play" size="card" />
                <span className="min-w-0 flex-1">
                  <span className="block" style={{ fontSize: "var(--t-body)" }}>
                    영상
                  </span>
                  <span
                    className="block font-bold"
                    style={{
                      fontSize: "var(--t-title)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.28,
                    }}
                  >
                    {v.title}
                  </span>
                  {v.cities.length ? (
                    <span className="block" style={{ fontSize: "var(--t-meta)" }}>
                      {v.cities.join(" · ")}
                    </span>
                  ) : null}
                </span>
                <Icon.chevron
                  aria-hidden
                  style={{
                    width: "var(--icon-chevron)",
                    height: "var(--icon-chevron)",
                    fill: "var(--ink)",
                    flex: "none",
                  }}
                />
              </Link>

              <Divider />

              <DataRow
                items={[
                  { label: "나온 곳", value: String(v.stopCount) },
                  { label: "마지막", value: fmt(v.lastStopSec) },
                ]}
              />
            </Card>
          ))}
        </ol>
      )}
    </div>
  );
}
