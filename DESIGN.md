---
name: Tripin
description: 여행 유튜버가 간 곳만, 지도로 — 편집자막 월드
colors:
  paper: "#ffffff"
  ink: "#111111"
  ink-soft: "#55524a"
  hl-brand: "#ffd400"
  hairline: "#e5e5e5"
typography:
  display:
    fontFamily: "Black Han Sans, Apple SD Gothic Neo, sans-serif"
    fontSize: "clamp(1.875rem, 5vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Black Han Sans, Apple SD Gothic Neo, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Noto Sans KR, Apple SD Gothic Neo, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Spline Sans Mono, Noto Sans KR, Apple SD Gothic Neo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "0.02em"
  timecode-chip:
    fontFamily: "Spline Sans Mono, Noto Sans KR, Apple SD Gothic Neo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1
  timecode:
    fontFamily: "Spline Sans Mono, Noto Sans KR, Apple SD Gothic Neo, monospace"
    fontSize: "0.875rem"
    fontWeight: 700
rounded:
  none: "0px"
  chip: "0.25em"
  full: "9999px"
spacing:
  chip-x: "14px"
  chip-y: "6px"
  list-gap: "32px"
  section: "64px"
components:
  chip-ink:
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px 14px"
  chip-ink-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  chip-timecode:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.timecode-chip}"
    rounded: "{rounded.chip}"
    padding: "5px 8px"
---

# Design System: Tripin

## Overview

**Creative North Star: "여행 영상 편집자막"**

한국 여행 유튜브의 편집자막 그래픽 — 초굵은 자막체, 형광펜 키워드 하이라이트, 좌하단
타임코드, [대괄호] 상황 라벨, 챕터 바 — 를 흰 정보 지면 위의 UI 언어로 쓴다. "모든
장소는 영상에서 왔다"는 제품 진실이 곧 시각 문법이다. 지면은 밝고 평평하며, 색은
문맥이 주입한다: 브랜드·홈은 형광 옐로, 채널×도시 조각은 그 크리에이터의 액센트색.

거부한 것 두 가지가 이 시스템을 정의한다. 정석 지도 디렉터리(흰 바탕 + 파란 액센트 +
카드 그리드)와 유튜브 크롬(빨강 주조, 썸네일 그리드, 재생버튼 클론). 편집자막의
문법만 차용하고 유튜브의 트레이드드레스는 절대 넘어가지 않는다.

**Key Characteristics:**
- 잉크 블랙 자막체가 화면의 목소리, 형광펜이 화면의 색
- 숫자는 전부 모노(타임코드) — 통계·번호·타임스탬프
- 인터랙티브 요소는 radius 0 + 2px 잉크 보더, hover 시 잉크 반전
- 지면은 평평 — 그림자는 지도 핀 하나뿐

## Colors

흰 지면 + 잉크 블랙 + 문맥 주입형 형광펜 한 자루.

