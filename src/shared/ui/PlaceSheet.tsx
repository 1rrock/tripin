"use client";

/**
 * 핀 상세 — 지도에서 핀을 눌렀을 때 나오는 내용.
 *
 * 훅(포커스 트랩·Escape 처리)을 쓰지만, 이 컴포넌트는 항상 이미 클라이언트
 * 컴포넌트(Explorer, CityExplorer) 안에서만 렌더된다 — 즉 서버→클라이언트
 * 경계를 이 파일이 새로 여는 게 아니라서 "use client" 가 안전하다.
 *
 * 모바일은 화면 하단 고정 시트, 데스크톱은 지도 패널 안쪽 하단이다. 그래서 호출부는
 * 이 컴포넌트를 **지도를 감싼 relative 컨테이너 안**에 놓아야 한다(데스크톱 absolute 기준).
 *
 * 지도 위 말풍선(InfoWindow)을 쓰지 않는 이유: 여기 들어갈 것이 요약 불릿·출처 영상
 * 여러 개·아웃링크 두 개라 말풍선 폭에 안 들어가고, 구글이 그리는 요소라 이 월드의
 * 문법(각진 프레임·왁스 표시)을 입힐 수 없다.
 *
 * 시트는 밝은 면(--sheet)이다. 웜 페이퍼 월드에서 --paper 는 잉크이므로
 * 시트 배경에 쓰지 않는다. 데스크톱에서는 라이트박스(지도) 위에 놓인다.
 */

