"use client";

/**
 * 결과 행 — 홈 미니피드·종류 목록이 같이 쓴다.
 * 썸네일 폭 112px 고정(16:9)이라 제목 시작 x 가 행마다 같다.
 */

import Link from "next/link";
import { Frame } from "@/shared/ui/frame";
import { Thumb } from "@/shared/ui/Thumb";

export function ResultRow({
  href,
  youtubeId,
  thumbAlt,
  eyebrow,
  title,
  meta,
  eager,
}: {
  href: string;
  youtubeId: string | null;
  thumbAlt: string;
  /* 눈썹은 늘 --dim 이다. 종류별 색(`eyebrowType`)은 걷어냈다 —
     한 화면에 열 종류가 깔리는 목록이라 색표가 붙으면 무지개가 된다. */
  eyebrow?: string;
  title: string;
  meta: string;
  eager?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 px-(--gutter) py-3.5 transition-colors active:bg-(--hover)"
    >
      <Frame className="w-[112px] shrink-0">
        {youtubeId ? <Thumb youtubeId={youtubeId} alt={thumbAlt} eager={eager} /> : null}
      </Frame>
      <span className="min-w-0 flex-1">
        {eyebrow ? (
          <span className="block text-[12px] font-medium text-(--dim)">{eyebrow}</span>
        ) : null}
        <span className="mt-0.5 block truncate text-[15px] font-semibold tracking-[-0.01em]">
          {title}
        </span>
        <span className="mt-1 block truncate text-[13px] text-(--dim)">{meta}</span>
      </span>
    </Link>
  );
}
