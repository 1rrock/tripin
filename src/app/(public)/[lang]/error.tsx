"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { Icon } from "@/shared/ui/icons";
import { useLocale } from "@/shared/i18n/LocaleContext";

/**
 * 렌더 중 터진 화면.
 *
 * 예전에는 `{error.message || "화면을 불러오지 못했어요."}` 를 그대로 그렸다.
 * 프로덕션에서 그 자리에 앉는 건 minify 된 문자열이나 digest 라, 사용자 카피
 * 자리에 내부 에러 원문이 노출됐다. 문구도 한국어 하드코딩이라 EN 로케일에
 * 한국어가 나갔다 — 이 컴포넌트는 `LocaleProvider` 안이라 `useLocale()` 을
 * 쓸 수 있는데 안 쓰고 있었다.
 *
 * `error.message` 는 더 이상 그리지 않는다. 원인은 서버 로그와 `digest` 로 쫓고,
 * 화면에는 다음 행동 두 개만 둔다 — 다시 시도(같은 자리)와 홈(막다른 화면 금지).
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { messages: m, href } = useLocale();

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-(--gutter) text-center">
      <h1
        className="font-black"
        style={{ fontSize: "var(--t-title)", letterSpacing: "-0.03em", lineHeight: 1.25 }}
      >
        {m.error.title}
      </h1>
      <p style={{ fontSize: "var(--t-meta)", lineHeight: 1.6, color: "var(--dim)" }}>
        {m.error.body}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* 규격은 `Button` 에만 있다 — 예전엔 h-11·px-5 를 손으로 적어서 같은
            "먹색 채움" 단추가 화면마다 다른 폭으로 섰다(2026-08-24 감사). */}
        <Button variant="secondary" size="md" onClick={reset}>
          {m.error.retry}
        </Button>
        <Link
          href={href("/")}
          className="index inline-flex items-center gap-1.5 px-2 underline-offset-4 hover:underline"
          style={{ color: "var(--dim)" }}
        >
          <Icon.back className="size-3.5" />
          {m.error.toHome}
        </Link>
      </div>
      {/* digest 는 문의 때 이 사고를 서버 로그와 잇는 유일한 손잡이다. 눈에는 안
          보이고 DOM 에만 남긴다 — 에러 원문을 노출하지 않으면서 추적은 된다. */}
      {error.digest ? <span hidden data-error-digest={error.digest} /> : null}
    </main>
  );
}
