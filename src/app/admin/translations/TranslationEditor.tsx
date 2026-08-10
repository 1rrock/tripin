"use client";

/**
 * 장소 하나의 영문 검수 폼 — 한국어 원문(읽기 전용) / 영문(편집 가능) 나란히 비교.
 *
 * 불릿은 원문과 1:1 로 짝지어 보여준다(`scripts/translate-en.mjs` 도 같은 규칙으로 번역한다).
 * 원문 불릿 개수만큼만 입력칸을 만든다 — 개수가 어긋나면 그 자체가 검수 대상이라
 * 화면에서 늘리고 줄이게 하지 않는다.
 */

import { useActionState, useState, useTransition } from "react";
import { buttonCls, inputCls, ResultNotice } from "../_ui/form";
import { Pill } from "../_ui/kit";
import type { AdminTranslationRow } from "../_lib/shared";
import { approvePlaceTranslation, savePlaceTranslation, type ActionResult } from "./actions";

const roCls =
  "whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-700";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-neutral-500">{label}</p>
      {children}
    </div>
  );
}

export function TranslationEditor({ place }: { place: AdminTranslationRow }) {
  const [result, action, pending] = useActionState<ActionResult, FormData>(savePlaceTranslation, {});
  const [bulletsEn, setBulletsEn] = useState<string[]>(
    place.summaryBullets.map((_, i) => place.summaryBulletsEn[i] ?? ""),
  );
  const [approvePending, startApprove] = useTransition();
  const [approveResult, setApproveResult] = useState<ActionResult>({});

  const bulletCountMismatch =
    place.summaryBulletsEn.length > 0 && place.summaryBulletsEn.length !== place.summaryBullets.length;

  return (
    <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="placeId" value={place.id} />

        <div className="grid gap-2 text-xs font-semibold text-neutral-400 sm:grid-cols-2">
          <span>한국어 원문</span>
          <span>영문 — 검수·수정</span>
        </div>

        <Field label="요약">
          <div className="grid gap-2 sm:grid-cols-2">
            <p className={roCls}>{place.summary || "—"}</p>
            <textarea
              name="summaryEn"
              defaultValue={place.summaryEn ?? ""}
              rows={2}
              className={inputCls}
              placeholder="영문 요약"
            />
          </div>
        </Field>

        <Field label={`불릿 (원문 ${place.summaryBullets.length}개)`}>
          {place.summaryBullets.length === 0 ? (
            <p className="text-sm text-neutral-400">원문 불릿 없음</p>
          ) : (
            <div className="space-y-1.5">
              {place.summaryBullets.map((ko, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <p className={roCls}>· {ko}</p>
                  <input
                    name="bulletEn"
                    value={bulletsEn[i] ?? ""}
                    onChange={(e) =>
                      setBulletsEn((prev) => prev.map((b, j) => (j === i ? e.target.value : b)))
                    }
                    placeholder="영문 번역"
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          )}
          {bulletCountMismatch ? (
            <p className="mt-1 text-xs text-amber-700">
              ⚠ 저장된 영문 불릿 {place.summaryBulletsEn.length}개 — 원문 {place.summaryBullets.length}
              개와 다릅니다. 위 칸에 맞춰 다시 저장하면 바로잡힙니다.
            </p>
          ) : null}
        </Field>

        <Field label="주소">
          <div className="grid gap-2 sm:grid-cols-2">
            <p className={roCls}>{place.address || "—"}</p>
            <input name="addressEn" defaultValue={place.addressEn ?? ""} className={inputCls} />
          </div>
        </Field>

        <Field label="가격 정보">
          <div className="grid gap-2 sm:grid-cols-2">
            <p className={roCls}>{place.priceHint || "—"}</p>
            <input name="priceHintEn" defaultValue={place.priceHintEn ?? ""} className={inputCls} />
          </div>
        </Field>

        <ResultNotice result={result} />
        <ResultNotice result={approveResult} />

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className={buttonCls}>
            {pending ? "저장 중…" : "저장 후 검수완료"}
          </button>
          <button
            type="button"
            disabled={approvePending || !place.enSource}
            title={!place.enSource ? "아직 번역이 없어 승인할 수 없습니다" : undefined}
            onClick={() =>
              startApprove(async () => {
                const r = await approvePlaceTranslation(place.id);
                setApproveResult(r);
              })
            }
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {approvePending ? "승인 중…" : "수정 없이 승인"}
          </button>
          {place.enSource === "human" ? <Pill tone="ok">검수완료</Pill> : null}
        </div>
      </form>
    </div>
  );
}
