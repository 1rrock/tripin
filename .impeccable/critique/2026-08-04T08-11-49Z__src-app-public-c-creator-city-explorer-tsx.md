---
target: 홈 + 채널×도시 탐색 (Explorer)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-04T08-11-49Z
slug: src-app-public-c-creator-city-explorer-tsx
---
# Critique — 홈 + 채널×도시 탐색 (/c/chuseonghoon/tokyo)

Method: dual-agent (A: critique-A · B: critique-B)

## Design Health Score — 22/40 (Acceptable)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | 지도가 타일 0인 회색 박스인데 aria-busy=false — 로딩·실패·성공 어느 신호도 없음 |
| 2 | Match System / Real World | 3 | 용어는 정확하나 챕터 바·[대괄호] 은유가 무설명 |
| 3 | User Control and Freedom | 2 | 선택 해제 불가, 필터가 풀 네비게이션이라 상태 전체 초기화 |
| 4 | Consistency and Standards | 2 | 잉크 칩 3가지 크기, "선택"의 결과가 진입점 3곳에서 상이 |
| 5 | Error Prevention | 2 | 지도 실패 경로가 SDK 로드 실패만 커버 — 타일 미렌더는 조용한 회색 |
| 6 | Recognition Rather Than Recall | 2 | 모바일 스크롤 시 지도·챕터 바 완전 소실 → 핀 번호를 기억에 의존 |
| 7 | Flexibility and Efficiency | 1 | 검색·정렬·거리정보·교차뷰 진입로 전무 |
| 8 | Aesthetic and Minimalist Design | 3 | 리스트 조판 훌륭. 감점: 구글 POI 난입 + 죽은 잘린 영상 제목 |
| 9 | Error Recovery | 1 | 폴백 문구 1줄뿐, 재시도 없음, 이번 실패 모드에선 발동조차 안 함 |
| 10 | Help and Documentation | 3 | 1회성 소비 화면이라 요구 낮음. 챕터 바만 최소 라벨 필요 |
| **Total** | | **22/40** | **Acceptable — 시각 언어는 우수, 상태 전달·모바일 조작이 끌어내림** |

n/a 처리 휴리스틱: 없음.

## Design Specificity Verdict

**시각 언어는 확실히 authored — 인터랙션과 지도는 아직 카테고리 제네릭.**

- LLM 평가: 자막 블록 리스트 조판(01 + [맛집] + 자막체 + 불릿 + 타임코드 칩)은 이 제품만의 것. 그러나 ① 지도가 DEMO_MAP_ID 폴백으로 구글 기본 POI ~25개에 잉크 핀 3개가 파묻힘 — 화면 절반이 남의 디자인 시스템. ② 챕터 바가 타임코드 없는 8px 무명 막대 — "챕터 바"라는 아이디어가 문서에만 존재. ③ 잉크 칩이 3가지 크기로 갈라짐. ④ 형광펜이 문맥 강조와 선택 상태 두 의미로 중복. ⑤ DESIGN.md 자기모순(opacity 55% dim은 코드에 없음, label 11.2px vs 12px).
- 결정론적 스캔: 실질 finding 1건 — MapView.tsx:65 핀 그림자 rgba(0,0,0,.3) 팔레트 밖 (advisory; DESIGN.md가 명시 허용한 예외라 사실상 무해). 브라우저 오버레이 5건은 전부 실측 검증된 false positive (CJK 폭 오계산 line-length ×2, 의도된 truncate ×2, 장식 마커 em-dash ×1).
- 종합: 토큰 드리프트는 거의 없음 — 문제는 스타일이 아니라 **상태 전달·모바일 인터랙션·지도 실행**.

## Priority Issues

1. **[P0] 지도가 조용히 죽는다** — setLoaded가 new Map() 직후 호출(MapView.tsx:103), 타일 0이어도 로딩 문구 소실; failed는 SDK 로드 실패만 커버; DEMO_MAP_ID 폴백으로 POI 난입. Fix: tilesloaded 기반 loaded + 8초 타임아웃 failed + 재시도 버튼 + POI 끈 커스텀 Map ID. → /impeccable harden
2. **[P0] 아웃링크 두 개가 화면에서 가장 작다** — 0:11▸ 56×20px, 지도 열기 66×26px, 챕터 바 8px (성공지표 = 아웃링크 클릭인데 표적이 WCAG 24×24 미달). Fix: 시각 크기 유지 + ::after inset 히트 확장, 챕터 바 py-3 히트 32px. → /impeccable adapt
3. **[P1] 모바일에서 3중 연동이 화면 밖으로 사라진다** — 스크롤 시 지도·챕터 바 동시 소실. Fix: 챕터 바 sticky top + IntersectionObserver 현재 위치 동기화. → /impeccable layout
4. **[P1] 홈에 클릭 가능한 것이 링크 1개뿐, 형광펜 요소는 미끼** — 추성훈(형광펜 H2)이 링크 아님. Fix: 행 전체 클릭 + 도시 칩 44px. → /impeccable polish
5. **[P2] "선택"이 진입점마다 다르고 해제 불가, 필터는 상태 전멸** — setActiveId vs selectPlace 분열, ?type= 풀 네비게이션. Fix: selectPlace 단일화 + 토글 + router.replace(scroll:false). → /impeccable harden

## Persona Red Flags

- Casey(한 손 모바일): 20px 표적 조준 불가, 챕터 바 존재 인지 불가, 회색 지도에서 이탈, 브레드크럼 12.9px가 유일한 복귀로.
- Jordan(첫 방문): 홈 첫 클릭(형광펜 이름)이 실패로 시작, 챕터 바 정체 불명, "간 곳 3 · 영상 16"이 저밀도 인상(8핀 게이트 미준수 노출).
- 여행 직전 검색 유입자: 훑기 OK → **"저장할 곳 고르기" 완전 미지원**(선택은 휘발) → 아웃링크 표적 20px 마찰 → 동선 판단 불가(거리·그룹핑 없음).

## Minor Observations

- gmp-advanced-marker click deprecated → gmp-click 마이그레이션 (핀 클릭 조용한 사망 위험)
- 잘린 영상 제목이 죽은 텍스트 — 칩과 묶어 하나의 링크로
- 헤더 max-w-5xl vs 홈 max-w-3xl 정렬선 130px 어긋남
- 데스크톱 지도 높이가 짧은 리스트와 불균형 (max-h 필요)
- 현지명 탭-복사 마이크로 기능 부재
- pen-sweep 재선택 시 재생 안 됨
- .meta-label nowrap 375px 넘침 위험
- 리스트 종료 후 다음 행동 0 — 교차뷰/다른 도시 진입로 부재 (P3)

## Questions

1. 챕터 바에 타임코드가 없는데 그게 왜 "챕터 바"인가 — 세그먼트 폭을 타임스탬프 비례로, 위에 0:11/1:55/0:23을 얹으면 대체 불가능한 위젯이 된다.
2. 지도가 40dvh를 받을 만큼 일하고 있는가 — 모바일 기본 접힘 + "지도로 보기 3곳" 칩이 오히려 지도 서비스를 강화할 수 있다.
3. "고른다"는 어디에 저장되는가 — ?picked= URL 공유가 아웃링크 지표와 재유입을 동시에 올린다.