import { useEffect, useRef, useState } from "react";
import { Avatar, Frame } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { Icon } from "@/shared/ui/icons";
import { OutboundA } from "@/shared/ui/OutboundA";
import { ListButton, SaveButton } from "@/shared/ui/SaveButton";
import { SummaryBlock } from "@/shared/ui/SummaryBlock";
import { useLocale } from "@/shared/i18n/LocaleContext";
import type { SummaryDisplay } from "@/shared/i18n/display";

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
  /** places.id — 하트(저장)가 이 값으로 저장한다 */
  id: string;
  name: string;
  nameLocal: string | null;
  typeLabel: string;
  address: string | null;
  /** 로케일 + en_source 로 이미 판정된 표시 결과 — `shared/i18n/display.ts` 의 `displaySummary`. */
  summary: SummaryDisplay;
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
  const { messages: m, t } = useLocale();
  const hero = place.sources[0] ?? null;
  const containerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  /* 호출부가 onClose 로 인라인 화살표를 넘긴다 — 매 렌더마다 새 정체성이라
     이걸 이펙트 의존성으로 쓰면 부모가 리렌더될 때마다(담기·복사 등) 이펙트가
     다시 돌아 포커스를 빼앗는다. 최신 값은 ref 로 들고, 이펙트는 안 묶는다. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  /**
   * 이 시트는 모바일에서만 모달이다.
   * `lg` 이상에서는 지도 패널 **안쪽**에 absolute 로 앉고 좌측 장소 목록이 그대로
   * 조작 가능하다. 그 상태에서 `aria-modal="true"` 는 "바깥은 전부 불활성"이라는
   * 거짓말이고, Tab 트랩은 키보드 사용자를 시트 안에 가둬 Escape 로만 나가게 만든다.
   */
  const [isModal, setIsModal] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const sync = () => setIsModal(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* 열릴 때 한 번만 — 마운트 이후 재실행되면 포커스를 빼앗는다 */
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      /* 트랩은 모달일 때만 — 데스크톱에서는 목록으로 Tab 해 나갈 수 있어야 한다 */
      if (!isModal || e.key !== "Tab" || !containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModal]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal={isModal ? "true" : undefined}
      aria-label={t(m.map.detailAria, { name: place.name })}
      className="rise-in on-lightbox fixed inset-x-0 bottom-0 z-40 max-h-[78dvh] overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:absolute lg:inset-y-4 lg:right-4 lg:left-auto lg:w-[min(460px,calc(100vw-520px))] lg:max-h-none lg:p-5"
      style={{
        background: "var(--sheet)",
        color: "var(--paper)",
        borderRadius: "var(--r-control)",
        boxShadow: "var(--lift)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2
            className="font-black"
            style={{
              fontSize: "var(--t-screen)",
              letterSpacing: "-0.035em",
              lineHeight: 1.2,
            }}
          >
            {place.name}
          </h2>
          <p className="mt-1.5" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
            {place.typeLabel}
            {place.nameLocal ? (
              <>
                {" · "}
                <span lang="ja">{place.nameLocal}</span>
              </>
            ) : null}
          </p>
          {place.address ? (
            <p className="mt-1" style={{ fontSize: "var(--t-meta)", color: "var(--dim)" }}>
              {place.address}
            </p>
          ) : null}
        </div>

        {/* 하트·그룹은 닫기 왼쪽 — 닫기가 오른쪽 끝이라는 위치를 흔들지 않는다 */}
        <ListButton placeId={place.id} placeName={place.name} className="size-8" />
        <SaveButton placeId={place.id} placeName={place.name} className="size-8" />

        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label={m.map.closeDetail}
          className="grid size-8 shrink-0 cursor-pointer place-items-center"
          style={{
            borderRadius: "var(--r-frame)",
            boxShadow: "inset 0 0 0 1px var(--hairline)",
          }}
        >
          <Icon.close className="size-4" style={{ color: "var(--paper)" }} />
        </button>
      </div>

      {hero ? (
        <OutboundA
          href={youtubeUrl(hero.youtubeId, hero.timestampSec)}
          title={hero.videoTitle}
          className="mt-4 block"
        >
          <Frame className="block w-full">
            <Thumb key={hero.youtubeId} youtubeId={hero.youtubeId} alt={hero.videoTitle} eager />
          </Frame>
          <span className="mt-2 block text-[13px] font-medium leading-snug">
            {hero.videoTitle}
          </span>
        </OutboundA>
      ) : null}

      <SummaryBlock className="mt-4" display={place.summary} dimColor="var(--dim)" />

      {place.mapUrl ? (
        <OutboundA
          href={place.mapUrl}
          className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 font-bold"
          style={{
            fontSize: "var(--t-body)",
            borderRadius: "var(--r-frame)",
            background: "var(--paper)",
            color: "var(--sheet)",
          }}
        >
          <Icon.out className="size-4" />
          {m.map.openInMapApp}
        </OutboundA>
      ) : null}

      {/* 출처 — 여러 채널이 같은 곳을 갔으면 전부 보여준다.
          유튜브로 돌아가는 링크를 가리지 않는 것은 정책 요건이다(LEGAL.md 4.5-(3)) */}
      <div className="mt-5 flex flex-col gap-3">
        {place.sources.map((s, i) => (
          <OutboundA
            key={`${s.youtubeId}-${i}`}
            href={youtubeUrl(s.youtubeId, s.timestampSec)}
            title={s.videoTitle}
            className="flex gap-3"
          >
            <Frame className="w-[120px] shrink-0">
              <Thumb key={s.youtubeId} youtubeId={s.youtubeId} alt={s.videoTitle} eager={i === 0} />
            </Frame>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <Avatar
                  initials={s.initials}
                  accent={s.accentColor}
                  src={s.avatarUrl}
                  size={20}
                />
                <span className="truncate text-[12px] font-semibold">{s.creatorName}</span>
              </span>
              <span className="mt-1 block text-[13px] leading-snug font-medium">
                {s.videoTitle}
              </span>
              <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-(--wax)">
                <Icon.play className="size-3.5" />
                {s.timestampSec !== null
                  ? t(m.common.watchAt, { ts: fmt(s.timestampSec) })
                  : m.common.watchVideo}
              </span>
            </span>
          </OutboundA>
        ))}
      </div>
    </div>
  );
}
