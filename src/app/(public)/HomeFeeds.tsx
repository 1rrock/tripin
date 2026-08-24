/**
 * 홈 본문 섹션 — 도시 다음으로 깔리는 네 덩어리.
 * 연예인 스팟 · 최근 영상 · 채널 롤 · 조각(채널×도시).
 * 서버 컴포넌트. 썸네일은 HTML 에 바로 실려 LCP 가 JS 를 기다리지 않는다.
 *
 * 매거진 리듬(2026-08 리디자인 A안): 같은 썸네일 레일이 세 번 반복되던 걸
 * 섹션마다 카드 문법을 다르게 바꿨다 — 연예인은 커버스토리(대형 1+그리드 4),
 * 영상은 와이드 레일, 채널은 아바타 스트립, 조각은 이미지 없는 넘버드 리스트.
 * 스크롤마다 밀도가 바뀌어야 "편집된 페이지"로 읽힌다(Infatuation 크기 위계).
 *
 * ⚠️ 커버 카드도 썸네일 위에 글자·그라데이션을 얹지 않는다 — 오버레이 금지
 *    (YouTube 정책 §III.E.3, Thumb.tsx 주석). 텍스트는 항상 이미지 밖에 둔다.
 */

import Link from "next/link";
import type { FeedCelebritySpot, FeedCreator, FeedPiece, FeedVideo } from "@/shared/api/home";
import type { Locale } from "@/shared/i18n/config";
import type { Messages } from "@/shared/i18n/messages/ko";
import { t } from "@/shared/i18n/get-dictionary";
import { localePath } from "@/shared/i18n/paths";
import { displayCityName, displayPlaceName } from "@/shared/i18n/display";
import { placePath } from "@/shared/lib/place-path";
import { Frame, Avatar, Index } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";
import { CoverThumb } from "@/shared/ui/CoverThumb";

const VIDEOS = 8;
const PIECES = 8;

type LocaleProps = {
  locale: Locale;
  messages: Messages;
};

function Head({
  id,
  title,
  moreHref,
  moreLabel,
}: {
  id: string;
  title: string;
  /** 없으면 제목만 — 연예인 레일처럼 v1 에 더보기 목적지가 없는 섹션용 */
  moreHref?: string;
  moreLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-(--gutter)">
      <span className="flex items-center gap-2">
        {/* 킥커 바는 늘 중성이다. 예전엔 연예인 섹션만 밀랍색이었는데, 산호는
            "핀"이라 섹션 머리마다 켜지면 강조가 강조를 취소한다(PRODUCT.md).
            홈에서 산호를 쓰는 자리는 히어로 핀·제목 강조·커버 배지뿐이다. */}
        <span aria-hidden className="h-[3px] w-[18px]" style={{ background: "var(--paper)" }} />
        <h2 id={id} className="text-xl font-bold tracking-[-0.03em] lg:text-2xl">
          {title}
        </h2>
      </span>
      {moreHref && moreLabel ? (
        <Link
          href={moreHref}
          className="text-[13px] font-medium text-(--dim) hover:text-(--paper)"
        >
          {moreLabel}
        </Link>
      ) : null}
    </div>
  );
}

/** 넘버드 리스트·카드의 오른쪽 화살촉 — 장식이 아니라 "행 전체가 링크"라는 신호 */
function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[14px] shrink-0"
      aria-hidden
      fill="none"
      stroke="var(--edge)"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/**
 * 연예인이 간 장소 — 홈의 커버스토리. 카드 단위는 장소다(인물 단위면 바로
 * 아래 채널 롤과 같은 물건이 된다). 배지의 인물은 채널 주인일 수도(성시경),
 * 남의 영상이 언급한 제3자일 수도(백종원) 있다. v1 은 더보기 없음.
 *
 * 대형 1장 + 소형 4장 — 로더의 라운드로빈이 커버를 매번 다른 인물의 최신
 * 장소로 갈아 끼우므로 큐레이션 손이 따로 들지 않는다.
 */
