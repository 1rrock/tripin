"use client";

/**
 * 신청 한 건의 판정 버튼 — 등록됨 / 보류.
 *
 * ⚠️ 예전에는 서버 컴포넌트에서 `<form action={…Form.bind(…)}>` 로 불렀고, 그 래퍼가
 *    반환값이 void 여야 해서 안쪽이 만든 `{ error }` 를 통째로 버렸다. DB 오류가 나면
 *    버튼을 눌러도 아무 일도 안 일어난 것처럼 목록이 그대로였다.
 *    형제 화면(`_ui/RecountButton`·`places/PlacesClient`)과 같이 useTransition 으로
 *    결과를 받아 화면에 남긴다. 성공은 따로 안 알린다 — 행이 "등록됨/보류"로 바뀐다.
 */

import { useState, useTransition } from "react";
import { setApplicationStatus } from "./actions";

export function ApplicationActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (status: "done" | "dismissed") =>
    start(async () => {
      const r = await setApplicationStatus(id, status);
      setError(r.error ?? null);
    });

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run("done")}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          등록됨
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("dismissed")}
          className="rounded-md px-3 py-1.5 text-xs text-neutral-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          보류
        </button>
      </div>
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
