"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { stripLocalePrefix } from "@/shared/i18n/paths";

/**
 * /map 은 헤더·푸터를 쓰지 않는다. `.canvas-root` 가 서기 전에
 * html:has(.canvas-root) 가 안 먹으면 헤더+빈 화면+탭바가 먼저 보인다.
 * 경로만 보고 바로 감춘다.
 */
export function MapRouteChrome() {
  const bare = stripLocalePrefix(usePathname() ?? "/");
  useLayoutEffect(() => {
    const on = bare === "/map" || bare.startsWith("/map/");
    document.documentElement.classList.toggle("is-map", on);
    return () => document.documentElement.classList.remove("is-map");
  }, [bare]);
  return null;
}
