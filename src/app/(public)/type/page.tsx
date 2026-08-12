import type { Metadata } from "next";
import type { CSSProperties } from "react";
import type { Locale } from "@/shared/i18n/config";
import Link from "next/link";
import { loadTypeIndex, type TypeRow } from "@/shared/api/place-types";
import { getDictionary, t } from "@/shared/i18n/get-dictionary";
import { displayCityName } from "@/shared/i18n/display";
import { getLocale, localePath } from "@/shared/i18n/locale";
import { Frame, Icon, Index, Rule } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

/**
 * 종류 인덱스 — 인화 기록표(원장) 행.
 *
 * 종류 하나가 한 줄이다: 대표 컷 + 이름 + 분포 막대 + 곳수.
 *
 * 왜 지역 인덱스(`/city`)의 필름 스트립을 그대로 쓰지 않았나 — **행 수와 분포**다.
 * 종류는 6줄뿐이고 맛집 104곳이 전체의 80%다(그다음이 8·7·4·3·3). 같은 무게의
 * 스트립 6개를 쌓으면 104곳과 3곳이 화면에서 똑같아 보인다. 여기서는 막대 폭이
 * 최대 종류를 100%로 잰 실제 비율이라, 쏠림이 숫자를 읽기 전에 먼저 보인다.
 *
 * 컷이 한 장인 이유도 데이터다. 종류를 넘나드는 영상이 많아서(한 편에 맛집·바·상점이
 * 같이 나온다) 컷을 4장씩 깔면 종류마다 같은 썸네일이 반복된다. 한 장이면 그 종류를
 * 가장 많이 다룬 편 하나만 걸린다 — 로더의 `recentVideos` 가 대표성순인 이유(place-types.ts).
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getDictionary(locale);
  return {
    title: m.typeIndex.title,
    description: m.typeIndex.blurb,
    alternates: {
      canonical: localePath("/type", locale),
      languages: { ko: "/type", en: "/en/type" },
    },
  };
}

export default async function TypeIndexPage() {
  const locale = await getLocale();
  const m = getDictionary(locale);
  const types = await loadTypeIndex();
  /* 반대 로케일의 라벨을 부제로 쓴다 — 지역 인덱스가 도시명으로 하는 것과 같은 장치
     (KO 화면은 "맛집 / FOOD", EN 화면은 "Food / 맛집"). 별도 라틴 표기 상수를 두면
     사전과 따로 놀다가 어긋난다 */
  const other = getDictionary(locale === "en" ? "ko" : "en");
  const max = types[0]?.placeCount ?? 1;

  return (
    <main className="flex flex-col gap-(--block) px-(--gutter) pt-2 pb-20">
      {/* 화면에는 안 보이지만 문서에는 남는 제목. 시각적 헤더는 걷어냈어도
          스크린리더의 목차와 검색엔진의 주제 신호는 있어야 한다.
          `title` 은 훅("뭐 볼래요?")이라 여기 쓰지 않는다 — `srHeading` 은 설명형이다. */}
      <h1 className="sr-only">{m.typeIndex.srHeading}</h1>

      {types.length === 0 ? (
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)" }}>{m.typeIndex.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {types.map((row, i) => (
            <TypeLedgerRow
              key={row.type}
              row={row}
              n={i}
              max={max}
              locale={locale}
              m={m}
              sub={other.placeTypes[row.type]}
            />
          ))}
          <Rule />
        </ul>
      )}
    </main>
  );
}

function TypeLedgerRow({
  row,
  n,
  max,
  locale,
  m,
  sub,
}: {
  row: TypeRow;
  n: number;
  max: number;
  locale: Locale;
  m: ReturnType<typeof getDictionary>;
  /** 반대 로케일 라벨 */
  sub: string;
}) {
  const label = m.placeTypes[row.type];
  const cut = row.recentVideos[0];
  const shown = row.cities.slice(0, 3);
  const rest = row.cities.length - shown.length;

  return (
    <li className="develop" style={{ "--i": n } as CSSProperties}>
      <Rule />
      <Link
        href={localePath(`/type/${row.type}`, locale)}
        className="roll -mx-2.5 flex items-center gap-3.5 rounded-(--r-control) px-2.5 py-(--stack)"
        aria-label={t(m.typeIndex.openType, {
          label,
          places: row.placeCount,
          cities: row.cityCount,
        })}
      >
        {cut ? (
          <Frame className="w-[104px] shrink-0 sm:w-[124px]">
            <Thumb youtubeId={cut.youtubeId} alt={cut.title} />
          </Frame>
        ) : null}

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className="font-black"
              style={{ fontSize: "var(--t-title)", letterSpacing: "-0.025em", lineHeight: 1.15 }}
            >
              {label}
            </span>
            {/* 이 자리에만 대문자를 준다. `.index` 클래스 전체에 걸면 채널명 같은
                고유명사까지 대문자가 된다(globals.css 주석) — 여기는 고정된 분류어뿐이다.
                EN 화면의 부제는 한글이라 이 속성이 아무 일도 하지 않는다 */}
            <Index style={{ textTransform: "uppercase" }}>{sub}</Index>
            <Index className="tnum ml-auto">
              {t(m.typeIndex.placesUnit, { n: row.placeCount })}
            </Index>
          </span>

          {/* 분포 막대 — 폭은 최대 종류를 100%로 잰 실제 비율, 마디는 도시 배분.
              라운드를 주지 않는다(콘택트 시트는 각져 있다).
              같은 정보가 바로 아래 글자로도 있으므로 여기는 장식이다 */}
          <span
            className="mt-2 flex h-1.5 overflow-hidden"
            style={{ width: `${Math.max((row.placeCount / max) * 100, 4)}%` }}
            aria-hidden
          >
            {row.cities.slice(0, 6).map((c, ci) => (
              <span
                key={c.slug}
                style={{
                  width: `${(c.count / row.placeCount) * 100}%`,
                  background: ci === 0 ? "var(--wax)" : "var(--edge)",
                  opacity: ci === 0 ? 1 : 1 - Math.min(ci * 0.14, 0.6),
                  marginRight: ci < row.cities.length - 1 ? "1.5px" : 0,
                }}
              />
            ))}
          </span>

          <span className="index mt-1.5 block truncate" style={{ color: "var(--dim)" }}>
            {shown
              .map((c) => `${displayCityName({ name: c.name, nameEn: c.nameEn }, locale)} ${c.count}`)
              .join("  ·  ")}
            {rest > 0 ? `  ·  +${rest}` : ""}
          </span>
        </span>

        <Icon.chevron className="size-4 shrink-0" style={{ color: "var(--dim)" }} />
      </Link>
    </li>
  );
}
