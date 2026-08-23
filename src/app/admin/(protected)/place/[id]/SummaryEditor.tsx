"use client";

/**
 * 요약문 에디터 — 템플릿 + 불릿 3~5개 + 실시간 검사 (docs/ADMIN.md 6장).
 *
 *   · 검사는 전부 경고 — 저장을 막지 않는다. 판단은 사람이 한다.
 *   · 참고 자료(mentionNote)는 자막 파생물 — 복사 버튼 없음, 복붙 경로 차단.
 *   · 자막 대조는 버튼으로 요청 시에만 — 자막은 서버 메모리에서 대조만 하고 버린다.
 */

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hasUnsavedChanges } from "../../_ui/form";
import {
  checkTranscriptOverlap,
  clearPlaceSummary,
  savePlaceSummary,
  type SaveResult,
} from "./actions";

const BANNED_WORDS = ["진짜", "미쳤", "인생", "존맛", "대박", "JMT"];
const JUDGEMENT_WORDS = ["맛있", "맛없", "불친절", "별로"];

const TEMPLATE_HINTS = [
  { tag: "[무엇]", example: "돈카츠 전문점." },
  { tag: "[어디]", example: "도쿄 고토구, 스미요시역 도보 5분." },
  { tag: "[영상 맥락]", example: "10년 단골집으로 소개됨." },
  { tag: "[실용 정보]", example: "오픈 전 대기 발생. 로스카츠 2,000엔대." },
];

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10";
const labelCls = "block text-xs font-medium text-neutral-600";

interface CheckLine {
  level: "ok" | "warn";
  text: string;
}

function runLocalChecks(bullets: string[], filled: string[]): CheckLine[] {
  const lines: CheckLine[] = [];
  const totalChars = filled.join("").length;

  lines.push(
    filled.length >= 3 && filled.length <= 5
      ? { level: "ok", text: `불릿 ${filled.length}개 (3~5)` }
      : { level: "warn", text: `불릿 ${filled.length}개 — 3~5개 권장` },
  );
  lines.push(
    totalChars >= 40 && totalChars <= 200
      ? { level: "ok", text: `글자수 ${totalChars}자 (40~200)` }
      : { level: "warn", text: `글자수 ${totalChars}자 — 40~200자 권장` },
  );

  const banned = new Set<string>();
  const judgement = new Set<string>();
  bullets.forEach((b) => {
    BANNED_WORDS.forEach((w) => {
      if (b.toUpperCase().includes(w.toUpperCase())) banned.add(w);
    });
    JUDGEMENT_WORDS.forEach((w) => {
      if (b.includes(w)) judgement.add(w);
    });
  });
  lines.push(
    banned.size === 0
      ? { level: "ok", text: "금지어 없음" }
      : { level: "warn", text: `금지어: ${[...banned].join(", ")} — 감탄·과장 카피 금지 (7.3)` },
  );
  if (judgement.size > 0) {
    lines.push({
      level: "warn",
      text: `평가 표현: ${[...judgement].join(", ")} — 명예훼손 리스크 (LEGAL.md 4.6)`,
    });
  }
  return lines;
}