### Primary
- **형광펜 옐로** (#ffd400): 브랜드 하이라이트. TRIPIN 워드마크와 홈 히어로의 키워드에만.
  조각 페이지에서는 CSS 변수 `--hl`이 크리에이터 액센트색으로 교체되어 같은 자리를 칠한다.

### Neutral
- **페이퍼** (#ffffff): 지면. 항상 라이트 — 다크 모드 없음 (밝은 정보 지면이 월드의 재질).
- **잉크** (#111111): 본문·자막체·보더·타임코드 칩 배경.
- **소프트 잉크** (#55524a): 보조 텍스트(주소·통계·설명). 회색이 아니라 잉크에서 갈라진 웜 톤.
- **헤어라인** (#e5e5e5): 구분선 전용.

### Named Rules
**The Pen Rule.** 형광펜은 고유명사에만 긋는다 — 채널명, 도시명, 선택된 장소명. 문장이나
UI 라벨에 긋지 않는다. 칠할 때는 항상 `color-mix(in srgb, var(--hl) 55%, white)` — 어떤
액센트색이든 밝게 유지되어 잉크 글자 대비(≥4.5:1)가 깨지지 않는다.

**The Context Ink Rule.** 크리에이터 액센트색은 `--hl` 주입으로만 쓴다(형광펜·챕터 바·지도
핀·이니셜 뱃지). 버튼·텍스트·배경을 액센트색으로 직접 칠하지 않는다.

## Typography

**Display Font:** Black Han Sans (Apple SD Gothic Neo 폴백) — `.subtitle-face`
**Body Font:** Noto Sans KR
**Label/Mono Font:** Spline Sans Mono — `.timecode-face`, tabular-nums

**Character:** 예능 편집자막의 목소리. 디스플레이는 한 웨이트(400이지만 시각적으로
블랙)로 밀어붙이고, 위계는 크기와 형광펜으로만 만든다. 숫자는 어디서든 타임코드처럼
읽힌다.

**The Two-Face Mono Rule.** Spline Sans Mono 는 한글이 없다 — 모노 계열 스택은 항상
`var(--font-timecode), var(--font-body), "Apple SD Gothic Neo", monospace` 순서로,
숫자·라틴은 모노가 잡고 한글은 본문 얼굴에 안착시킨다. 미지정 폴백으로 흘리지 않는다.

### Hierarchy
- **Display** (자막체, clamp 30~48px, 1.15): 페이지 H1 — "여행 유튜버가 간 곳만", "추성훈의 도쿄".
- **Headline** (자막체, 24px): 리스트의 장소명, 홈의 채널명(24~30px).
- **Body** (Noto Sans KR, 15px, 1.625): 요약 불릿·설명.
- **Label** (모노, 11.2px, +0.02em): `[대괄호]` 메타 라벨 — `.meta-label`이 대괄호를 자동 부착.
- **Timecode** (모노 볼드, 14px, tabular): 리스트 번호(01, 02…), 통계(간 곳 N · 도시 N).

### Named Rules
**The Timecode Rule.** 화면의 모든 숫자는 Spline Sans Mono tabular로 — 통계, 리스트 번호,
타임스탬프, 챕터 카운트. 본문 폰트로 숫자를 적지 않는다.

**The Bracket Rule.** 메타 정보(장소 유형, 위치 확인 중, 고지)는 `[대괄호]` 모노 라벨로.
대괄호는 CSS `::before/::after`가 붙인다 — 콘텐츠에 직접 치지 않는다.

## Layout

모바일 375px 우선. 콘텐츠 컨테이너 max-w-5xl(홈은 max-w-3xl), 좌우 패딩 20px.
채널×도시 화면은 데스크톱(lg)에서 리스트 420px + 지도 나머지, 지도는 sticky
(top-20, 높이 calc(100vh-7rem)); 모바일은 헤더 → 지도 40vh → 리스트 순 스택.
리스트 항목 간격 32px(space-y-8), 섹션 전환은 헤어라인 border-t + pt-6.
헤더가 항상 지도보다 먼저 온다 — LCP에 지도 스크립트를 끼우지 않는다.

## Elevation & Depth

그림자 없는 평평한 지면. 깊이는 잉크 보더(2px)와 불투명도(비활성 리스트 항목
opacity 55%)로만 만든다. 유일한 예외는 지도 핀(`0 2px 5px rgba(0,0,0,.3)`) —
지도 타일 위에 떠 있어야 하는 물리적 이유가 있다.

**The Flat Paper Rule.** 지면 위 요소에 box-shadow를 주지 않는다. 떠 보여야 할 것은
잉크 보더로 잘라낸다.

## Shapes

두 가지 형태 언어만 있다: **사각(radius 0) + 2px 잉크 보더** — 칩, 필터, 지도 프레임,
도시 링크 등 모든 인터랙티브 사각 요소. **완전 원(9999px)** — 이니셜 뱃지, 지도 핀.
타임코드 칩만 예외적으로 0.25em의 미세한 라운드(영상 타임코드 벅의 실물 형태).
중간 라운드(8px, 12px 카드 코너)는 이 시스템에 존재하지 않는다.

## Components

### Chips (잉크 칩)
- **Style:** 배경 없음, 2px #111 보더, radius 0, 굵은 14px, 패딩 6×14px
- **Hover:** 잉크 반전 (배경 #111, 글자 흰색), transition
- **Active(필터 선택):** 상시 잉크 반전

### Timecode Chip (타임스탬프 칩)
- **Style:** #111 배경, 흰 모노 12px, radius 0.25em, `1:55 ▸` 형태
- **역할:** 출처 영상 아웃링크 전용 — 이 칩이 곧 "영상 보기"다

### Highlight Pen (형광펜)
- **Style:** `.hl-pen` — 글자 아랫단 6~52% 밴드, `--hl` 55% + 흰색 혼합, box-decoration-break: clone
- **Motion:** 선택 시 `.hl-pen-sweep` — 좌→우 긋기 0.35s cubic-bezier(0.16,1,0.3,1), reduced-motion 시 정지

### Chapter Bar (챕터 바)
- **Style:** 높이 8px 세그먼트 flex, gap 4px. 세그먼트 = 확정 장소 수, 활성 = 잉크
- **비활성 색:** 액센트 명도로 분기(`isDarkHex`) — 밝은 액센트는 `color-mix(… var(--hl) 60%, var(--ink))`, 어두운 액센트는 `color-mix(… var(--hl) 60%, white)`. 흰 지면 대비 3:1(WCAG 1.4.11)과 활성(잉크) 세그먼트 구분을 동시에 지킨다
- **역할:** 지도 핀 번호·리스트 번호와 1:1 — 클릭 시 해당 장소 선택+스크롤 (`aria-pressed` 버튼)

### Map Pin (지도 핀)
- **Style:** 27px 원, 액센트 배경 + 2px 잉크 보더, 모노 볼드 번호. 글자색은 배경 명도로 자동(잉크/흰색, `isDarkHex`)
- **Active:** 잉크 배경 + 흰 번호 + scale 1.25

### Initials Badge (이니셜 뱃지)
- **Style:** 48px 원, 액센트 배경 + 2px 잉크 보더, 자막체 이니셜. 프로필 사진 대체물(법적 제약)

### Navigation
- **Header:** sticky, 흰 배경 + 하단 2px 잉크 보더. 좌측 TRIPIN 워드마크(자막체 + 옐로 펜), 우측 `[비공식 · 출처는 전부 영상]` 라벨
- **Focus:** 전역 `:focus-visible` — 2px 잉크 아웃라인 + 2px 오프셋. 별도 포커스 스타일을 만들지 않는다

### 인터랙션 규칙
**The Click-Select Rule.** 지도↔리스트↔챕터 바 3중 연동의 선택은 **클릭으로만** 일어난다.
호버는 상태를 만들지 않는다 — 호버 선택은 형광펜 모션을 연사시키고 지도를 흔든다.
선택 시 다른 항목을 흐리게(dim) 처리하지 않는다 — 강조는 형광펜 하나로 충분하다.
선택 트리거(장소명 버튼)의 어포던스는 포인터 커서 + 호버 밑줄(2px, offset 4px)이다.

## Do's and Don'ts

### Do:
- **Do** 새 화면의 액센트는 `--hl` 변수 주입으로 — 컴포넌트는 색을 모른 채 형광펜·챕터 바·핀에 반영되게 한다.
- **Do** 숫자가 나오면 `.timecode-face`, 메타 정보면 `.meta-label` — 먼저 이 둘을 검토한다.
- **Do** 인터랙티브 사각 요소는 radius 0 + 2px 잉크 보더 + hover 잉크 반전으로 통일.

### Don't:
- **Don't** 유튜브 크롬을 차용하지 않는다 — 빨강 주조, 썸네일 그리드, 원형 재생버튼 (법적 리스크이자 사용자 확인 금기).
- **Don't** 다크 모드·회색 카드·중간 라운드(8~16px)를 들이지 않는다 — 이 월드에 없는 재질이다.
- **Don't** 형광펜을 문장·버튼·라벨에 긋지 않는다 (The Pen Rule).
- **Don't** authored 모션을 추가하지 않는다 — pen-sweep 하나가 이 시스템의 전부다. 흩어진 hover 이펙트 금지.
