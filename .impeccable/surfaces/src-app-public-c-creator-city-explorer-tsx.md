---
version: 1
slug: "src-app-public-c-creator-city-explorer-tsx"
primary_target: "src/app/(public)/c/[creator]/[city]/Explorer.tsx"
related_targets: ["src/app/(public)/page.tsx", "src/app/(public)/c/[creator]/page.tsx", "src/app/(public)/layout.tsx"]
---

# /c/[creator]/[city] — 채널×도시 탐색

## Scope & mode
공개 웹의 핵심 화면(자원 80% 집중, PRODUCT.md). Operate — 방문자는 "내 유튜버가 이 도시에서 간 곳"을 훑고 담아서 영상/지도 앱으로 나간다. 홈(`/`)은 이 화면의 진입 명단으로 같은 월드를 쓴다.

## Audience & job
여행 직전의 한국어 시청자, 모바일 검색("채널명+도시") 유입. 과업: 훑기 → 담기(내 목록) → 타임스탬프 영상 확인 / 지도 앱 열기. 첫인상 1순위 = 효율.

## Chosen direction
캐논 — 한국형 정보 서비스 표준 (standing exit, seed 08cb9f80). 품질 기준선: 토스·카카오맵·당근·트리플. 모바일은 지도 38dvh 위로 라운드 시트 리스트(카카오맵 문법), 데스크톱은 리스트 패널 + sticky 지도. Pretendard 단일 서체, 필 칩, 12~24px 라운드, 그림자는 모바일 시트 하나뿐. 크리에이터 액센트는 --hl 주입으로 번호 뱃지·지도 핀·선택 강조에만.

**2026-08-05 — 이 방향이 전 공개 화면의 규범이 됐다.** 그 전까지 이 브리프는 캐논을, PRODUCT.md/DESIGN.md는 "Color Pop"을 지목해 서로 모순이었고, 그 결과 홈·허브만 Color Pop(잉크 2px 보더 + 하드 오프셋 그림자 + 84px 히어로)으로 구현되어 제품이 두 월드로 갈라졌다. 사용자가 캐논으로 통일하기로 결정했고, DESIGN.md·PRODUCT.md·`src/app/layout.tsx` 방향 계약이 모두 캐논으로 교체됐다. **이 화면의 구현이 그 규범의 근거 소스다** — 홈·허브가 여기에 맞춰졌다. 반대 방향이 아니다.

## Memorable moment
담기 순간 하단에 떠오르는 "내 목록 N곳 · 링크 복사" 플로팅 바 (rise-in — 이 화면의 유일한 authored 모션). URL(?picked=)이 곧 저장본이라 링크 복사가 공유·재방문 동작이다.

## Constraints (이 화면 고유)
- 유튜브 트레이드드레스 금지(빨강 주조·썸네일 그리드·재생버튼 클론)
- candidate 는 지도에 올리지 않고 "위치 확인 중" 섹션 격리
- 헤더가 지도보다 먼저 (LCP 에 지도 스크립트 배제)
- 지도 실패 시 리스트만으로 완전히 사용 가능 (실패 문구 + 재시도 내장)

## Unresolved (검증 부채 — 결함 아님, 환경·데이터 제약)
- 데스크톱 폭(lg) 실기 검증 — 2단 그리드·sticky 지도·담기 바 26rem 정렬 (코드 검증만 완료)
- **NEXT_PUBLIC_GOOGLE_MAPS_ID 미설정** — `env.ts:46`이 `DEMO_MAP_ID`로 폴백한다. `AdvancedMarker`는 유효한 mapId를 요구하므로 배포 전 발급 필수. 발급 후 확인: 타일·POI 상태, 로딩 스켈레톤, "전체 핀 보기" 리센터 컨트롤
- 조각에 두 번째 장소 타입이 들어오면 필터 행 실렌더 확인
- 조각 데이터가 두꺼워졌을 때(12+핀) 리스트 밀도 재점검
- **모바일 폭(375/390) 실기 검증** — 브라우저 확장의 `resize_window`가 페이지 뷰포트에 전파되지 않아(`window.innerWidth`가 781에 고정) 모바일 폭 측정을 하지 못했다. 터치 타깃(액션 필 36px, 지도 핀 28px — 둘 다 44px 미만)과 모바일 오버플로는 여전히 코드 근거만 있다
  - ⚠️ 브라우저 연결 실패 시 원인: 세션이 **원격 브라우저**(Windows, `isLocal:false`)에 붙으면 이 Mac 의 localhost 에 도달할 수 없다. `list_connected_browsers` 로 `isLocal:true` 인 로컬 브라우저를 골라야 한다. dev 서버 문제가 아니다
- 어드민 확정 화면 키보드 단축키 0건 — PRODUCT.md 원칙 5("확정 1건당 10초")와 충돌. 이 브리프 범위 밖이지만 사업성에 직결

## 해결됨 (2026-08-05)
- 월드 분열 → 캐논으로 통일 (위 Chosen direction 참조)
- 코랄 위 흰 텍스트 3.10:1 WCAG AA 위반 → 잉크 텍스트로 반전 (5.90:1)
- 공개 게이트 미강제 → `MIN_CONFIRMED_PINS = 8` 도입, 홈·허브·사이트맵에서 제외 + 조각은 noindex + "준비 중" 화면
- OG 태그 0개 → `opengraph-image.tsx` + metadata `openGraph`/`twitter` 추가. 담기→링크 복사가 공유 화면까지 이어진다
- `?picked=` 미검증 slug → places에 존재하는 slug만 통과
