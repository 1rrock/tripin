---
name: Tripin
description: 여행 유튜버가 간 곳만, 지도로 — 한국형 정보 서비스 표준(캐논)
colors:
  paper: "#fffdf8"
  card: "#ffffff"
  fill: "#f4efe6"
  ink: "#141414"
  ink-soft: "#5d5a52"
  line: "#e5e0d4"
  brand: "#ff5a3c"
  on-brand: "#23120c"
  lemon: "#ffd43a"
  on-lemon: "#231a00"
  ink-fixed: "#141414"
  mint: "#25d0a0"
  sky: "#3f8cff"
typography:
  hero:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "36px"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  hero-lg:
    fontSize: "48px"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  og-card:
    fontFamily: "KR, Noto Sans KR, sans-serif"
    fontSize: "72px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  page-title:
    fontSize: "30px"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  card-title:
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.25
  wordmark:
    fontSize: "22px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.025em"
  cta:
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1
  place:
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "-0.015em"
  meta:
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.4
  caption:
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.625
  tag:
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
rounded:
  tag: "6px"
  row: "12px"
  card: "16px"
  sheet: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  row: "20px"
  gutter: "24px"
  card: "24px"
  section: "64px"
components:
  button-cta:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.cta}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  pill-video:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    minHeight: "36px"
  pill-map:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    minHeight: "36px"
  pill-pick:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    minHeight: "36px"
  pill-pick-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
  chip-filter:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "8px 14px"
  chip-filter-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  chip-lemon:
    backgroundColor: "{colors.lemon}"
    textColor: "{colors.on-lemon}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  chip-lemon-hover:
    backgroundColor: "{colors.on-lemon}"
    textColor: "{colors.lemon}"
  card-creator:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    borderColor: "{colors.line}"
    borderWidth: "1px"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  row-place:
    borderBottomColor: "{colors.line}"
    borderBottomWidth: "1px"
    padding: "20px 4px"
  row-place-active:
    backgroundColor: "color-mix(in srgb, {colors.lemon} 32%, {colors.card})"
    rounded: "{rounded.row}"
    padding: "20px 16px"
  card-dashed:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink-soft}"
    borderColor: "{colors.line}"
    borderStyle: "dashed"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  badge-initial:
    typography: "{typography.card-title}"
    borderColor: "{colors.line}"
    borderWidth: "1px"
    rounded: "{rounded.full}"
    size: "64px"
  badge-number:
    backgroundColor: "{colors.hl}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    size: "28px"
  badge-notice:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "6px 14px"
  tag-type:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.tag}"
    rounded: "{rounded.tag}"
    padding: "2px 6px"
  bar-picked:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "12px 10px 12px 20px"
---

# Design System: Tripin

## Overview

**Creative North Star: 캐논 — 한국형 정보 서비스 표준**

