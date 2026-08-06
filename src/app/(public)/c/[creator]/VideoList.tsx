"use client";

/**
 * 채널의 영상 목록 — 상호명·제목 검색 + 도시·유형 필터. 홈과 같은 시트 문법.
 *
 * 채널 표식(아바타·채널명)은 넘기지 않는다 — 이미 채널 화면 안이라 매 칸에
 * 같은 이름이 반복될 뿐이다. 그 자리는 도시가 가져간다.
 *
 * 전부 클라이언트 필터라 API 호출이 없다 — YouTube `search.list` 는 100 units 라
 * 런타임 검색에 쓸 수 없다(INGEST.md).
 */

import { useId, useMemo, useState } from "react";
import type { PlaceType } from "@/shared/api/database.types";
import type { VideoSummary } from "@/shared/api/videos";
import { Chip, Icon } from "@/shared/ui/frame";
import { PLACE_TYPE_LABELS } from "@/shared/ui/place-types";
import { VideoSheet } from "@/shared/ui/VideoSheet";

const DEVELOP_LIMIT = 6;

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
  const searchId = useId();

  const allCities = useMemo(() => [...new Set(videos.flatMap((v) => v.cities))].sort(), [videos]);
  const allTypes = useMemo(() => [...new Set(videos.flatMap((v) => v.types))], [videos]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return videos.filter((v) => {
      if (city && !v.cities.includes(city)) return false;
      if (type && !v.types.includes(type)) return false;
      if (!needle) return true;
      // 상호명까지 훑는다 — 방문자는 영상 제목이 아니라 가게 이름을 기억한다
      return (
        v.title.toLowerCase().includes(needle) ||
        v.placeNames.some((n) => n.toLowerCase().includes(needle))
      );
    });
  }, [videos, q, city, type]);

  const filtered = Boolean(q.trim() || city || type);
  const clearAll = () => {
    setQ("");
    setCity(null);
    setType(null);
  };

  return (
    <div className="flex flex-col gap-(--stack)">
      <label
        htmlFor={searchId}
        className="flex items-center gap-2.5 px-3.5 py-3"
        style={{
          borderRadius: "var(--r-control)",
          background: "var(--sheet)",
          boxShadow: "inset 0 0 0 1px var(--hairline)",
        }}
      >
        <span className="sr-only">가게 이름·영상 제목 검색</span>
        <Icon.search className="size-[18px] shrink-0" style={{ color: "var(--dim)" }} />
        <input
          id={searchId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="가게 이름·영상 제목으로 찾기"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full bg-transparent outline-none placeholder:text-[color:var(--dim)]"
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

      {filtered ? (
        <div className="flex items-baseline justify-between gap-3">
          <p className="index tnum" style={{ color: "var(--dim)" }}>
            찾은 영상 {shown.length} / {videos.length}
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="cursor-pointer underline underline-offset-4"
            style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}
          >
            필터 지우기
          </button>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p style={{ fontSize: "var(--t-body)" }}>조건에 맞는 영상이 없어요.</p>
          <Chip onClick={clearAll}>필터 지우기</Chip>
        </div>
      ) : (
        <ul
          key={`${q}|${city}|${type}`}
          className="grid grid-cols-1 gap-(--block) md:grid-cols-2 xl:grid-cols-3"
        >
          {shown.map((v, i) => (
            <VideoSheet
              key={v.youtubeId}
              video={v}
              href={`/c/${creatorSlug}/v/${v.youtubeId}`}
              i={i}
              animate={i < DEVELOP_LIMIT}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
