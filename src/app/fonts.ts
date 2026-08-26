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
 * `<link rel=preload>` 로 내보낸다.
 *
 * `preload: false` 인 이유: `display: "swap"` 이라 폰트가 오기 전에도 폴백으로
 * 글자가 이미 보인다. preload 는 스왑 시점을 당길 뿐인데, 그 대가로 800KB 가
 * LCP 이미지와 대역폭을 다툰다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 단을 줄인 다음에도 단당 157KB 였다. 원본이 한글 음절 **11,172자를 전부**
 * 담기 때문이다. 그런데 이 사이트가 실제로 그리는 음절은 DB 콘텐츠와 UI 문구를
 * 다 합쳐 1,180자 — 10.6% 다. 나머지는 한 번도 화면에 안 나오는데 매번 내려갔다.
 * 그래서 `scripts/subset-fonts.mjs` 로 잘라 조각으로 싣는다:
 *
 *   core   실제 등장한 음절 + 원본의 비한글 551자 전부   78KB/단
 *   ext0-3 나머지 음절 전부, 코드포인트 순 4등분         22-31KB/단
 *
 * 홈 첫 진입 실측: **786KB → 393KB** (5단 전부 쓰는 화면 기준, 정확히 절반).
 *
 * 알아 둘 것 — **원본 Paperlogy 는 한글 11,172자 중 2,780자만 실제 윤곽이 있다.**
 * 나머지 8,392자는 cmap 에는 있지만 윤곽이 없는 빈 글리프(advance 1000)다. 즉
 * `쀍`·`쭑` 같은 글자는 **자르기 전에도 빈칸으로 그려지고 있었다** — 조각내면서
 * 생긴 문제가 아니다. 빈 글리프는 다 합쳐 6KB 라 그대로 실어 동작을 보존한다.
 * (사이트가 쓰는 1,180자 중 빈 글리프는 `릳` 하나뿐이다.)
 *
 * ⚠️ **글자가 깨지지 않는다.** 잘라낸 음절을 버린 게 아니라 ext 로 옮겼을 뿐이고,
 *    브라우저는 앞 패밀리에 글자가 없으면 다음 패밀리로 넘어간다. 유저가 저장
 *    목록에 희귀 음절을 치거나 새 인제스트로 못 보던 상호가 들어와도 그때 ext
 *    조각이 받아진다. 커버리지는 원본과 같다 — **코퍼스가 늘었다고 스크립트를
 *    다시 돌릴 필요는 없다.** 다시 돌리는 건 core 히트율을 올리고 싶을 때뿐이다.
 *
 * ⚠️ `declarations` 로 조각마다 **다른 패밀리 이름**을 준다(`Paperlogy`,
 *    `Paperlogy Ext0`…). 처음엔 next/font/google 이 한글에 쓰는 방식대로 25벌을
 *    `Paperlogy` 한 이름으로 묶었는데, 그러면 같은 패밀리 안에서 unicode-range 가
 *    겹치고 CSS 규칙상 **나중에 선언된 face 가 이긴다.** core 의 `U+AC00-D7A3` 안에
 *    ext 범위가 통째로 들어 있어 모든 한글이 ext 로 배정됐고, 브라우저가 조각 25벌을
 *    전부 받았다(922KB — 자르기 전 786KB 보다 나빴다). 구글이 한 이름으로 되는 건
 *    조각마다 **정확한** 범위를 나열해 겹치지 않기 때문인데, 한글은 그 목록이
 *    900구간을 넘어 CSS 가 폰트에서 아낀 것보다 커진다. 그래서 이름을 갈라
 *    globals.css 에서 사슬로 세운다 — 겹칠 일 자체가 없어진다.
 *
 * ⚠️ `adjustFontFallback: false` 인 이유: 켜 두면 next/font 가 조각마다 보정 폴백을
 *    **다섯 벌** 만드는데, 그중 어느 것도 CSS 에서 참조되지 않아(우리는 조각의
 *    `className` 을 안 쓴다) 죽은 @font-face 로만 남는다. 보정 폴백은 globals.css 의
 *    `Paperlogy Fallback` 한 벌로 손수 적었다 — 값 계산법은 그 주석에.
 */

