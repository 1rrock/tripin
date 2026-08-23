"use client";

/**
 * 채널 등록 신청 폼 — 입력은 넷뿐이다(채널·이메일 필수).
 *
 * 장소 목록을 여기서 받지 않는 게 요점이다. 등록 데이터는 운영자가 기존
 * 인제스트 파이프라인(영상 설명란 파싱)으로 채우므로, 크리에이터의 진입
 * 장벽은 "채널 주소 붙여넣기" 하나로 낮춘다. 대표 영상 링크는 그 파이프라인이
 * 이 채널에 먹히는지(설명란에 장소 정보가 있는지) 가늠하는 재료다.
 *
 * 카피는 `messages.apply` 에서 온다 — 예전엔 페이지가 인라인 사전을 만들어
 * `copy` prop 으로 내려줬다.
 */

import { useId, useState } from "react";
import { track } from "@vercel/analytics";
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

/* 틀린 칸의 테두리 — 색이 아니라 **두께**로 말한다. 산호(--wax)는 이 화면에서
   제출 버튼 하나의 것이고, 에러까지 산호면 20px 옆의 두 산호 중 어느 쪽이
   "누르라"인지 색으로 갈리지 않는다(PRODUCT.md: 브랜드색은 주 CTA·활성·마크). */
const fieldBad = {
  ...field,
  boxShadow: "inset 0 0 0 2px var(--paper)",
} as const;

/**
 * 클라이언트 검증 — 서버(`/api/channel-apply`)와 **같은 규칙**이다.
 * 서버는 어느 칸이 틀렸는지 말하지 않고 400 하나로 답하므로, 필드별 안내는
 * 여기서만 만들 수 있다. 규칙이 갈리면 "빨간 칸 없이 400" 이 나므로 같이 고칠 것.
 */
const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function isChannelUrl(raw: string): boolean {
  try {
    return YT_HOSTS.has(new URL(raw.trim()).hostname);
  } catch {
    return false;
  }
}

function isEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export function ApplyForm() {
  const { messages: m } = useLocale();
  const copy = m.apply;
  const uid = useId();
  const [channelUrl, setChannelUrl] = useState("");
  const [email, setEmail] = useState("");
  const [videoUrls, setVideoUrls] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  /* 폼 단위 실패(네트워크·429·서버 500). 필드 에러와 자리를 나눈다. */
  const [error, setError] = useState<string | null>(null);
  /* 건드린 칸만 빨갛게 한다 — 빈 폼을 열자마자 두 칸이 에러면 폼이 나를 혼내는 꼴이다.
     제출을 누르면 전부 건드린 것으로 친다. */
  const [touched, setTouched] = useState({ channel: false, email: false });

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

  const channelBad = !isChannelUrl(channelUrl);
  const emailBad = !isEmail(email);
  const showChannelErr = touched.channel && channelBad;
  const showEmailErr = touched.email && emailBad;

  const submit = async () => {
    setTouched({ channel: true, email: true });
    setError(null);
    /* 틀린 칸이 있으면 쏘지 않는다 — 서버 왕복 뒤 "확인해 주세요" 한 줄을
       받느니, 어느 칸인지 바로 보이는 편이 낫다. */
    if (channelBad || emailBad) return;

    setState("sending");
    try {
      const res = await fetch("/api/channel-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl, email, videoUrls, note }),
      });
      if (res.status === 204) {
        track("channel_apply");
        setState("done");
        return;
      }
      /* 429 는 "실패"가 아니라 "너무 잦다" — 같은 문구로 뭉뚱그리면 다시 눌러 또 막힌다. */
      if (res.status === 429) setError(copy.errorRateLimited);
      else if (res.status === 400) setError(copy.errorInvalid);
      else setError(copy.errorFailed);
      setState("idle");
    } catch {
      setError(copy.errorFailed);
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
        <span style={label}>{copy.channelLabel}</span>
        <input
          type="url"
          required
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
          onBlur={() => setTouched((s) => ({ ...s, channel: true }))}
          placeholder={copy.channelPlaceholder}
          aria-invalid={showChannelErr}
          aria-describedby={showChannelErr ? `${uid}-channel-err` : undefined}
          className="h-11 w-full px-3 outline-none"
          style={showChannelErr ? fieldBad : field}
        />
        {showChannelErr ? (
          <span id={`${uid}-channel-err`} style={hint}>
            {copy.errChannel}
          </span>
        ) : null}
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
        {showEmailErr ? (
          <span id={`${uid}-email-err`} style={hint}>
            {copy.errEmail}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5">
        <span style={label}>{copy.videosLabel}</span>
        <textarea
          value={videoUrls}
          onChange={(e) => setVideoUrls(e.target.value)}
          placeholder={copy.videosPlaceholder}
          rows={3}
          className="w-full resize-y px-3 py-2.5 outline-none"
          style={field}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span style={label}>{copy.noteLabel}</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full resize-y px-3 py-2.5 outline-none"
          style={field}
        />
      </label>

      {error ? (
        <p role="alert" style={hint}>
          {error}
        </p>
      ) : null}

      {/* 이 화면에서 산호로 채우는 면은 이 버튼 하나다 — "여기를 누르라"의 유일한 표시.
          `primary` 가 곧 밀랍이다(Button.tsx 의 계약) — 색을 여기서 다시 적지 않는다. */}
      <Button type="submit" size="lg" disabled={state === "sending"} className="w-full">
        {state === "sending" ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
