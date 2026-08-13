"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm" style={{ color: "var(--dim)" }}>
        {error.message || "화면을 불러오지 못했어요."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
        style={{ background: "var(--paper)" }}
      >
        다시 시도
      </button>
    </main>
  );
}
