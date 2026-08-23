"use client";

/**
 * 카테고리 그리드 — 홈의 주인공. 앱을 열고 10초 안에 "뭐 볼지" 고르는 자리.
 * 종류 칸은 `/map?type=` 으로 직행한다. 지역·더보기는 필터를 고르러 `/map`.
 *
 * 🔴 아이콘에 색을 주지 말 것. 10칸이 한 번에 깔리므로 각자 색이면 무지개,
 *    전부 산호면 벽이 된다. 면/선만으로 가른다 — theme=채운 원, tool=테두리 원.
 */

import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import type { PlaceType } from "@/shared/api/database.types";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { HOME_TYPES, TOOL_ICON, typeIcon } from "@/shared/ui/type-icons";

type Variant = "theme" | "tool";

function Tile({
  icon: Glyph,
  label,
  href,
  variant = "theme",
}: {
  icon: Icon;
  label: string;
  href: string;
  variant?: Variant;
}) {
  return (
    <Link
      href={href}
      prefetch={/\/map\?/.test(href) ? false : undefined}
      className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
    >
      <span
        className={
          variant === "theme"
            ? "flex h-12 w-12 items-center justify-center rounded-full bg-(--halo)"
            : "flex h-12 w-12 items-center justify-center rounded-full border border-(--hairline) bg-(--ground)"
        }
      >
        <Glyph className="text-[#383838]" size={22} weight="duotone" />
      </span>
      <span className="break-keep text-center text-[12px] font-medium text-[#383838]">{label}</span>
    </Link>
  );
}

/**
 * @param counts 종류별 장소 수. **개수가 0인 종류는 타일을 안 깐다** — 누르면
 *   결과 0건인 `/map?type=…` 으로 보내는 타일이기 때문이다. `/map` 의 종류
 *   필터(`CanvasFilters`)는 이미 `n === 0` 을 걸러내고 있어서, 이걸 안 걸면 같은
 *   목록을 두 화면이 **다른 규칙**으로 그린다(홈엔 있고 지도엔 없는 종류).
 *
 *   ⚠️ 넘기지 않으면 예전처럼 `HOME_TYPES` 전부를 깐다. 지금 홈이 그 상태다 —
 *   이 조각의 호출부(`(public)/HomeSheet.tsx`)가 종류별 개수를 안 받고 있어서
 *   아직 못 꽂았다. 개수 자체는 `loadHomeFeed()` 가 이미 `places`(place_type 포함)를
 *   전부 읽으므로 새 질의 없이 셀 수 있다. `searchParams` 를 서버에서 읽으면
 *   ISR 이 깨지니(HANDOFF §3-4) 그 길로는 가지 말 것.
 */
export function CategoryGrid({ counts }: { counts?: Partial<Record<PlaceType, number>> }) {
  const { messages: m, href } = useLocale();
  const types = counts ? HOME_TYPES.filter((t) => (counts[t] ?? 0) > 0) : HOME_TYPES;

  return (
    <nav className="grid grid-cols-5 gap-x-1 gap-y-5 px-(--gutter) pt-2 pb-6" aria-label={m.home.filterAria}>
      {types.map((type) => (
        <Tile
          key={type}
          icon={typeIcon(type)}
          label={m.placeTypes[type]}
          href={href(`/map?type=${type}`)}
        />
      ))}
      <Tile
        icon={TOOL_ICON.region}
        label={m.nav.region}
        href={href("/map")}
        variant="tool"
      />
      {/* 채널만 지도로 보내지 않는다 — "누구를 따라갈까"의 답은 장소가 아니라
          사람이라 핀을 뿌려 봐야 구분이 안 된다. 채널 목록으로 보낸다 */}
      <Tile
        icon={TOOL_ICON.channel}
        label={m.nav.channel}
        href={href("/channels")}
        variant="tool"
      />
      <Tile
        icon={TOOL_ICON.more}
        label={m.home.categoryMore}
        href={href("/map")}
        variant="tool"
      />
    </nav>
  );
}
