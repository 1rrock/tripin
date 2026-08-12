import type { Metadata } from "next";

/**
 * 어드민 로그인 — HTML form POST 만으로 동작한다(클라이언트 JS 불필요).
 * 에러 상태는 쿼리스트링으로 돌아온다: wrong / locked / nosecret.
 */
const ERROR_MESSAGES: Record<string, string> = {
  wrong: "비밀번호가 맞지 않습니다.",
  locked: "실패가 5회 누적됐습니다. 60초 뒤에 다시 시도하세요.",
  nosecret:
    "ADMIN_SECRET 이 설정되지 않았습니다. .env.local 에 값을 넣고 서버를 재시작하세요. (생성: openssl rand -base64 32)",
};

export const metadata: Metadata = {
  title: "로그인 — Eatripin 어드민",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? ERROR_MESSAGES[params.error] : null;
  const next = params.next?.startsWith("/admin") ? params.next : "";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-100 px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Eatripin 어드민</h1>
        <p className="mt-1 text-sm text-neutral-600">운영자 전용입니다.</p>

        <form method="post" action="/api/admin/login" className="mt-8 space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-800">비밀번호</span>
            <input
              type="password"
              name="password"
              required
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 shadow-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            />
          </label>

          {error ? (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            로그인
          </button>
        </form>
      </div>
    </main>
  );
}