export function CelebrityFeed({
  spots,
  locale,
  messages: m,
}: { spots: FeedCelebritySpot[] } & LocaleProps) {
  const href = (path: string) => localePath(path, locale);
  const person = (s: FeedCelebritySpot) =>
    locale === "ko" ? s.personName : (s.personNameEn ?? s.personName);
  /* 장소명은 앱의 다른 29곳과 같은 규칙으로 고른다 — 원본 `name` 을 그대로
     그리면 `/en` 홈만 한글 상호를, 같은 장소의 `/en/place/…` 는 현지어를 보인다. */
  const place = (s: FeedCelebritySpot) =>
    displayPlaceName(
      { name: s.placeName, nameLocal: s.placeNameLocal, nameEn: s.placeNameEn },
      locale,
    );
  // 커버 로테이션은 로더(home.ts)가 한다 — 여기선 첫 장이 곧 오늘의 표지다.
  const [cover, ...rest] = spots;
  if (!cover) return null;
  const grid = rest.slice(0, 4);

  return (
    <section aria-labelledby="celeb-h" className="pt-8 lg:pt-12">
      <Head
        id="celeb-h"
        title={m.home.celebHeading}
        moreHref={href("/celebs")}
        moreLabel={m.home.moreFeed}
      />
      <div className="mt-4 px-(--gutter) lg:grid lg:grid-cols-2 lg:gap-6">
        <Link
          href={href(placePath(cover.placeSlug))}
          className="block active:scale-[0.99]"
        >
          <Frame className="block w-full">
            {/* maxres 는 영상에 따라 404 — CoverThumb 이 onError 로 mq 로 물러난다 */}
            <CoverThumb youtubeId={cover.cut.youtubeId} alt={cover.cut.title} />
          </Frame>
          <span className="mt-3 flex flex-col items-start gap-1.5">
            {/* 홈에서 산호로 **채우는** 면은 이 배지 하나뿐이다 — 오늘의 표지를
                가리키는 핀. 나머지 배지·순번·킥커는 중성으로 물러난다.
                `globals.css:12` 가 금지하는 "넓은 면 산호"의 유일한 예외로 이미
                합의된 자리라, 흡수하면서도 채움을 그대로 둔다(= `chip-wax`).

                컴포넌트(`Chip`)가 아니라 클래스를 쓰는 이유 하나뿐이다 —
                이 배지는 카드 전체를 덮는 `<Link>` 안에 있어서 `Chip` 이 내는
                `<button>`·`<a>` 를 넣으면 링크 안에 링크가 된다. 규격은 그대로
                `.chip*` 한 곳에서만 온다(직접 적는 padding·height 가 없다). */}
            <span className="chip chip-wax">
              {person(cover)} · {displayCityName(cover.city, locale)}
            </span>
            <span className="text-[22px] leading-tight font-black tracking-[-0.03em] lg:text-[26px]">
              {place(cover)}
            </span>
            <span className="line-clamp-1 text-[13px] text-(--dim)">{cover.cut.title}</span>
          </span>
        </Link>
        {grid.length > 0 ? (
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 lg:mt-0 lg:content-start">
            {grid.map((s) => (
              <li key={s.placeSlug} className="min-w-0">
                <Link href={href(placePath(s.placeSlug))} className="block active:scale-[0.99]">
                  <Frame className="block w-full">
                    <Thumb youtubeId={s.cut.youtubeId} alt={s.cut.title} />
                  </Frame>
                  <p className="mt-2 truncate text-[14px] font-semibold tracking-[-0.01em]">
                    {place(s)}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-(--dim)">
                    {person(s)} · {displayCityName(s.city, locale)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function VideoFeed({
  videos,
  locale,
  messages: m,
}: { videos: FeedVideo[] } & LocaleProps) {
  const href = (path: string) => localePath(path, locale);
  const list = videos.slice(0, VIDEOS);
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="videos-h" className="pt-8 lg:pt-12">
      <Head id="videos-h" title={m.home.recentVideos} moreHref={href("/map")} moreLabel={m.home.moreFeed} />
      <ul className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-(--gutter) pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {list.map((v) => {
          const place = v.placeNames[0];
          const rest = v.placeNames.slice(1, 3);
          const city = v.cities[0];
          return (
            <li key={v.youtubeId} className="w-[220px] shrink-0 lg:w-auto">
              <Link href={href(`/c/${v.creatorSlug}/v/${v.youtubeId}`)} className="block active:scale-[0.99]">
                <Frame className="block w-full">
                  <Thumb youtubeId={v.youtubeId} alt={v.title} />
                </Frame>
                <p className="mt-2.5 truncate text-[15px] font-semibold tracking-[-0.01em]">
                  {place ?? v.title}
                </p>
                {rest.length > 0 ? (
                  <p className="mt-0.5 truncate text-[13px] text-(--dim)">{rest.join(" · ")}</p>
                ) : null}
                <p className="mt-0.5 truncate text-[12px] text-(--dim)">
                  {[v.creatorName, city ? displayCityName(city, locale) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * 채널 — 아바타 스트립. 필름 롤(썸네일 4컷) 리스트는 /channels 로 물러났다:
 * 홈에서 영상·조각 섹션과 같은 썸네일 문법을 반복하면 페이지가 단조로워진다.
 * 여기서는 "사람"이라는 시각 언어(원형)만 세운다.
 */
export function ChannelFeed({
  creators,
  locale,
  messages: m,
}: { creators: FeedCreator[] } & LocaleProps) {
  const href = (path: string) => localePath(path, locale);
  if (creators.length === 0) return null;

  return (
    <section aria-labelledby="channels-h" className="pt-8 lg:pt-12">
      <Head
        id="channels-h"
        title={m.home.feedChannels}
        moreHref={href("/channels")}
        moreLabel={m.home.moreFeed}
      />
      <ul className="no-scrollbar mt-4 flex gap-4 overflow-x-auto px-(--gutter) pb-1 lg:gap-6">
        {creators.map((c) => (
          <li key={c.slug} className="w-[84px] shrink-0 lg:w-[92px]">
            <Link
              href={href(`/c/${c.slug}`)}
              aria-label={`${c.displayName} ${t(m.home.placesUnit, { n: c.placeCount })}`}
              className="flex flex-col items-center gap-1.5 active:scale-[0.98]"
            >
              <Avatar initials={c.initials} accent={c.accentColor} src={c.avatarUrl} size={56} />
              <span className="w-full truncate text-center text-[11px] font-bold tracking-[-0.01em]">
                {c.displayName}
              </span>
              <Index>{t(m.home.placesUnit, { n: c.placeCount })}</Index>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 조각(채널×도시) — 이미지 없는 넘버드 리스트. 홈의 마지막 섹션은 밀도를
 * 낮춰 호흡을 만든다(Infatuation 의 하단 텍스트 리스트 위계). 썸네일은 위
 * 두 섹션이 이미 충분히 보여줬고, 여기서 파는 건 "누가 어느 도시를 얼마나
 * 팠나"라는 사실 한 줄이다.
 */
export function PieceFeed({
  pieces,
  locale,
  messages: m,
}: { pieces: FeedPiece[] } & LocaleProps) {
  const href = (path: string) => localePath(path, locale);
  const list = pieces.slice(0, PIECES);
  if (list.length === 0) return null;

  return (
    <section aria-labelledby="pieces-h" className="pt-8 pb-4 lg:pt-12 lg:pb-6">
      <Head
        id="pieces-h"
        title={m.home.piecesHeading}
        moreHref={href("/map")}
        moreLabel={m.home.moreFeed}
      />
      <ol className="mt-2 px-(--gutter) lg:columns-2 lg:gap-10">
        {list.map((p, i) => (
          <li
            key={`${p.creatorSlug}:${p.city.slug}`}
            className="border-b border-(--hairline) last:border-b-0 lg:break-inside-avoid"
          >
            <Link
              href={href(`/c/${p.creatorSlug}/${p.city.slug}`)}
              className="flex items-center gap-3.5 py-3.5 active:bg-(--hover)"
            >
              {/* 순번은 서열이 아니라 자릿수다 — 08 개가 전부 산호면 목록 전체가
                  강조가 되어 정작 눌러야 할 것이 안 보인다. 중성으로 내린다. */}
              <span
                className="w-[26px] text-[15px] font-black tabular-nums"
                style={{ color: "var(--dim)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="text-[15px] font-bold tracking-[-0.01em]">
                  {displayCityName(p.city, locale)}
                </span>{" "}
                <span className="text-[13px] text-(--dim)">
                  {p.creatorName} · {t(m.home.placesUnit, { n: p.placeCount })}
                </span>
              </span>
              <Chevron />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
