"use client";

/**
 * 요약 불릿·가격힌트 렌더 — 장소 카드(Explorer/CityExplorer)와 핀 상세(PlaceSheet)가 공유.
 *
 * `displaySummary()`(shared/i18n/display.ts)가 로케일 + `en_source` 조합을 이미 판정해
 * 넘긴 결과만 그린다. 이 컴포넌트는 그 결과를 두 가지로 나눠 그리는 것만 한다:
 *   · 그대로 보여줄 요약(한국어 원문, 또는 영문 human/machine)
 *   · machine 번역이면 "자동 번역" 표시 + `<details>` 원문 토글
 *
 * `<details>/<summary>` 를 쓰는 이유: JS 상태 없이 접고 펼 수 있고, 서버 컴포넌트
 * 트리 안에서도 동작하고, 접근성이 공짜다.
 *
 * 왁스(--wax)는 표시 전용이라 "자동 번역" 뱃지에는 칠하지 않는다 — 사용자의 선택
 * 표시(담기·핀)가 아니라 시스템이 붙인 라벨이라 --dim 톤으로 조용히 둔다.
 */

import { useLocale } from "@/shared/i18n/LocaleContext";
import type { SummaryDisplay } from "@/shared/i18n/display";

export function SummaryBlock({
  display,
  dimColor = "var(--dim)",
  showPriceHint = true,
  className = "",
}: {
  display: SummaryDisplay;
  /** 밝은 시트(PlaceSheet)에서는 --lightbox-dim 을 넘긴다. */
  dimColor?: string;
  /** CityExplorer 목록은 원래 가격힌트를 보여주지 않았다 — 그 화면만 false. */
  showPriceHint?: boolean;
  className?: string;
}) {
  const { messages: m } = useLocale();

  if (display.bullets.length === 0 && !display.summary && !display.priceHint) return null;

  return (
    <div className={className}>
      {display.bullets.length > 0 ? (
        <ul className="flex flex-col gap-1.5" style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}>
          {display.bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden style={{ color: dimColor }}>
                ·
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : display.summary ? (
        <p style={{ fontSize: "var(--t-body)", lineHeight: 1.65 }}>{display.summary}</p>
      ) : null}

      {showPriceHint && display.priceHint ? (
        <p className="mt-1.5" style={{ fontSize: "var(--t-meta)", color: dimColor }}>
          {display.priceHint}
        </p>
      ) : null}

      {display.isMachine ? (
        <div className="mt-1.5" style={{ fontSize: "var(--t-meta)", color: dimColor }}>
          <span>{m.piece.machineTranslated}</span>
          {display.original ? (
            <details className="mt-1">
              <summary
                className="cursor-pointer underline underline-offset-4"
                style={{ color: dimColor }}
              >
                {m.piece.showOriginal}
              </summary>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {display.original.bullets.length > 0 ? (
                  <ul
                    className="flex flex-col gap-1"
                    style={{ fontSize: "var(--t-body)", lineHeight: 1.6 }}
                  >
                    {display.original.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden style={{ color: dimColor }}>
                          ·
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : display.original.summary ? (
                  <p style={{ fontSize: "var(--t-body)", lineHeight: 1.6 }}>
                    {display.original.summary}
                  </p>
                ) : null}
                {showPriceHint && display.original.priceHint ? (
                  <p style={{ fontSize: "var(--t-meta)" }}>{display.original.priceHint}</p>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
