import { Archivo } from "next/font/google";
import localFont from "next/font/local";

/**
 * 서체 — 두 루트 레이아웃((public)/[lang] · admin)이 공유한다.
 *
 * 페이퍼로지(Paperlogy) — 한글 구조와 본문. 굵기로 얼굴을 가른다(700/800 제목, 400/500 본문).
 * Archivo — 라틴 숫자 tabular. 타임코드·개수 정렬.
 *
 * next/font 셀프호스팅 — 외부 요청이 LCP 앞에 끼지 않는다.
 *
 * 실제 쓰는 5단만 싣는다. 9단을 다 선언했을 때 Thin·ExtraLight·Light·ExtraBold 는
 * 코드에서 한 번도 참조되지 않는데, next/font 는 선언된 src 를 전부
 * `<link rel=preload>` 로 내보낸다. 한글 woff2 는 단당 ~160KB — 안 쓰는 4단이
 * 매 페이지 634KB 를 LCP 앞에 밀어 넣고 있었다.
 *
 * `preload: false` 인 이유: `display: "swap"` 이라 폰트가 오기 전에도 폴백으로
 * 글자가 이미 보인다. preload 는 스왑 시점을 당길 뿐인데, 그 대가로 800KB 가
 * LCP 이미지와 대역폭을 다툰다.
 */
export const paper = localFont({
  src: [
    { path: "./fonts/Paperlogy-4Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Paperlogy-5Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Paperlogy-6SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Paperlogy-7Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Paperlogy-9Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-paper",
  display: "swap",
  preload: false,
});

export const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/** `<html>` 에 그대로 얹는 클래스 묶음 — 두 루트가 같은 값을 써야 폰트가 갈리지 않는다. */
export const fontClasses = `${paper.variable} ${archivo.variable} h-full antialiased`;
