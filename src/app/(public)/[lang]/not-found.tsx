"use client";

import Link from "next/link";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Icon } from "@/shared/ui/icons";
import { useLocale } from "@/shared/i18n/LocaleContext";

/**
 * 없는 페이지 — 이 트리의 모든 `notFound()` 가 여기로 온다.
 *
 * 예전에는 이 파일이 리포에 아예 없어서 Next 기본 영문 흑백 화면
 * ("404 This page could not be found.", 본문 33자)이 떴다 — 헤더도 푸터도 검색도
 * 돌아갈 길도 없이. 이 트리의 화면 중 유일하게 디자인 시스템 밖이었다.
 *
 * 클라이언트 컴포넌트인 이유: `not-found.tsx` 는 props 를 받지 못해 `params.lang`
 * 을 못 본다. 대신 `[lang]/layout.tsx` 의 `LocaleProvider` 안에서 그려지므로
 * `useLocale()` 로 로케일을 얻는다 — 헤더·푸터 크롬도 그 레이아웃이 그대로 준다.
 *
 * 다음 행동은 두 갈래다(`EmptyState.tsx:6` — 다음 행동이 없는 빈 화면 금지):
 * 지도는 "그 가게 어디였지"로 온 사람의 길이고, 홈은 처음부터 다시 고르는 길이다.
 */
export default function NotFound() {
  const { messages: m, href } = useLocale();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-(--gutter) pt-16 text-center">
      <h1
        className="font-black"
        style={{ fontSize: "var(--t-screen)", letterSpacing: "-0.04em", lineHeight: 1.15 }}
      >
        {m.notFound.title}
      </h1>

      {/* 본문·행동은 EmptyState 가 든다. 위 여백만 줄인다 — 제목이 이미 섰으므로
          기본 py-20 을 그대로 두면 제목과 본문이 한 덩이로 안 읽힌다. */}
      <EmptyState message={m.notFound.body} className="pt-4 pb-24">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href={href("/map")}
            className="inline-flex h-11 items-center gap-1.5 px-4 font-bold"
            style={{
              fontSize: "var(--t-body)",
              borderRadius: "var(--r-frame)",
              background: "var(--paper)",
              color: "var(--sheet)",
            }}
          >
            <Icon.map className="size-4" />
            {m.notFound.toMap}
          </Link>
          <Link
            href={href("/")}
            className="index inline-flex items-center gap-1.5 px-2 underline-offset-4 hover:underline"
            style={{ color: "var(--dim)" }}
          >
            <Icon.back className="size-3.5" />
            {m.notFound.toHome}
          </Link>
        </div>
      </EmptyState>
    </main>
  );
}
