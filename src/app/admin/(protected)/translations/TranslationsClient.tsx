"use client";

/**
 * 번역 검수 화면 — /admin/translations.
 *
 *   1. 장소 목록: en_source 로 3갈래(검수 대기/검수 완료/미번역) 필터, 행을 펼치면
 *      `TranslationEditor` 가 한국어 원문 / 영문을 나란히 보여준다.
 *   2. 도시 인트로: 행 수가 적어 바로 아래에 간단한 목록으로 둔다.
 */

import { useActionState, useMemo, useState } from "react";
// ⚠️ `_lib/queries` 는 서버 전용(서비스 롤 클라이언트)이라 여기서 import 하지 않는다
import type { AdminCityIntroRow, AdminTranslationRow } from "../_lib/shared";
import { Card, Pill } from "../_ui/kit";
import { inputCls, buttonCls, ResultNotice } from "../_ui/form";
import { TranslationEditor } from "./TranslationEditor";
import { saveCityIntroTranslation } from "./actions";
import type { ActionResult } from "../_lib/action-result";

type Filter = "machine" | "human" | "none";

const FILTER_LABEL: Record<Filter, string> = {
  machine: "검수 대기",
  human: "검수 완료",
  none: "미번역",
};

export function TranslationsClient({
  places,
  cityIntros,
}: {
  places: AdminTranslationRow[];
  cityIntros: AdminCityIntroRow[];
}) {
  const [filter, setFilter] = useState<Filter>("machine");
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      machine: places.filter((p) => p.enSource === "machine").length,
      human: places.filter((p) => p.enSource === "human").length,
      none: places.filter((p) => !p.enSource).length,
    }),
    [places],
  );

  const rows = useMemo(() => {
    const want = filter === "none" ? null : filter;
    return places.filter((p) => p.enSource === want);
  }, [places, filter]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight">번역 검수</h1>
      <p className="mt-1 text-sm text-neutral-500">
        기계 초벌 번역을 원문과 대조해 고치고 검수 완료로 올립니다. 검수완료 전에는 공개
        화면에서 &ldquo;자동 번역&rdquo; 표시가 함께 나갑니다.
      </p>

      {/* ── 필터 탭 ── */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setOpen(null);
            }}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {FILTER_LABEL[f]}
            <span className={filter === f ? "tabular-nums text-neutral-300" : "tabular-nums text-neutral-400"}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* ── 장소 목록 ── */}
      <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            {filter === "machine"
              ? "검수할 항목이 없습니다."
              : filter === "human"
                ? "검수 완료된 항목이 없습니다."
                : "미번역 항목이 없습니다."}
          </p>
        ) : (
          <ul>
            {rows.map((p) => {
              const expanded = open === p.id;
              return (
                <li key={p.id} className="border-b border-neutral-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : p.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium text-neutral-900">{p.name}</span>
                        {p.nameLocal ? (
                          <span className="text-xs text-neutral-400">{p.nameLocal}</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                        <span>{p.creatorName}</span>
                        <span className="text-neutral-300">×</span>
                        <span>{p.cityName}</span>
                      </span>
                    </span>
                    <span className="shrink-0">
                      {p.enSource === "human" ? (
                        <Pill tone="ok">검수완료</Pill>
                      ) : p.enSource === "machine" ? (
                        <Pill tone="warn">검수 대기</Pill>
                      ) : (
                        <Pill tone="muted">미번역</Pill>
                      )}
                    </span>
                  </button>
                  {expanded ? <TranslationEditor place={p} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── 도시 인트로 ── */}
      <div className="mt-8">
        <Card title={`도시 인트로 (${cityIntros.length}건)`}>
          {cityIntros.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">등록된 도시 인트로가 없습니다.</p>
          ) : (
            <ul className="space-y-4">
              {cityIntros.map((row) => (
                <li
                  key={`${row.creatorId}|${row.cityId}`}
                  className="border-t border-neutral-100 pt-4 first:border-0 first:pt-0"
                >
                  <CityIntroRow row={row} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}

function CityIntroRow({ row }: { row: AdminCityIntroRow }) {
  const [result, action, pending] = useActionState<ActionResult, FormData>(
    saveCityIntroTranslation,
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="creatorId" value={row.creatorId} />
      <input type="hidden" name="cityId" value={row.cityId} />
      <p className="text-xs font-medium text-neutral-500">
        {row.creatorName} <span className="text-neutral-300">×</span> {row.cityName}
        {row.introTextEn ? <Pill tone="ok">번역 있음</Pill> : <Pill tone="muted">미번역</Pill>}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-700">
          {row.introText}
        </p>
        <textarea
          name="introTextEn"
          defaultValue={row.introTextEn ?? ""}
          rows={2}
          placeholder="영문 인트로"
          className={inputCls}
        />
      </div>
      <ResultNotice result={result} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "저장 중…" : "저장"}
      </button>
    </form>
  );
}
