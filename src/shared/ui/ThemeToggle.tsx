"use client";

/**
 * 라이트/다크 토글.
 *
 * 값은 3상태다 — "system"(OS 따름) / "light" / "dark".
 * system 일 때는 `data-theme` 속성을 아예 지워서 globals.css 의
 * `prefers-color-scheme` 미디어쿼리가 다시 주도권을 갖게 한다.
 *
 * ⚠️ 초기값을 여기서 계산하면 안 된다 — 서버 HTML 은 테마를 모르므로
 *    첫 페인트가 라이트로 나갔다가 뒤집히는 깜빡임(FOUC)이 생긴다.
 *    실제 적용은 layout.tsx 의 인라인 스크립트가 하이드레이션 전에 끝내고,
 *    이 컴포넌트는 마운트 후 그 결과를 읽어 UI 만 맞춘다.
 */

import { useSyncExternalStore } from "react";

type Mode = "system" | "light" | "dark";

const STORAGE_KEY = "tripin-theme";
const EVENT = "tripin-theme-change";
const ORDER: Mode[] = ["system", "light", "dark"];

/**
 * 테마는 React 밖(문서 루트의 data-theme)에 산다 — 인라인 스크립트가 하이드레이션
 * 전에 이미 써넣기 때문이다. 그래서 useState 로 복제하지 않고 외부 스토어로 구독한다.
 * (effect 안에서 setState 하는 패턴은 하이드레이션 이후 한 프레임 어긋난 상태를 만든다)
 */
function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function getSnapshot(): Mode {
  const v = document.documentElement.getAttribute("data-theme");
  return v === "light" || v === "dark" ? v : "system";
}

/** 서버는 사용자의 선택을 알 수 없다 — 중립값으로 시작해 하이드레이션 불일치를 막는다. */
function getServerSnapshot(): Mode {
  return "system";
}

const LABEL: Record<Mode, string> = {
  system: "시스템 설정",
  light: "라이트",
  dark: "다크",
};

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  try {
    if (mode === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // 사파리 프라이빗 모드 등 — 저장만 실패하고 적용은 유지된다
  }
  window.dispatchEvent(new Event(EVENT));
}

function SunIcon() {
  return (
    <svg
      aria-hidden
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z" />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg
      aria-hidden
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 3.6v16.8" />
      <path d="M12 20.4a8.4 8.4 0 0 0 0-16.8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const ICON: Record<Mode, () => React.ReactElement> = {
  system: AutoIcon,
  light: SunIcon,
  dark: MoonIcon,
};

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const next = () => {
    const i = ORDER.indexOf(mode);
    apply(ORDER[(i + 1) % ORDER.length]!);
  };

  const Icon = ICON[mode];

  return (
    <button
      type="button"
      onClick={next}
      aria-label={`화면 테마: ${LABEL[mode]} — 눌러서 변경`}
      title={LABEL[mode]}
      className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-line text-ink-soft transition hover:bg-fill hover:text-ink active:scale-[0.95]"
    >
      <Icon />
    </button>
  );
}
