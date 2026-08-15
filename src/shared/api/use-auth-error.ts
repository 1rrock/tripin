"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "tripin-auth-error";
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  for (const fn of listeners) fn();
}

function read(): string | null {
  return sessionStorage.getItem(KEY);
}

export function clearAuthError() {
  sessionStorage.removeItem(KEY);
  notify();
}

/**
 * 콜백이 `?auth_error=` 로 남긴 코드를, 마이 탭을 눌러 쿼리가 빠져도 유지한다.
 */
export function usePersistedAuthError(urlError: string | null | undefined, linked: boolean) {
  useEffect(() => {
    if (linked) {
      sessionStorage.removeItem(KEY);
      notify();
      return;
    }
    if (urlError) {
      sessionStorage.setItem(KEY, urlError);
      notify();
    }
  }, [urlError, linked]);

  const stored = useSyncExternalStore(subscribe, read, () => null);
  if (linked) return null;
  return urlError ?? stored;
}
