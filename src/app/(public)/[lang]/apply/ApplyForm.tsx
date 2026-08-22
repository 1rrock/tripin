"use client";

/**
 * 채널 등록 신청 폼 — 입력은 넷뿐이다(채널·이메일 필수).
 *
 * 장소 목록을 여기서 받지 않는 게 요점이다. 등록 데이터는 운영자가 기존
 * 인제스트 파이프라인(영상 설명란 파싱)으로 채우므로, 크리에이터의 진입
 * 장벽은 "채널 주소 붙여넣기" 하나로 낮춘다. 대표 영상 링크는 그 파이프라인이
 * 이 채널에 먹히는지(설명란에 장소 정보가 있는지) 가늠하는 재료다.
 */

import { useState } from "react";
import { track } from "@vercel/analytics";

export interface ApplyFormCopy {
  channelLabel: string;
  channelPlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  videosLabel: string;
  videosPlaceholder: string;
  noteLabel: string;
  submit: string;
  submitting: string;
  doneTitle: string;
  doneBody: string;
  errorInvalid: string;
  errorFailed: string;
}

/* 16px 미만이면 iOS 가 입력할 때 화면을 확대한다 — PRODUCT.md 접근성 */
const field = {
  fontSize: "16px",
  borderRadius: "var(--r-control)",
  background: "transparent",
  color: "var(--paper)",
  boxShadow: "inset 0 0 0 1px var(--hairline)",
} as const;

export function ApplyForm({ copy }: { copy: ApplyFormCopy }) {
  const [channelUrl, setChannelUrl] = useState("");
  const [email, setEmail] = useState("");
  const [videoUrls, setVideoUrls] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

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

  const submit = async () => {
    setError(null);
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
      setError(res.status === 400 ? copy.errorInvalid : copy.errorFailed);
      setState("idle");
    } catch {
      setError(copy.errorFailed);
      setState("idle");
    }
  };

  const label = { fontSize: "var(--t-meta)", fontWeight: 700, color: "var(--paper)" } as const;

  return (
    <form
      className="flex flex-col gap-4"
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
          placeholder={copy.channelPlaceholder}
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
          placeholder={copy.emailPlaceholder}
          className="h-11 w-full px-3 outline-none"
          style={field}
        />
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
        <p role="alert" style={{ fontSize: "var(--t-meta)", color: "var(--wax)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "sending"}
        className="h-12 w-full cursor-pointer font-bold transition-transform active:scale-[0.99] disabled:cursor-default disabled:opacity-60"
        style={{
          fontSize: "var(--t-body)",
          borderRadius: "var(--r-frame)",
          background: "var(--wax)",
          color: "#fff",
        }}
      >
        {state === "sending" ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
