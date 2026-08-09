"use client";

import { useTransition, useState } from "react";
import { recountStats } from "../actions";

/**
 * 통계 캐시 재계산 버튼.
 *
 * 인제스트 스크립트는 캐시를 갱신하지 않으므로, 스크립트로 데이터를 넣은 뒤에는
 * 여기를 눌러야 공개 화면 정렬이 맞는다. 대시보드가 어긋남을 감지하면 경고도 띄운다.
 */
export function RecountButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-2">
      {msg ? <span className="text-xs text-neutral-500">{msg}</span> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await recountStats();
            setMsg(r.ok ?? r.error ?? null);
          })
        }
        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
      >
        {pending ? "재계산 중…" : "통계 재계산"}
      </button>
    </span>
  );
}
