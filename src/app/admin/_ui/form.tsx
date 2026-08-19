"use client";

/** 어드민 폼 공용 조각 — 손입력 화면과 장소 수정 화면이 같이 쓴다. */

import { useEffect, useRef } from "react";
import type { ActionResult } from "../_lib/action-result";

export type { ActionResult } from "../_lib/action-result";

export const inputCls =
  "mt-0.5 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500";
export const labelCls = "text-xs text-neutral-500";
export const buttonCls =
  "rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50";

export function ResultNotice({ result }: { result: ActionResult }) {
  if (result.error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
        {result.error}
      </p>
    );
  }
  if (result.ok) {
    return <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{result.ok}</p>;
  }
  return null;
}

/**
 * 성공 시 폼을 비우고 **첫 입력란으로 포커스를 되돌린다** — 연속 입력 흐름 유지.
 *
 * 리셋만 하고 포커스를 안 옮기면 "저장 후 다음"이라는 버튼 문구가 거짓말이 된다.
 * 매번 마우스로 첫 칸을 다시 눌러야 했다.
 */
export function useResettingForm(result: ActionResult) {
  const ref = useRef<HTMLFormElement>(null);
  const lastOk = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (result.ok && result.ok !== lastOk.current) {
      lastOk.current = result.ok;
      const form = ref.current;
      if (!form) return;
      form.reset();
      const first = form.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      first?.focus();
    }
  }, [result.ok]);
  return ref;
}

/** 공개 UI 와 동일 — `shared/ui/place-types` 단일 소스. */
export { PLACE_TYPE_LABELS } from "@/shared/ui/place-types";

/** "760" → "12:40" */
export function formatTs(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/**
 * ★ 확정 잠금 — 좌표(또는 지도 링크) + 근거가 채워져야 확정 라디오가 열린다.
 *
 * 서버(`actions.ts`)가 최종 검증하지만 화면에서도 막는다. 이게 이 프로젝트 유일한
 * 구조적 리스크(동명이점 오확정, LEGAL.md 4.6)를 막는 장치라 양쪽에 둔다.
 *
 * naverPlace·kakaoPlace 도 인정한다 — 네이버 링크는 서버가 좌표를 자동 해석하므로
 * (resolve-naver-place.ts) 화면에서 미리 막을 이유가 없다. 최종 판단은 항상 서버가 한다.
 *
 * 입력을 uncontrolled 로 두고 폼 onChange 에서 DOM 값을 읽는 이유 —
 * effect 에서 setState 로 되돌리는 패턴(react-hooks/set-state-in-effect)을 피하기 위함.
 */
export function readConfirmLock(form: HTMLFormElement): boolean {
  const get = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "";
  const hasPlace =
    get("latlng").trim().length > 0 ||
    get("googleMaps").trim().length > 0 ||
    get("naverPlace").trim().length > 0 ||
    get("kakaoPlace").trim().length > 0;
  return hasPlace && get("sourceNote").trim().length > 0;
}

export function StatusRadios({
  canConfirm,
  confirmedDefault,
}: {
  canConfirm: boolean;
  confirmedDefault: boolean;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-1.5 text-sm">
        <input
          type="radio"
          name="mapStatus"
          value="confirmed"
          disabled={!canConfirm}
          defaultChecked={confirmedDefault}
        />
        <span className={canConfirm ? "text-neutral-900" : "text-neutral-400"}>
          확정 {canConfirm ? "" : "(좌표·지도 링크 + 근거 필요)"}
        </span>
      </label>
      <label className="flex items-center gap-1.5 text-sm text-neutral-900">
        <input
          type="radio"
          name="mapStatus"
          value="candidate"
          defaultChecked={!confirmedDefault}
        />
        보류 — 위치 확인 중
      </label>
    </fieldset>
  );
}
