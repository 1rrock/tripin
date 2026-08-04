---
version: 1
slug: "src-app-public-c-creator-city-explorer-tsx"
primary_target: "src/app/(public)/c/[creator]/[city]/Explorer.tsx"
related_targets: ["src/app/(public)/page.tsx"]
---

# /c/[creator]/[city] — 채널×도시 탐색

## Scope & mode
공개 웹의 핵심 화면(자원 80% 집중, PRODUCT.md). Operate — 방문자는 "내 유튜버가 이 도시에서 간 곳"을 훑고 영상/지도 앱으로 나간다. 홈(`/`)은 이 화면의 진입 명단으로 같은 월드를 쓴다.

## Audience & job
여행 직전의 한국어 시청자, 모바일 검색("채널명+도시") 유입. 과업: 장소 훑기 → 저장할 곳 고르기 → 타임스탬프 영상 확인 / 지도 앱 열기.

## Chosen direction
여행 영상 편집자막 월드 (seed fda20065, 그라운디드 5번). 자막체(Black Han Sans) 장소명 + 크리에이터 액센트 형광펜(--hl 주입) + `1:55 ▸` 타임코드 칩 + [대괄호] 메타 라벨 + 장소 수 세그먼트 챕터 바. 챕터 바·지도 핀·리스트 번호 3중 연동이 이 화면의 기억점.

## Memorable moment
리스트 항목 선택 시 장소명에 형광펜이 좌→우로 그어지는 pen-sweep — 이 화면의 유일한 authored 모션.

## Constraints (이 화면 고유)
- 유튜브 트레이드드레스 금지(빨강 주조·썸네일 그리드·재생버튼 클론) — 편집자막 문법만 차용
- candidate 는 지도에 올리지 않고 [위치 확인 중] 격리
- 헤더가 지도보다 먼저 (LCP에 지도 스크립트 배제)

## Unresolved
- 모바일 실기기 검증 (빌드 시점엔 브레이크포인트 구조 검증만)
- 조각 데이터가 두꺼워졌을 때(12+핀) 챕터 바 밀도·리스트 페이싱 재점검
