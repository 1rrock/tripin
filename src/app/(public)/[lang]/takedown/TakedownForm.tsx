"use client";

/**
 * 삭제·정정 요청 폼 — 입력은 셋뿐이다(URL 선택, 이메일·사유 필수).
 *
 * ⚠️ 이 폼이 생기기 전까지 접수 창구는 mailto: 하나였고, `takedown_requests` 는
 *    읽는 곳만 있고 쓰는 곳이 없었다(실측 행 0). 운영자는 빈 큐를 "요청 없음"으로
 *    읽었고 §44조의2④ 의 30일 시계는 그 사이에도 돌았다.
 *
 * 메일 주소는 화면에서 **치우지 않는다.** 이 라우트가 500 을 내면 사람에게 남는 길이
 * 그것뿐이고, 메일로 보내는 편이 편한 사람(첨부·증빙)도 있다.
 *
 * 카피는 `messages.takedownForm` 에서 온다 — `ApplyForm` 과 같은 규칙이다.
 */

import { useId, useState } from "react";
import { track } from "@vercel/analytics";
import { t } from "@/shared/i18n/get-dictionary";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Button } from "@/shared/ui/Button";

/* 16px 미만이면 iOS 가 입력할 때 화면을 확대한다 — PRODUCT.md 접근성 */
const field = {
  fontSize: "16px",
  borderRadius: "var(--r-control)",
  background: "transparent",
  color: "var(--paper)",
  boxShadow: "inset 0 0 0 1px var(--hairline)",
} as const;

/* 틀린 칸의 테두리 — 색이 아니라 **두께**로 말한다(`ApplyForm` 과 같은 규칙).
   위험·파괴의 `--alert` 도 여기선 안 쓴다 — 틀린 칸은 위험이 아니라 안내다. */
const fieldBad = {
  ...field,
  boxShadow: "inset 0 0 0 2px var(--paper)",
} as const;

/**
 * 클라이언트 검증 — 서버(`/api/takedown`)와 **같은 규칙**이다.
 * 서버는 어느 칸이 틀렸는지 말하지 않고 400 하나로 답하므로, 필드별 안내는
 * 여기서만 만들 수 있다. 규칙이 갈리면 "빨간 칸 없이 400" 이 나므로 같이 고칠 것.
 */
function isEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

function isReason(raw: string): boolean {
  return raw.trim().length >= 5;
}

export function TakedownForm({ email: contact }: { email: string }) {
  const { messages: m } = useLocale();
  const copy = m.takedownForm;
  const uid = useId();
  const [targetUrl, setTargetUrl] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  /* 폼 단위 실패(네트워크·429·서버 500). 필드 에러와 자리를 나눈다. */
  const [error, setError] = useState<string | null>(null);
  /* 건드린 칸만 표시한다 — 빈 폼을 열자마자 두 칸이 에러면 폼이 나를 혼내는 꼴이다. */
  const [touched, setTouched] = useState({ email: false, reason: false });

  if (state === "done") {
    return (
      <div
        className="flex flex-col gap-2 p-5"
        style={{ borderRadius: "var(--r-frame)", boxShadow: "inset 0 0 0 1px var(--hairline)" }}
      >
        <p className="font-bold" style={{ color: "var(--paper)" }}>
          {copy.doneTitle}
        </p>
        <p style={{ fontSize: "var(--t-body)", color: "var(--dim)", lineHeight: 1.7 }}>
          {copy.doneBody}
        </p>
      </div>
    );
  }

  const emailBad = !isEmail(email);
  const reasonBad = !isReason(reason);
  const showEmailErr = touched.email && emailBad;
  const showReasonErr = touched.reason && reasonBad;

  const submit = async () => {
    setTouched({ email: true, reason: true });
    setError(null);
    if (emailBad || reasonBad) return;

    setState("sending");
    try {
      const res = await fetch("/api/takedown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl, email, reason }),
      });
      if (res.status === 204) {
        track("takedown_submit");
        setState("done");
        return;
      }
      /* 429 는 "실패"가 아니라 "너무 잦다" — 같은 문구로 뭉뚱그리면 다시 눌러 또 막힌다. */
      if (res.status === 429) setError(copy.errorRateLimited);
      else if (res.status === 400) setError(copy.errorInvalid);
      /* 500 이면 접수가 어디에도 안 남았다 — 메일이라는 남은 길을 문구에 넣는다 */
      else setError(t(copy.errorFailed, { email: contact }));
      setState("idle");
    } catch {
      setError(t(copy.errorFailed, { email: contact }));
      setState("idle");
    }
  };

  const label = { fontSize: "var(--t-meta)", fontWeight: 700, color: "var(--paper)" } as const;
  const hint = {
    fontSize: "var(--t-meta)",
    fontWeight: 700,
    color: "var(--paper)",
    lineHeight: 1.5,
  } as const;

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span style={label}>{copy.urlLabel}</span>
        <input
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder={copy.urlPlaceholder}
          className="h-11 w-full px-3 outline-none"
          style={field}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span style={label}>{copy.emailLabel}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((s) => ({ ...s, email: true }))}
          placeholder={copy.emailPlaceholder}
          aria-invalid={showEmailErr}
          aria-describedby={showEmailErr ? `${uid}-email-err` : undefined}
          className="h-11 w-full px-3 outline-none"
          style={showEmailErr ? fieldBad : field}
        />
        {/* 이메일이 필수인 이유를 적는다 — §44조의2② 는 신청인 통지를 요구한다 */}
        <span style={{ fontSize: "var(--t-meta)", color: "var(--dim)", lineHeight: 1.5 }}>
          {copy.emailHint}
        </span>
        {showEmailErr ? (
          <span id={`${uid}-email-err`} style={hint}>
            {copy.errEmail}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5">
        <span style={label}>{copy.reasonLabel}</span>
        <textarea
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched((s) => ({ ...s, reason: true }))}
          placeholder={copy.reasonPlaceholder}
          rows={4}
          aria-invalid={showReasonErr}
          aria-describedby={showReasonErr ? `${uid}-reason-err` : undefined}
          className="w-full resize-y px-3 py-2.5 outline-none"
          style={showReasonErr ? fieldBad : field}
        />
        {showReasonErr ? (
          <span id={`${uid}-reason-err`} style={hint}>
            {copy.errReason}
          </span>
        ) : null}
      </label>

      {error ? (
        <p role="alert" style={hint}>
          {error}
        </p>
      ) : null}

      {/* 이 화면에서 산호로 채우는 면은 이 버튼 하나다. `primary` 가 곧 밀랍이다. */}
      <Button type="submit" size="lg" disabled={state === "sending"} className="w-full">
        {state === "sending" ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
