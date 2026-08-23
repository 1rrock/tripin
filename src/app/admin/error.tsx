"use client";

/**
 * 어드민 전체의 에러 경계 — `/admin/login` 과 `(protected)/*` 를 함께 덮는다.
 *
 * 여기가 없던 동안 두 경로가 통째로 흰 화면이 됐다:
 *   1. 목록 화면은 전부 `fetchAll`(shared/api/chunked-in.ts)로 읽는데, 그 헬퍼는
 *      부분 결과를 캐시에 굳히지 않으려고 **throw** 한다. 받는 곳이 없어 일반 500 이 났다.
 *   2. 어드민 쿠키 수명은 7일(admin-auth.ts TOKEN_TTL_SEC)이다. 일주일 열어 둔 탭에서
 *      "내리기"·"삭제"·"승인" 을 누르면 서버 액션의 `requireAdmin()` 이 던지고,
 *      `useTransition` 안에 try/catch 가 없어 그대로 여기까지 올라온다.
 *
 * ⚠️ 만료를 **자동으로 판정하지 않는다.** 프로덕션에서는 서버가 던진 메시지가
 *    클라이언트에 오기 전에 마스킹되므로("관리자 인증이 필요합니다" 가 남지 않는다),
 *    메시지로 갈래를 나누면 프로덕션에서만 틀린 안내가 된다. 그래서 재시도와
 *    다시 로그인을 **둘 다** 내놓고, 만료가 흔한 원인이라는 사실을 본문이 말한다.
 *    (dev 에서는 원문이 남으므로 아래 힌트가 그때만 추가로 뜬다.)
 *
 * 이 트리에 `loading.tsx` 를 만들면 안 된다 — 스트리밍 경계가 `notFound()` 의
 * 상태 코드를 삼킨다(docs/HANDOFF.md §3-1). error.tsx 는 그 문제와 무관하다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 서버 메시지가 살아 있는 환경(dev)에서만 참이 된다 — 판정이 아니라 힌트다. */
function looksLikeAuthError(message: string): boolean {
  return message.includes("관리자 인증이 필요합니다") || message.includes("관리자 기능이 비활성화");
}

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  // 로그인 후 하던 자리로 돌아온다 — login/page.tsx 가 `next` 를 받아 준다
  const loginHref = pathname?.startsWith("/admin")
    ? `/admin/login?next=${encodeURIComponent(pathname)}`
    : "/admin/login";
  const authHint = looksLikeAuthError(error.message);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold tracking-tight text-neutral-900">
          이 화면을 불러오지 못했습니다
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {authHint ? (
            <>
              <strong className="font-semibold text-neutral-900">로그인이 만료됐습니다.</strong>{" "}
              다시 로그인하면 하던 자리로 돌아옵니다.
            </>
          ) : (
            <>
              흔한 원인 두 가지입니다 — 어드민 로그인이 만료됐거나(쿠키 수명 7일), DB 조회가
              실패했습니다. 로그인 만료라면 <strong className="font-semibold">다시 로그인</strong>,
              일시적 조회 실패라면 <strong className="font-semibold">다시 시도</strong>입니다.
            </>
          )}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
          >
            다시 시도
          </button>
          <Link
            href={loginHref}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            다시 로그인
          </Link>
          <Link
            href="/admin"
            className="rounded-md px-3 py-2 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            대시보드로
          </Link>
        </div>

        {/* 어드민은 인증된 운영자만 보는 내부 도구다 — 원문·digest 를 가릴 이유가 없다.
            (공개 트리의 error.tsx 가 메시지를 숨기는 것과 의도적으로 다르다.) */}
        {error.message || error.digest ? (
          <dl className="mt-5 space-y-1 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
            {error.message ? (
              <div className="flex gap-2">
                <dt className="w-12 shrink-0">원인</dt>
                <dd className="min-w-0 flex-1 font-mono break-words text-neutral-700">
                  {error.message}
                </dd>
              </div>
            ) : null}
            {error.digest ? (
              <div className="flex gap-2">
                <dt className="w-12 shrink-0">digest</dt>
                <dd className="min-w-0 flex-1 font-mono break-all">{error.digest}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </main>
  );
}