Tripin의 지면은 조용하다. 웜 화이트(#fffdf8) 위에 잉크 텍스트와 1px 괘선만 있고, 위계는 **여백과 타이포 크기**가 혼자 만든다. 품질 기준선은 토스·카카오맵·당근·트리플 — 한국 사용자가 "잘 만든 서비스"라고 인식하는 그 밀도와 절제다.

이 월드는 두 가지를 명시적으로 거부한다. 첫째, **회색 정보 대시보드** — 저채도 파랑과 소프트 블러 그림자로 만든 "믿음직해 보이는" 관리도구는 이 제품이 파는 감정과 무관하다. 둘째, **편집자막 월드** — 유튜브의 트레이드 드레스(빨강 주조, 재생버튼 클론, 자막 박스, 썸네일 문법)를 흉내 내면 비공식 디렉터리라는 법적·인지적 포지션이 무너진다. Tripin은 유튜브의 껍데기가 아니라 유튜브로 나가는 **출구**다.

색은 아껴 쓴다. 지면의 대부분은 웜 화이트와 잉크 텍스트이고, 코랄은 담은 것에, 레몬은 눈이 멈춰야 할 곳에, 크리에이터 액센트는 인덱스에만 찍힌다. 셋은 섞이지 않는다.

> **결정 이력 (2026-08-05).** 이 문서는 2026-08-04에 채택됐던 "Color Pop"(잉크 2px 보더 + 하드 오프셋 그림자 + 900 빅타이포 44~84px)을 **대체한다.** 당시 홈·허브만 Color Pop으로 구현되고, 자원 80%가 들어간 핵심 화면(`/c/[creator]/[city]`)은 캐논으로 구현되어 제품이 두 월드로 갈라져 있었다. 사용자가 캐논으로 통일하기로 결정했다. 트레이드오프: 랜딩의 시각적 차별성을 포기하고 전 화면 일관성을 얻었다. **하드 오프셋 그림자, 2px 잉크 보더, 회전 스티커, 84px 히어로는 이 시스템에 존재하지 않는다.**

> **결정 이력 (2026-08-06).** 이 문서가 "다크 모드 없음 — 이 월드는 종이 한 장이다"라고 금지하는 동안 코드에는 **라이트/다크 2테마가 이미 완성돼 있었다** (`globals.css`의 11개 토큰 × 2테마, `ThemeToggle`의 3상태 토글, `layout.tsx`의 FOUC 방지 스크립트). 문서가 아니라 코드가 진실이므로 이 문서를 코드에 맞췄다. 함께 정정된 것: `--white` → `--card`(코드의 실제 이름), 잉크 지면 위 글자색은 `--paper`(흰색이 아니다), 코랄 위 글자색은 `--on-brand`(잉크가 아니다 — 다크에서 2.30:1로 무너진다). 대비비는 두 테마 모두 재실측했다.
>
> 그 과정에서 **다크 테마 파손 3건**이 드러나 같은 날 고쳤다. 원인은 하나다 — *테마를 따라가지 않는 지면 위에 테마를 따라가는 글자색을 썼다.* ① 레몬 지면 위 `--ink` → 다크에서 **1.16:1**(홈 티커·워드마크·도시 칩 등 10곳), ② 레몬 칩의 hover 반전이 `--ink` 지면으로 가서 레몬 글자가 다시 사라짐, ③ 크리에이터 액센트·지도 핀 위 `--ink`(밝은 액센트 + 다크 테마). `--on-lemon`·`--ink-fixed`·`--hl-under` 세 토큰을 도입해 해소했고, 최악값이 1.16 → **6.23**이 됐다. `Explorer.tsx`의 선택 행 틴트에 하드코딩돼 있던 `white`도 `var(--card)`로 바꿨다(`Timeline.tsx`는 원래 맞게 쓰고 있었다).

**Key Characteristics:**
- `--paper` 지면(라이트 = 웜 화이트 `#fffdf8` / 다크 = `#0b0d10`) + 1px `--line` 괘선 — 형태는 획이 아니라 여백이 만든다
- 그림자는 모바일 시트 하나뿐 (`--shadow-sheet`) — 그 외 전부 없음
- Pretendard 단일 서체, 위계는 크기와 웨이트(400–900)로만
- 코랄 = 담은 것, 레몬 = 하이라이트, 크리에이터 액센트 = 인덱스
- 누를 수 있는 것은 필(pill), 담고 있는 것은 12~24px 라운드 카드
- 라이트/다크 2테마 — 토큰 **이름**을 공유하고 값만 갈린다. 프로필 사진 없음, 사진·일러스트·그라디언트 없음
- authored 모션은 화면당 하나

> 이 문서의 근거는 공개 화면(홈, 채널 허브, 채널×도시 탐색, 공용 MapView)이다.
> `/admin` 이하는 이 시스템의 규범이 아니다 — 어드민을 근거로 새 값을 만들지 않는다.

## Colors

이 시스템은 **라이트/다크 두 테마**를 가진다. 토큰 **이름**은 두 테마가 공유하고 값만 갈리므로, 컴포넌트는 테마를 모른 채 `bg-paper text-ink`만 쓴다. **컴포넌트 안에 `dark:` 분기를 만들지 않는다 — 값은 `globals.css`에서만 바뀐다.** 해상 순서는 OS 설정(`prefers-color-scheme`) → 사용자 토글(`html[data-theme]`)이며 토글이 항상 이긴다.

| 토큰 | 라이트 | 다크 | 역할 |
|---|---|---|---|
| `--paper` | `#fffdf8` | `#0b0d10` | 지면. 전 페이지 배경 |
| `--card` | `#ffffff` | `#14171c` | 카드 지면 — 지면과 미세하게 구분된다 |
| `--fill` | `#f4efe6` | `#1b2027` | 칩·태그·비활성 필의 필 지면 |
| `--ink` | `#141414` | `#e9ebee` | 본문·제목·활성 반전 지면 |
| `--ink-soft` | `#5d5a52` | `#97a0ad` | 보조 텍스트(주소·메타·고지) |
| `--line` | `#e5e0d4` | `#2a3038` | 1px 괘선·보더 |
| `--brand` | `#ff5a3c` | `#ff6f4d` | 코랄 — 담은 상태, 화살표 뱃지 |
| `--on-brand` | `#23120c` | `#23120c` | **코랄 지면 위 글자색. 두 테마 공통 고정값** |
| `--lemon` | `#ffd43a` | `#ffd84d` | 하이라이트 — 밑줄·티커·도시 칩·선택 틴트 |
| `--on-lemon` | `#231a00` | `#231a00` | **레몬 지면 위 글자색이자 반전 시 지면. 고정값** |
| `--ink-fixed` | `#141414` | `#141414` | **테마 밖 지면(액센트·지도 핀) 위 잉크. 고정값** |
| `--hl-under` | `inset 0 -0.32em` | `inset 0 -0.12em` | 히어로 레몬 밑줄의 띠 높이 |
| `--mint` | `#25d0a0` | `#3fbfa6` | 예비. 공개 화면에서 사용하지 않는다 |
| `--sky` | `#3f8cff` | `#7d9bff` | `--hl`의 기본값 |
| `--hl` | 런타임 주입 (기본 `--sky`) | 동일 | 크리에이터 `accent_color`. 번호 뱃지·지도 핀·선택 강조 **3표면만** |
| `--shadow-sheet` | `0 -10px 30px rgba(20,20,20,.1)` | `0 -10px 30px rgba(0,0,0,.5)` | 이 시스템의 유일한 그림자 |

### 대비 규칙 (WCAG AA)

두 테마 모두 실측했다 (2026-08-06):

| 조합 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| ink / paper | 18.12 | 16.29 | 본문 ✓ |
| ink / card | 18.42 | 15.04 | 카드 위 본문 ✓ |
| ink / fill | 16.09 | 13.71 | 필 칩 텍스트 ✓ |
| paper / ink | 18.12 | 16.29 | 잉크 필 텍스트(반전) ✓ |
| ink-soft / paper | 6.77 | 7.36 | 보조 텍스트 ✓ |
| ink-soft / card | 6.89 | 6.80 | 카드 위 보조 텍스트 ✓ |
| **on-brand / brand** | **5.83** | **6.56** | **코랄 위 텍스트** ✓ |
| **on-lemon / lemon** | **12.08** | **12.45** | **레몬 위 텍스트** ✓ |
| **lemon / on-lemon** | **12.08** | **12.45** | 레몬 칩 hover 반전 ✓ |
| **ink-fixed / 액센트** | 액센트 의존 | 동일 | 밝은 액센트 위 이니셜·핀 번호 ✓ |
| ink / 선택 행 틴트 | 16.31 | 6.23 | 레몬 32% + `--card` ✓ |
| ~~ink / brand~~ | ~~5.95~~ | ~~2.30~~ | 다크에서 미달 — `--on-brand`로 대체됐다 |
| ~~ink / lemon~~ | ~~12.92~~ | ~~1.16~~ | 다크에서 파손 — `--on-lemon`으로 대체됐다 |
| ~~card / brand~~ | ~~3.10~~ | ~~6.53~~ | 라이트에서 미달 — 흰 텍스트를 쓰지 않는 이유 |

**The Fixed-Ink-On-Color Rule.** **테마를 따라가지 않는 지면 위에서는 글자색도 테마를 따라가면 안 된다.** 코랄·레몬은 두 테마에서 같은 밝은 중간톤이고, 크리에이터 액센트와 지도 타일은 아예 테마 밖(DB·외부 서비스)에서 온다. 이 지면들 위에서 `--ink`를 쓰면 다크 테마에서 밝은 글자가 밝은 지면에 얹혀 무너진다 — 코랄 2.30:1, 레몬 **1.16:1**. 그래서 고정 글자색 세 개가 존재한다:

| 토큰 | 값 | 쓰는 지면 |
|---|---|---|
| `--on-brand` | `#23120c` | 코랄 |
| `--on-lemon` | `#231a00` | 레몬 (기본 글자색이자 hover 반전의 지면) |
| `--ink-fixed` | `#141414` | 크리에이터 액센트, 지도 핀 — 어두운 액센트 위에는 흰색(`isDarkHex` 분기) |

코랄·레몬 위 **아이콘**(화살표 뱃지 등)은 비텍스트 요소라 3:1 기준을 통과하므로 반전색을 허용한다.

**레몬의 반전은 레몬을 뒤집는다.** 레몬 칩의 hover는 `--ink` 지면으로 가지 않는다 — 다크에서 `--ink`는 밝은 색이라 레몬 글자가 다시 사라진다. 대신 `--on-lemon` 지면 + `--lemon` 글자로 뒤집어, 두 테마에서 똑같이 12:1 이상으로 선다.

`.hl-under`(히어로 레몬 밑줄)의 띠 높이도 테마 토큰이다(`--hl-under`). 라이트에서는 글자를 관통하는 형광펜(`-0.32em`, 글자가 잉크라 읽힌다), 다크에서는 글자가 밝으므로 겹치지 않게 baseline 아래로 내린 밑줄(`-0.12em`)이 된다.

## Typography

Pretendard 하나로 전부 해결한다. 전역 자간 -0.015em, 디스플레이 단계에서 -0.025em으로 조인다. 숫자가 나오는 모든 곳(장소 수·타임스탬프·핀 번호·도시 카운트)에 `.tnum`으로 tabular-nums를 강제해 스크롤 중 숫자가 흔들리지 않게 한다.

### Hierarchy
- **Hero** (900, 36px → `hero-lg` 48px at `sm`, 1.15): 홈 H1 단 하나. 세 줄로 직접 끊어 쓰며 2행 키워드에 레몬 밑줄이 붙는다.
- **Page Title** (900, 30px): 조각 페이지 H1(`{크리에이터}의 {도시}`), 채널 허브 H1, 홈의 섹션 헤드.
- **Card Title** (700, 20px): 크리에이터 카드의 채널명, 도시 카드의 도시명.
- **Wordmark** (900, 22px): 헤더 로고 "Trip[in]".
- **CTA** (800, 16px): 홈 히어로 버튼 라벨.
- **Place** (700, 17px, 1.375): 장소 리스트의 장소명 — 가장 먼저 읽혀야 하는 단위.
- **Body** (400, 15px, 1.625): 요약 불릿·인트로. 좌측 정렬 `max-w-2xl`(672px) 캡 — 15px 한국어로 한 줄 약 45자.
- **Meta** (400, 13px): 통계 줄, 주소, 부가 정보.
- **Label** (700, 13px): 모든 칩·필·버튼. "누를 수 있는 것"의 크기.
- **Caption** (400, 12px): 브레드크럼, 푸터 고지, 헤더 고지 뱃지.
- **Tag** (600, 11px): 장소 타입 태그.

### Named Rules

**The Weight Carries Hierarchy Rule.** 위계는 크기와 웨이트가 만든다. 색으로 제목을 강조하지 않고, 대문자·자간 확장 라벨을 쓰지 않는다.

**The Keep-All Rule.** 한국어는 어절 단위로만 줄바꿈한다(`word-break: keep-all` 전역). 히어로처럼 줄 구성이 의미를 만드는 곳은 `<br>`로 직접 끊는다.

**The Korean Measure Rule.** 줄길이는 **한국어 글자수로 센다 — 라틴 ch가 아니다.** 한글은 전각이라 1자 ≈ 1em이고, 영문 기준 "65–75ch"를 그대로 적용하면 실제로는 두 배 가까이 긴 줄이 나온다. 편안한 범위는 **한 줄 35–45자**이며, 폰트 크기별 상한은 이렇게 계산한다:

| 텍스트 크기 | 45자 기준 폭 | 쓰는 캡 |
|---|---|---|
| 15px 본문 | 675px | `max-w-2xl` (672px) |
| 13px 메타 | 585px | `max-w-xl` (576px) |
| 12px 고지 | 540px | `max-w-lg` (512px) |

자동 도구가 "112 chars/line" 같은 수치를 낼 때는 라틴 기준 추정치(0.5em/자)이므로 한국어 실측의 약 두 배다 — 숫자를 그대로 믿지 말고 위 표로 환산한다. **폭 제한이 없는 문단은 컨테이너 폭(`max-w-6xl` = 1152px, 12px에서 92자)을 그대로 받으므로, 읽어야 하는 모든 문단에는 캡을 명시한다.**

**The Two-Step Rule.** 히어로(36/48)와 페이지 타이틀(30) 사이에 최소 한 단계가 유지돼야 한다. 히어로를 30px대로 내리면 홈의 위계가 무너진다.

**The One Typeface Rule — 그리고 그 단 하나의 예외.** 화면에서는 Pretendard 하나만 쓴다. 대비가 필요하면 웨이트(400–900)로 해결한다.

**예외: OG 카드(`og-card`).** `next/og`의 `ImageResponse`는 서버에서 렌더되므로 CDN 동적 서브셋 Pretendard를 쓸 수 없고, 폰트를 주지 않으면 한글이 두부(□□□)로 나온다. 그래서 `src/app/opengraph-image.tsx`와 조각별 OG 라우트만 **Noto Sans KR**(800/500)을 구글 폰트 API에서 렌더 시점에 받아 `KR`이라는 이름으로 등록한다. 필요한 글리프만 `&text=`로 서브셋한다.

이 예외의 경계는 명확하다 — **OG 이미지 두 파일 밖에서 `KR`/Noto Sans KR을 쓰지 않는다.** 브라우저 화면에 두 번째 서체가 들어오는 순간 이 규칙은 깨진 것이다. 언젠가 Pretendard의 정적 TTF/OTF를 번들할 수 있게 되면 이 예외는 제거한다.

## Layout

**컨테이너**: `max-w-6xl`(1152px) + `px-6 md:px-8` 거터. 모바일 375px 기준으로 설계하고 위로 확장한다.

**홈**: 단일 컬럼. 히어로(상하 64px) → 전폭 레몬 티커(컨테이너를 벗어나 화면 끝까지) → 크리에이터 그리드(`auto-fill, minmax(300px, 1fr)`, 24px 갭).

**채널 허브**: 브레드크럼 → 이니셜 뱃지 + 채널명 헤더 → 도시 카드 그리드(홈과 같은 그리드 규칙). 도시가 하나뿐이면 그 조각으로 즉시 리다이렉트한다 — 고를 게 없는 화면은 보여주지 않는다.

**조각 화면(채널×도시)**: 사실상 두 개의 다른 레이아웃이다.
- **모바일**: 지도가 상단 38dvh를 잡고, 장소 시트가 24px 겹쳐 올라탄다(상단만 24px 라운드 + 시트 그림자). 지도 앱의 문법을 그대로 쓴다.
- **`lg` 이상**: `minmax(0, 26rem) 1fr` 2컬럼 그리드. 좌측이 리스트, 우측이 `sticky top-20`의 지도 카드(높이 `calc(100dvh - 6.5rem)`, 16px 라운드). 시트의 라운드·그림자는 이 단계에서 전부 해제된다.

**칩 스트립**: 필터 칩 행은 모바일에서 거터를 뚫고(`-mx-6 px-6`) 가로 스크롤되며 스크롤바를 숨긴다(`.no-scrollbar`). `lg`에서는 wrap으로 전환된다.

**리듬**: 4px 배수. 카드 내부 24px, 리스트 행 상하 20px, 요소 간 8–12px, 섹션 간 64px. 본문 컬럼은 언제나 좌측 정렬 캡 — 가운데 정렬은 헤더의 정렬선을 깨뜨리므로 쓰지 않는다.

**고정 요소**: 헤더는 `sticky top-0`(높이 64px, 1px 하단 괘선, z-20). 담은 목록 바는 `fixed bottom-0`(z-30)이며 `safe-area-inset-bottom`을 존중하고, 마지막 항목이 가려지지 않도록 80px 스페이서를 함께 렌더한다.

## Elevation & Depth

**이 시스템에는 그림자가 거의 없다.** 깊이는 지면 대비(paper vs white)와 1px 괘선, 그리고 여백이 만든다. 유일한 예외가 모바일 시트다 — 지도 위로 올라타는 시트는 지면이 아니라 **레이어 경계**를 표현해야 하므로 부드러운 상향 그림자를 쓴다. `lg` 이상에서는 이 그림자도 제거된다.

### Shadow Vocabulary
- **시트 섀도** (`box-shadow: var(--shadow-sheet)` → 라이트 `0 -10px 30px rgba(20,20,20,.1)` / 다크 `0 -10px 30px rgba(0,0,0,.5)`): 유일한 그림자. 모바일 시트 상단 경계 전용. 다크에서 더 깊은 이유는 어두운 지면 위에서 같은 알파가 보이지 않기 때문이다.
- **포커스 링** (`outline: 2px solid var(--ink); outline-offset: 2px`): 전역 키보드 포커스.
- **반전 포커스 링** (`.focus-ring-invert` → `outline-color: var(--paper)`): **잉크 지면 위에 앉은 인터랙티브 요소 전용.** 잉크 링이 잉크 지면과 1:1 로 같아져 포커스가 완전히 사라지는 것을 막는다 (WCAG 2.4.7). 현재 적용처는 담은 목록 바 안의 "링크 복사" 하나다.

**⚠️ Tailwind 유틸리티로 포커스 링을 덮으려 하지 말 것.** `focus-visible:outline-paper` 같은 유틸리티는 `@layer utilities` **안**에 생성되는데, 전역 `:focus-visible` 은 레이어 **밖**에 있다. **레이어 없는 CSS 는 레이어 CSS 를 특이도와 무관하게 항상 이긴다** — 유틸리티는 조용히 먹지 않고, 육안으로는 고쳐진 것처럼 보인다. 포커스 링 재정의는 반드시 `globals.css` 의 레이어 밖 영역에 클래스로 작성한다.

### Named Rules

**The One Shadow Rule.** 모바일 시트 외에 그림자를 도입하지 않는다. 하드 오프셋 그림자(`4px 4px 0`)는 이전 월드의 것이며 **삭제됐다**. 카드가 떠 보여야 한다고 느껴지면 그림자가 아니라 여백이나 지면 대비를 조정한다.

**The Move-Not-Glow Rule.** 상태 변화는 밝기가 아니라 배경 전환과 눌림으로 말한다 — hover는 `bg-fill` → `bg-line`, active는 `active:scale-[0.97]`. 색만 바뀌고 반응이 없는 인터랙션은 죽은 것처럼 보인다.

## Shapes

**여백이 형태를 만든다.** 카드는 1px `--line` 보더 또는 지면 대비만으로 선다. 리스트는 카드를 나열하는 대신 **1px 괘선으로 나누고**, 선택된 항목만 라운드 틴트 블록으로 승격시켜 위계를 만든다.

**라운드 스케일**은 요소 크기에 비례한다: 태그 6px → 선택 행 12px → 카드·지도 카드 16px → 모바일 시트 24px → 모든 인터랙티브 요소는 완전한 필(9999px). **누를 수 있는 것은 둥글고, 담고 있는 것은 각지다.**

**회전은 쓰지 않는다.** 이전 월드의 서명이었던 3–8도 스티커 회전은 전부 제거됐다.

**아이콘**은 인라인 SVG로만, 10–16px, `stroke-width` 1.4–2, 라운드 캡·조인. 아이콘 폰트나 외부 아이콘 패키지를 쓰지 않는다. 사진·일러스트는 시스템 전체에 없다.

## Components

### Buttons
- **Shape:** 완전한 필(9999px). 모든 버튼은 예외 없이 알약이다.
- **Primary (홈 CTA):** 잉크 지면 + `--paper` 텍스트, 높이 48px, 좌우 24px, 15px/800. hover `opacity-85`, active `scale-[0.97]`.
- **액션 필 (장소 행):** 최소 높이 36px, 좌우 14px, 13px 라벨. 셋이 한 줄에 서고 **역할별로 지면이 다르다** — 영상 = 잉크 채움(주 행동), 지도 = 베이지 필(보조), 담기 = 베이지 필 → 담은 뒤 **코랄 채움 + 잉크 텍스트** + 채워진 북마크 아이콘.
- **Focus:** 전역 잉크 2px 포커스 링(offset 2px). 버튼별 커스텀 포커스 스타일을 만들지 않는다.

### Chips
- **필터 칩:** 베이지 필 지면, 13px/700, 8px 14px 패딩, 보더 없음. 활성 시 **잉크 반전**, 비활성 hover는 `--line`. `<Link scroll={false}>`로 구현되어 JS 없이도 동작한다.
- **레몬 칩 (도시 · 다음 행동):** 레몬 지면 + 잉크 텍스트, 13px/800. hover 시 잉크 지면 + 레몬 텍스트로 반전 — 색을 바꾸는 게 아니라 뒤집는다.
- **타입 태그:** 베이지 필 지면 + 6px 라운드 + 11px 소프트 잉크. 인터랙티브하지 않으므로 필이 아니다.

### Cards / Containers
- **크리에이터·도시 카드:** 16px 라운드, `--card` 지면, 1px `--line` 보더, 24px 패딩. 우상단에 코랄 원형 화살표 뱃지(44px), 좌상단에 크리에이터 액센트 이니셜 뱃지(64px). hover는 지면 전환으로 표현한다.
- **장소 행:** 카드가 아니라 **괘선 행**이다 — 1px `--line` 하단 보더, 상하 20px. 선택 시 **레몬 32% 틴트**(`color-mix(in srgb, var(--lemon) 32%, white)`) + 12px 라운드 블록으로 승격한다. 내부는 번호 뱃지(28px 원, 액센트) + 본문 컬럼 구조.
- **대시 컨테이너:** 준비 중 채널 카드와 "위치 확인 중" 섹션은 `border-dashed border-line`. 확정된 것과 **획의 종류로** 구분된다.
- **모바일 시트:** 상단만 24px 라운드, 웜 페이퍼 지면, 시트 섀도. `lg`에서 라운드·그림자 모두 해제.

### Navigation
- **헤더:** `sticky`, 높이 64px, 웜 페이퍼 지면, 1px 하단 괘선. 좌측 워드마크("Trip" + 레몬 블록 "in", 6px 라운드, **회전 없음**), 우측에 잉크 필 고지 뱃지("비공식 · 출처는 전부 영상"). 이 뱃지는 장식이 아니라 전 페이지 고정 법적 고지의 일부다.
- **브레드크럼:** 12px 소프트 잉크, 구분자는 텍스트 글리프가 아니라 10px 셰브론 SVG. 마지막 항목만 잉크.
- **푸터:** 1px 상단 괘선 + `--card` 지면, 12px 소프트 잉크 고지 블록.

### 이니셜 뱃지 (Signature)
프로필 사진을 쓸 수 없다는 법적 제약이 이 월드의 서명 컴포넌트를 만들었다. 64px 원 + 1px `--line` 보더 + 크리에이터 `accent_color` 지면 + 20px/900 이니셜. 글자색은 `isDarkHex()`가 잉크/화이트로 자동 분기한다. **채널을 구분하는 것은 사진이 아니라 색과 글자다.**

### 지도 번호 핀 (Signature)
액센트 원(최소 너비 28px, 높이 28px, 완전한 필) + 잉크 링 + 13px/700 tabular 숫자. 활성 시 **잉크 반전 + `scale(1.2)`**(`.12s ease-out`, z-index 1000). 핀 번호는 리스트 번호와 언제나 1:1이며, 이 연동이 지도와 리스트를 하나의 물건으로 만든다.

지도가 로딩 중일 때는 문구 대신 **형태로 기다린다** — 베이지 필 위에 라인 컬러 막대(도로선)와 원(핀 자리)을 배치한 스켈레톤이 펄스한다(`prefers-reduced-motion`에서 정지). 실패 시에는 회색 박스가 아니라 도로선 SVG 스케치 + "지도를 잠시 불러오지 못했어요 — 목록만으로도 모든 장소를 확인할 수 있어요" + 잉크 필 재시도 버튼. 좌하단에는 "전체 핀 보기" 원형 버튼(40px, 웜 페이퍼).

### 담은 목록 바 (Signature)
담기가 발생하는 순간 하단에서 떠오르는 완전한 필 — 잉크 지면 + `--paper` 텍스트, 우측에 **코랄 "링크 복사" 버튼 + `--on-brand` 텍스트**(높이 40px). `rise-in` 0.32s `cubic-bezier(0.16, 1, 0.3, 1)`로 아래에서 올라온다. 시트의 좌측 정렬 컬럼을 따라가며 `lg`에서는 리스트 컬럼(26rem)에 정렬된다.

URL(`?picked=`)이 곧 저장본이므로 "링크 복사"가 공유·재방문 동작이다. **따라서 OG 카드는 이 시스템의 표면이다** — 공유된 링크가 도착하는 화면도 이 월드의 규범(웜 화이트 지면, 잉크 타이포, 레몬 밑줄)을 따른다.

### 장소 티커 (Signature)
홈의 전폭 레몬 띠 — 상하 1px 괘선, 15px/800, 28초 선형 무한 스크롤(`translateX(0 → -50%)`, 배열을 두 벌 이어붙여 심리스 루프). 흐르는 것은 더미 텍스트가 아니라 **실제 확정 장소명과 타임코드**다. 항목 사이 구분자는 코랄 별표(✱). `aria-hidden`이며 `prefers-reduced-motion`에서 정지한다.

### Named Rules

**The One Motion Per Screen Rule.** authored 모션은 화면당 하나다 — 홈은 티커, 조각 화면은 담기 바의 rise-in. 나머지 움직임은 전부 사용자 입력에 대한 즉각 반응(transform 0.12–0.2s)이다. 모든 authored 모션은 `prefers-reduced-motion`에서 멈춘다(지도 스켈레톤의 `animate-pulse` 포함).

**The Inverted State Rule.** 활성 상태는 밝기 조절이 아니라 반전이다 — 필터 칩·지도 핀·레몬 칩 모두 활성 시 잉크와 지면이 뒤집힌다. 유일한 예외가 선택된 장소 행의 레몬 32% 틴트이며, 그것은 행이 통째로 반전되기엔 면적이 너무 크기 때문이다.

**The Publish Gate Rule.** 확정 핀 8개 미만 조각은 공개하지 않는다(`src/shared/config/publish.ts`의 `MIN_CONFIRMED_PINS`). 홈·허브 목록과 사이트맵에서 제외되고, 조각 페이지는 `noindex` + "준비 중" 화면을 렌더한다(404가 아니다 — 운영자 미리보기는 살린다). **밀도가 신뢰다.** 빈 지도를 보여주면 서비스 전체가 비어 보인다.

## Do's and Don'ts

### Do:
- **Do** 카드는 1px `--line` 보더나 지면 대비로 세운다.
- **Do** 리스트는 괘선으로 나누고, 선택된 항목만 라운드 틴트 블록으로 승격시킨다.
- **Do** 코랄 위 텍스트는 `--on-brand`로 쓴다 (라이트 5.83:1 / 다크 6.56:1). 코랄 위 아이콘만 반전색을 허용한다.
- **Do** 레몬 위 텍스트는 `--on-lemon`으로 쓰고, 반전(hover)은 `--on-lemon` 지면 + `--lemon` 글자로 뒤집는다 (양쪽 12:1 이상).
- **Do** 크리에이터 액센트·지도 핀처럼 **테마 밖에서 오는 지면** 위에는 `--ink-fixed`를 쓴다 (어두운 액센트 위에는 흰색 — `isDarkHex` 분기).
- **Do** 코랄은 담은 것과 주 행동에만 쓴다.
- **Do** 레몬은 읽어야 할 곳에 쓴다 (히어로 밑줄·티커·도시 칩·선택 틴트).
- **Do** 크리에이터 액센트(`--hl`)는 번호 뱃지·지도 핀·선택 강조 세 표면에만 주입한다.
- **Do** 활성 상태는 잉크 반전으로 표현한다.
- **Do** 숫자에는 `.tnum`을 붙인다.
- **Do** 확정되지 않은 것은 대시 보더로 감싼다.
- **Do** 프로필 사진 자리에는 액센트 이니셜 뱃지를 쓴다 (법적 제약이자 시각적 서명).
- **Do** 읽어야 하는 모든 문단에 폭 캡을 명시한다 — 한국어 한 줄 35–45자 (The Korean Measure Rule 표 참조). 캡이 없으면 컨테이너 폭을 그대로 받는다.
- **Do** 빈 상태에서도 형태로 말한다 — 지도 스켈레톤, "준비 중" 대시 카드, "위치 확인 중" 섹션.

### Don't:
- **Don't** 하드 오프셋 그림자(`4px 4px 0`, `6px 7px 0`)를 쓰지 않는다. 이전 월드의 것이며 삭제됐다.
- **Don't** 2px 잉크 보더를 쓰지 않는다. 획은 1px `--line`이다.
- **Don't** 요소를 회전시키지 않는다.
- **Don't** 히어로를 30px대로 내리지 않는다 — 페이지 타이틀과 충돌한다.
- **Don't** 코랄 위에 `--ink`나 흰 텍스트를 쓰지 않는다 (다크에서 2.30:1, 라이트에서 3.10:1 — 각각 미달). 언제나 `--on-brand`다.
- **Don't** 레몬·액센트·지도 핀 위에 `--ink`를 쓰지 않는다. `--ink`는 테마를 따라가는데 그 지면들은 따라가지 않아, 다크에서 밝은 글자가 밝은 지면에 얹힌다 (레몬은 1.16:1).
- **Don't** 레몬 칩의 반전을 `--ink` 지면으로 만들지 않는다 — 다크에서 `--ink`가 밝아 레몬 글자가 사라진다.
- **Don't** 코랄로 정보 텍스트·헤드라인·구분선을 칠하지 않는다.
- **Don't** 크리에이터 액센트로 카드 배경·버튼·보더를 칠하지 않는다.
- **Don't** 유튜브의 트레이드 드레스(빨강 주조, 재생버튼 클론, 자막 박스, 썸네일 그리드, 채널 아트)를 흉내 내지 않는다.
- **Don't** 크리에이터 프로필 사진·채널 로고를 쓰지 않는다.
- **Don't** 컴포넌트 안에 `dark:` 분기나 하드코딩 색(`white`, `#fff`)을 쓰지 않는다. 테마 값은 `globals.css`의 토큰에서만 갈린다 — 컴포넌트는 `bg-card`처럼 이름만 참조한다.
- **Don't** 사진·일러스트·그라디언트·텍스처를 배경에 깔지 않는다.
- **Don't** 한 화면에 두 번째 authored 애니메이션을 추가하지 않는다.
- **Don't** 서체를 추가하지 않는다. 대비가 필요하면 Pretendard의 웨이트(400–900)로 해결한다. 유일한 예외는 OG 카드의 `KR`(Noto Sans KR)이며, 그 경계는 `opengraph-image.tsx` 두 파일뿐이다 — The One Typeface Rule 참조.
- **Don't** 대문자 + 자간 확장 라벨(`uppercase tracking-widest`)을 쓰지 않는다.
- **Don't** 본문 텍스트를 가운데 정렬하지 않는다.
- **Don't** 감탄사·과장 카피를 쓰지 않는다. "인생 맛집!"이 아니라 "돈카츠. 도쿄 고토구. 영상 12:40."