/* 다섯 조각. **모듈 스코프의 `const` 에 직접 대입해야 한다** — next/font 로더는
   AST 를 정적으로 읽으므로 헬퍼 함수로 묶으면 "Font loaders must be called and
   assigned to a const in the module scope" 로 빌드가 죽는다. 그래서 25줄이 펼쳐져 있다.

   ⚠️ `variable` 을 주고 `className` 은 쓰지 않는다. `className` 은 `font-family` 를
      next/font 가 지어낸 이름으로 **덮어쓰는데**, 우리는 그 이름을 declarations 로
      `Paperlogy` 로 바꿔 버려서 그 이름의 @font-face 가 존재하지 않는다. 얹는 순간
      `<html>` 의 글꼴이 없는 패밀리를 가리켜 브라우저 기본 글꼴로 떨어진다.
      `variable` 은 CSS 변수만 선언하므로 안전하다(값은 쓰지 않는다).

   범위는 `scripts/subset-fonts.mjs` 가 산출한 subset/manifest.json 과 같아야 한다.
   스크립트를 다시 돌렸는데 코퍼스가 바뀌었으면 ext 경계도 바뀐다 — manifest 를 보고 옮겨라. */

const paperCore = localFont({
  variable: "--font-paper-core",
  src: [
    {
      path: "./fonts/subset/Paperlogy-400-core.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-500-core.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-600-core.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-700-core.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-900-core.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "Paperlogy" },
    {
      prop: "unicode-range",
      value:
        "U+0020-2FFF,U+3008-33DD,U+AC00-D7A3,U+1F10B-1F10C",
    },
  ],
});

const paperExt0 = localFont({
  variable: "--font-paper-ext0",
  src: [
    {
      path: "./fonts/subset/Paperlogy-400-ext0.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-500-ext0.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-600-ext0.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-700-ext0.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-900-ext0.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "Paperlogy Ext0" },
    { prop: "unicode-range", value: "U+AC02-B6F8" },
  ],
});

const paperExt1 = localFont({
  variable: "--font-paper-ext1",
  src: [
    {
      path: "./fonts/subset/Paperlogy-400-ext1.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-500-ext1.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-600-ext1.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-700-ext1.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-900-ext1.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "Paperlogy Ext1" },
    { prop: "unicode-range", value: "U+B6F9-C1E8" },
  ],
});

const paperExt2 = localFont({
  variable: "--font-paper-ext2",
  src: [
    {
      path: "./fonts/subset/Paperlogy-400-ext2.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-500-ext2.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-600-ext2.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-700-ext2.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-900-ext2.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "Paperlogy Ext2" },
    { prop: "unicode-range", value: "U+C1E9-CCD3" },
  ],
});

const paperExt3 = localFont({
  variable: "--font-paper-ext3",
  src: [
    {
      path: "./fonts/subset/Paperlogy-400-ext3.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-500-ext3.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-600-ext3.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-700-ext3.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/subset/Paperlogy-900-ext3.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "Paperlogy Ext3" },
    { prop: "unicode-range", value: "U+CCD4-D7A2" },
  ],
});

export const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/**
 * `<html>` 에 그대로 얹는 클래스 묶음 — 두 루트가 같은 값을 써야 폰트가 갈리지 않는다.
 *
 * 조각들의 `variable` 을 얹는 것은 폰트를 **적용**하려는 게 아니다(적용은
 * globals.css 의 `--font-sans` 가 `Paperlogy` 를 직접 부른다). 이 참조가 있어야
 * 번들러가 다섯 모듈을 살려 두고 @font-face 25벌이 CSS 에 들어간다.
 */
export const fontClasses = [
  paperCore.variable,
  paperExt0.variable,
  paperExt1.variable,
  paperExt2.variable,
  paperExt3.variable,
  archivo.variable,
  "h-full antialiased",
].join(" ");
