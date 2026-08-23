"use client";

/**
 * 실패어 한 줄 지우기.
 *
 * ⚠️ 예전에는 `<form action={dismissSearchMissForm.bind(…)}>` 였고, 그 래퍼가
 *    반환값이 void 여야 해서 안쪽의 `{ error }` 를 버렸다 — 삭제가 실패해도 줄은
 *    그대로 남고 아무 말도 없었다(성공과 구분되지 않는다).
 *    성공하면 액션의 revalidate 로 줄 자체가 사라지므로 알림은 실패에만 둔다.
 */

import { useState, useTransition } from "react";
import { dismissSearchMiss } from "./actions";

export function DismissButton({ query }: { query: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex items-center justify-end gap-2">
      {error ? (
        <span role="alert" className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-800">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await dismissSearchMiss(query);
            setError(r.error ?? null);
          })
        }
        className="rounded-md px-2 py-1 text-xs text-neutral-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      >
        {pending ? "지우는 중…" : "지우기"}
      </button>
    </span>
  );
}
