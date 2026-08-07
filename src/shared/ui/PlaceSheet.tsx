/**
 * 핀 상세 — 지도에서 핀을 눌렀을 때 나오는 내용.
 *
 * "use client" 를 붙이지 않는다 — 훅이 없어서 클라이언트 경계 안에서 렌더되기만 하면
 * 되고, 붙이면 이 파일이 클라이언트 진입점이 되어 onClose 같은 함수 prop 이
 * 직렬화 대상으로 검사된다.
 *
 * 모바일은 화면 하단 고정 시트, 데스크톱은 지도 패널 안쪽 하단이다. 그래서 호출부는
 * 이 컴포넌트를 **지도를 감싼 relative 컨테이너 안**에 놓아야 한다(데스크톱 absolute 기준).
 *
 * 지도 위 말풍선(InfoWindow)을 쓰지 않는 이유: 여기 들어갈 것이 요약 불릿·출처 영상
 * 여러 개·아웃링크 두 개라 말풍선 폭에 안 들어가고, 구글이 그리는 요소라 이 월드의
 * 문법(각진 프레임·왁스 표시)을 입힐 수 없다.
 *
 * 시트는 밝은 면(--paper)이다. 어두운 지면 위에서 가장 강한 강조는 반전이고,
 * 데스크톱에서는 라이트박스(지도) 위에 놓이므로 지도와도 같은 층으로 읽힌다.
 */

import { Avatar, Icon } from "@/shared/ui/frame";

export interface SheetSource {
  creatorSlug: string;
  creatorName: string;
  initials: string;
  accentColor: string;
  avatarUrl?: string | null;
  youtubeId: string;
  videoTitle: string;
  timestampSec: number | null;
}

export interface SheetPlace {
  name: string;
  nameLocal: string | null;
  typeLabel: string;
  address: string | null;
  summary: string | null;
  summaryBullets: string[];
  priceHint: string | null;
  mapUrl: string | null;
  sources: SheetSource[];
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

export function PlaceSheet({
  place,
  index,
  onClose,
}: {
  place: SheetPlace;
  /** 지도 핀 번호 — 어느 핀을 눌렀는지 눈으로 잇는다 */
  index: number;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={`${place.name} 상세`}
      className="rise-in on-lightbox fixed inset-x-0 bottom-0 z-40 max-h-[62dvh] overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:absolute lg:inset-x-3 lg:bottom-3 lg:max-h-[46%] lg:pb-4"
      style={{
        background: "var(--paper)",
        color: "var(--lightbox-ink)",
        borderRadius: "var(--r-control)",
        boxShadow: "var(--lift)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="index tnum grid size-7 shrink-0 place-items-center"
          style={{
            borderRadius: "var(--r-frame)",
            background: "var(--wax)",
            color: "var(--ground)",
          }}
        >
          {index}
        </span>

        <div className="min-w-0 flex-1">
          <h2
            className="font-black"
            style={{
              fontSize: "var(--t-title)",
              letterSpacing: "-0.03em",
              lineHeight: 1.3,
            }}
          >
            {place.name}
          </h2>
          <p
            className="mt-1"
            style={{ fontSize: "var(--t-meta)", color: "var(--lightbox-dim)" }}
          >
            {place.typeLabel}
            {place.nameLocal ? (
              <>
                {" · "}
                <span lang="ja">{place.nameLocal}</span>
              </>
            ) : null}
          </p>
          {place.address ? (
            <p
              className="mt-0.5"
              style={{
                fontSize: "var(--t-meta)",
                color: "var(--lightbox-dim)",
              }}
            >
              {place.address}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="상세 닫기"
          className="grid size-8 shrink-0 cursor-pointer place-items-center"
          style={{
            borderRadius: "var(--r-frame)",
            boxShadow: "inset 0 0 0 1px var(--lightbox-edge)",
          }}
        >
          <Icon.close
            className="size-4"
            style={{ color: "var(--lightbox-ink)" }}
          />
        </button>
      </div>

      {place.summaryBullets.length > 0 ? (
        <ul
          className="mt-3 flex flex-col gap-1.5 pl-10"
          style={{ fontSize: "var(--t-body)", lineHeight: 1.6 }}
        >
          {place.summaryBullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden style={{ color: "var(--lightbox-dim)" }}>
                ·
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : place.summary ? (
        <p
          className="mt-3 pl-10"
          style={{ fontSize: "var(--t-body)", lineHeight: 1.6 }}
        >
          {place.summary}
        </p>
      ) : null}
      {place.priceHint ? (
        <p
          className="mt-2 pl-10"
          style={{ fontSize: "var(--t-meta)", color: "var(--lightbox-dim)" }}
        >
          {place.priceHint}
        </p>
      ) : null}

      {/* 출처 — 여러 채널이 같은 곳을 갔으면 전부 보여준다. 도시 교차 진입의 값이 여기 있다.
          유튜브로 돌아가는 링크를 가리지 않는 것은 정책 요건이다(LEGAL.md 4.5-(3)) */}
      <div className="mt-4 flex flex-col gap-2 pl-10">
        {place.sources.map((s, i) => (
          <div
            key={`${s.youtubeId}-${i}`}
            className="flex flex-wrap items-center gap-2"
          >
            <Avatar
              initials={s.initials}
              accent={s.accentColor}
              src={s.avatarUrl}
              size={22}
            />
            <span
              className="min-w-0 flex-1 truncate"
              style={{ fontSize: "var(--t-meta)", fontWeight: 500 }}
            >
              {s.creatorName}
            </span>
            <a
              href={youtubeUrl(s.youtubeId, s.timestampSec)}
              target="_blank"
              rel="noopener noreferrer"
              title={s.videoTitle}
              className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5"
              style={{
                fontSize: "var(--t-meta)",
                fontWeight: 500,
                borderRadius: "var(--r-control)",
                boxShadow: "inset 0 0 0 1px var(--lightbox-edge)",
              }}
            >
              <Icon.play className="size-3.5" />
              {s.timestampSec !== null
                ? `영상 ${fmt(s.timestampSec)}`
                : "영상 보기"}
            </a>
          </div>
        ))}

        {place.mapUrl ? (
          <div className="mt-1">
            {/* Act 은 어두운 지면 기준 색이라 밝은 시트 위에서는 직접 그린다 */}
            <a
              href={place.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 font-bold"
              style={{
                fontSize: "var(--t-meta)",
                borderRadius: "var(--r-frame)",
                background: "var(--ground)",
                color: "var(--paper)",
              }}
            >
              <Icon.out className="size-4" />
              지도 앱에서 열기
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
