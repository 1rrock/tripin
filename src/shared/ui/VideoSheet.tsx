/**
 * 시트 한 칸 — 프레임(썸네일) + 캡션. 홈과 채널 허브가 같은 문법을 쓴다.
 *
 * 캡션의 위계가 이 컴포넌트의 요점이다:
 *   출처 한 줄(채널·도시) / **상호명**(헤드라인) / 영상 제목(출처)
 *
 * 처음에는 영상 제목이 헤드라인이었는데 실데이터로 뒤집었다. 방문자의 질문은
 * "그 가게 어디야"이고 답은 상호명이다. 게다가 썸네일에 이미 큰 글자가 박혀
 * 있어서 제목을 크게 쓰면 같은 말이 화면에 두 번 나온다.
 *
 * 영상 제목은 유튜브 원본 전문을 그대로 쓴다 — 작게 놓아도 "visible" 요건은
 * 충족하고, 요약·의역했다면 그때 §III.E.3 위반이다(LEGAL.md 4.5-(3)).
 */

import Link from "next/link";
import { Avatar, Frame, Icon } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

export interface SheetVideo {
  youtubeId: string;
  title: string;
  placeNames: string[];
  cities: string[];
  stopCount: number;
}

export interface SheetChannel {
  name: string;
  initials: string;
  accent: string;
  avatarUrl?: string | null;
}

export function VideoSheet({
  video,
  href,
  i = 0,
  large = false,
  channel,
  animate = true,
}: {
  video: SheetVideo;
  href: string;
  /** 계단식 등장 순번 */
  i?: number;
  /** 리드 프레임 — 데스크톱에서 좌우 2단이 되고 썸네일을 우선 로드한다 */
  large?: boolean;
  /** 채널 표식. 이미 채널 화면 안이면 넘기지 않는다(같은 이름이 매 칸 반복된다) */
  channel?: SheetChannel;
  animate?: boolean;
}) {
  const [first, ...more] = video.placeNames;
  const source = [channel?.name, video.cities[0]].filter(Boolean).join(" · ");

  return (
    <li
      className={animate ? "develop" : undefined}
      style={{ "--i": i } as React.CSSProperties}
    >
      <Link
        href={href}
        className={
          large
            ? "group grid gap-3.5 md:grid-cols-[3fr_2fr] md:items-center md:gap-7"
            : "group grid gap-3.5"
        }
        aria-label={`${first ?? video.title}${
          more.length ? ` 외 ${more.length}곳` : ""
        } — ${video.title}`}
      >
        <Frame className="transition-[box-shadow] duration-200 group-hover:shadow-[inset_0_0_0_1px_var(--edge)]">
          <Thumb youtubeId={video.youtubeId} alt={video.title} eager={large} />
        </Frame>

        <div className="flex flex-col gap-1.5">
          {source ? (
            <div className="flex items-center gap-2">
              {channel ? (
                <Avatar
                  initials={channel.initials}
                  accent={channel.accent}
                  src={channel.avatarUrl}
                  size={22}
                />
              ) : null}
              <span className="index truncate" style={{ color: "var(--dim)" }}>
                {source}
              </span>
            </div>
          ) : null}

          {/* 이 카드의 답. 왁스 핀은 "우리가 찾아내 지도에 찍은 것"이라는 표시다 */}
          <h3
            className="flex items-start gap-1.5 font-bold"
            style={{
              fontSize: large ? "var(--t-screen)" : "var(--t-title)",
              letterSpacing: "-0.03em",
              lineHeight: 1.3,
            }}
          >
            <Icon.pin
              className="mt-[0.18em] size-[0.82em] shrink-0"
              style={{ color: "var(--wax)" }}
            />
            <span>
              {first ?? video.title}
              {more.length > 0 ? (
                <span
                  className="tnum font-medium"
                  style={{ color: "var(--dim)" }}
                >
                  {" "}
                  +{more.length}곳
                </span>
              ) : null}
            </span>
          </h3>

          <p
            style={{
              fontSize: "var(--t-meta)",
              color: "var(--dim)",
              lineHeight: 1.55,
            }}
          >
            {video.title}
          </p>
        </div>
      </Link>
    </li>
  );
}