export function SummaryEditor({
  placeId,
  initialBullets,
  initialPriceHint,
  videoTitle,
  youtubeVideoId,
  timestampSec,
  mentionNote,
  sourceNote,
  shotYm,
  publicPath,
  nextId,
}: {
  placeId: string;
  initialBullets: string[];
  initialPriceHint: string | null;
  videoTitle: string | null;
  youtubeVideoId: string | null;
  timestampSec: number | null;
  mentionNote: string | null;
  sourceNote: string | null;
  shotYm: string;
  publicPath: string;
  nextId: string | null;
}) {
  const router = useRouter();
  const [result, action, pending] = useActionState<SaveResult, FormData>(savePlaceSummary, {});
  const [bullets, setBullets] = useState<string[]>(
    initialBullets.length > 0 ? initialBullets : ["", "", ""],
  );
  const [goNext, setGoNext] = useState(true);

  // 자막 대조 검사 — 요청 시에만
  const [checking, startCheck] = useTransition();
  const [overlapResult, setOverlapResult] = useState<
    { bulletIndex: number; snippet: string }[] | null | "unavailable"
  >(null);

  // 요약 지우기 — 2단계 확인(실수로 비우는 것과 구분한다)
  const [clearing, startClear] = useTransition();
  const [clearArmed, setClearArmed] = useState(false);
  const [clearResult, setClearResult] = useState<SaveResult>({});

  /**
   * "저장 후 다음"이 같은 화면의 `PlaceEditForm`(별도 폼·별도 저장 버튼) 입력을 말없이
   * 버리는 걸 막는다. 그 폼에 저장 안 한 변경이 있으면 **이동하지 않고** 알린다 —
   * 넘어갈지는 사람이 정한다.
   *
   * 판정은 effect 가 아니라 **제출 순간**(이벤트 핸들러)에 한다. effect 안에서 setState 를
   * 하면 연쇄 렌더가 되고 lint 도 막는다(react-hooks/set-state-in-effect).
   */
  const [holdNext, setHoldNext] = useState(false);
  const heldBack = holdNext && Boolean(result.ok) && goNext && Boolean(nextId);

  const navigatedFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (result.ok && result.ok !== navigatedFor.current) {
      navigatedFor.current = result.ok;
      if (goNext && nextId && !holdNext) router.push(`/admin/place/${nextId}`);
    }
  }, [result.ok, goNext, nextId, holdNext, router]);

  const filled = bullets.map((b) => b.trim()).filter(Boolean);
  const checks = runLocalChecks(bullets, filled);

  const requestOverlapCheck = () => {
    if (!youtubeVideoId || filled.length === 0) return;
    startCheck(async () => {
      const res = await checkTranscriptOverlap(youtubeVideoId, filled);
      setOverlapResult(res.status === "ok" ? res.overlaps : "unavailable");
    });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <form
        action={action}
        // 제출 순간의 형제 폼 상태를 잡아 둔다 — 저장이 끝난 뒤엔 이미 늦다
        onSubmit={() => {
          const placeForm = document.querySelector<HTMLFormElement>("form[data-place-edit]");
          setHoldNext(Boolean(placeForm && hasUnsavedChanges(placeForm)));
        }}
        className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="placeId" value={placeId} />
        <input type="hidden" name="shotYm" value={shotYm} />
        <input type="hidden" name="publicPath" value={publicPath} />

        {/* 템플릿 — 자동 제안 태그 순서대로 쓰면 된다 */}
        <div className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-600">
          <p className="text-xs font-semibold text-neutral-500">템플릿 (7.3)</p>
          <ul className="mt-1 space-y-0.5">
            {TEMPLATE_HINTS.map((h) => (
              <li key={h.tag}>
                <span className="font-medium text-neutral-800">{h.tag}</span> {h.example}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 space-y-2">
          <span className={labelCls}>불릿 (3~5개) — 영상에서 확인된 사실만</span>
          {bullets.map((bullet, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-right text-sm tabular-nums text-neutral-400">
                {i + 1}
              </span>
              <input
                name="bullet"
                value={bullet}
                onChange={(e) =>
                  setBullets((prev) => prev.map((b, j) => (j === i ? e.target.value : b)))
                }
                placeholder={TEMPLATE_HINTS[i]?.example ?? ""}
                className={inputCls}
              />
              <button
                type="button"
                aria-label={`불릿 ${i + 1} 삭제`}
                onClick={() => setBullets((prev) => prev.filter((_, j) => j !== i))}
                disabled={bullets.length <= 1}
                className="shrink-0 rounded px-1.5 py-1 text-sm text-neutral-400 hover:bg-neutral-100 hover:text-red-600 disabled:invisible"
              >
                ⊗
              </button>
            </div>
          ))}
          {bullets.length < 5 ? (
            <button
              type="button"
              onClick={() => setBullets((prev) => [...prev, ""])}
              className="text-sm text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
            >
              + 불릿 추가
            </button>
          ) : null}
        </div>

        <label className="mt-4 block">
          <span className={labelCls}>가격 정보 (선택)</span>
          <input
            name="priceHint"
            defaultValue={initialPriceHint ?? ""}
            placeholder="로스카츠 2,000엔대"
            className={inputCls}
          />
          <span className="mt-1 block text-xs text-amber-700">
            ⚠️ 저장 시 &ldquo;영상 촬영 시점{shotYm ? `(${shotYm})` : ""} 기준&rdquo;이 자동으로
            붙습니다
          </span>
        </label>

        {/* 검사 결과 — 전부 경고, 차단 아님 */}
        <div className="mt-4 rounded-md bg-neutral-50 p-3 text-sm">
          <p className="text-xs font-semibold text-neutral-500">검사 결과</p>
          <ul className="mt-1 space-y-0.5">
            {checks.map((c, i) => (
              <li key={i} className={c.level === "ok" ? "text-neutral-600" : "text-amber-800"}>
                {c.level === "ok" ? "✔" : "⚠"} {c.text}
              </li>
            ))}
            {overlapResult === null ? (
              <li className="text-neutral-400">· 자막 복붙 검사는 아래 버튼으로 실행</li>
            ) : overlapResult === "unavailable" ? (
              <li className="text-neutral-500">· 자막 대조 불가 (자막 없음/조회 실패) — 수동 확인</li>
            ) : overlapResult.length === 0 ? (
              <li className="text-neutral-600">✔ 자막 12자 연속 일치 없음</li>
            ) : (
              overlapResult.map((o, i) => (
                <li key={i} className="text-amber-800">
                  ⚠ 자막과 {o.snippet.length}자 연속 일치 — 불릿 {o.bulletIndex + 1} (&ldquo;
                  {o.snippet}&rdquo;) 다시 쓰기 권장
                </li>
              ))
            )}
          </ul>
          <button
            type="button"
            onClick={requestOverlapCheck}
            disabled={checking || !youtubeVideoId || filled.length === 0}
            className="mt-2 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300"
          >
            {checking ? "자막 대조 중…" : "자막 복붙 검사"}
          </button>
        </div>

        {result.error ? (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {result.error}
          </p>
        ) : null}
        {result.ok ? (
          <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            {result.ok}
            {goNext && !nextId ? " — 미작성 장소가 더 없습니다 🎉" : ""}
          </p>
        ) : null}
        {clearResult.error ? (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {clearResult.error}
          </p>
        ) : null}
        {clearResult.ok ? (
          <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            {clearResult.ok}
          </p>
        ) : null}
        {heldBack && nextId ? (
          <p role="alert" className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            요약은 저장했습니다. 위 <strong>장소 정보 수정</strong>에 저장하지 않은 변경이 있어
            다음 장소로 넘어가지 않았습니다 — 거기서 저장하거나,{" "}
            <button
              type="button"
              onClick={() => router.push(`/admin/place/${nextId}`)}
              className="font-semibold underline underline-offset-2"
            >
              버리고 다음으로 →
            </button>
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-sm text-neutral-600">
            <input type="checkbox" checked={goNext} onChange={(e) => setGoNext(e.target.checked)} />
            저장 후 다음 미작성 장소로
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {pending ? "저장 중…" : nextId ? "저장 후 다음 →" : "저장"}
          </button>
        </div>

        {/* 지우기는 저장과 같은 무게로 보이면 안 된다 — 줄을 나누고 2단계로 잠근다.
            (빈 저장은 여전히 거부된다. 실수로 비우는 길과 일부러 지우는 길을 갈라 둔다.) */}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 pt-3">
          {clearArmed ? (
            <>
              <span className="text-xs text-red-700">
                불릿·문단을 모두 지웁니다. 되돌릴 수 없습니다.
              </span>
              <button
                type="button"
                onClick={() => setClearArmed(false)}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-100"
              >
                취소
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={() =>
                  startClear(async () => {
                    const r = await clearPlaceSummary(placeId, publicPath);
                    setClearResult(r);
                    setClearArmed(false);
                    if (r.ok) setBullets(["", "", ""]);
                  })
                }
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {clearing ? "지우는 중…" : "정말 지우기"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setClearArmed(true)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              요약 지우기
            </button>
          )}
        </div>
      </form>

      {/* 참고 자료 — 복사 버튼 없음: 요약문 복붙 경로 원천 차단 (docs/ADMIN.md 5장) */}
      <aside className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">참고 자료</h2>
        <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
          🔒 자막 파생물 — 그대로 옮기지 말고 사실만 추려 새로 쓰세요
        </p>
        <dl className="mt-3 space-y-2 text-sm text-neutral-700">
          {videoTitle ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500">출처 영상</dt>
              <dd>
                {videoTitle}
                {youtubeVideoId ? (
                  <>
                    {" · "}
                    <a
                      href={`https://www.youtube.com/watch?v=${youtubeVideoId}${timestampSec ? `&t=${timestampSec}s` : ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-neutral-900"
                    >
                      영상 보기
                    </a>
                  </>
                ) : null}
              </dd>
            </div>
          ) : null}
          {mentionNote ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500">언급 메모</dt>
              <dd className="select-none">{mentionNote}</dd>
            </div>
          ) : null}
          {sourceNote ? (
            <div>
              <dt className="text-xs font-medium text-neutral-500">확정 근거</dt>
              <dd className="select-none">{sourceNote}</dd>
            </div>
          ) : null}
        </dl>
      </aside>
    </div>
  );
}
