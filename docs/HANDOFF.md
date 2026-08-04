# Tripin 핸드오프 — 2026-08-04 상태 스냅샷

> 이 문서는 "지금 어디까지 됐고, 무엇이 어떤 규칙으로 돌아가며, 다음에 뭘 해야 하는가"의
> 단일 진입점이다. 상세는 각 링크 문서가 갖고 있다.
> 선행 문서: `PRODUCT.md`(제품) · `CONCEPT.md`(화면 기획) · `LEGAL.md`(법적 제약) ·
> `INGEST.md`(수집 파이프라인) · `DESIGN.md`(디자인 시스템) · `docs/ADMIN.md` · `docs/DATABASE.md`

---

## 1. 지금 상태 (한 줄씩)

- **공개 웹**: 홈 + 채널×도시 탐색 화면 완성 — "여행 영상 편집자막" 디자인 월드 적용, 리뷰 통과
- **어드민**: 대시보드 / 장소 확정(`/admin/confirm`, 수정 포함) / 요약 에디터(`/admin/place`) 가동
- **수집 파이프라인**: `tripin-ingest` 스킬로 자동화 완료, 첫 실전(추성훈) 완료
- **콘텐츠**: 추성훈 — 영상 16편, 장소 20곳(도쿄 확정·공개 3곳 / 후보 17곳), 요약 20/20 작성
- **도시**: tokyo, osaka, kobe, fukuoka, sapporo, busan, los-angeles (7곳)
- ⚠️ **git 커밋이 아직 하나도 없다** — 전부 워킹트리 상태. 첫 커밋부터 하는 것을 권장

## 2. 이번 사이클에서 만든 것

### 수집 파이프라인 (상세: `INGEST.md` ★ 섹션, `.claude/skills/tripin-ingest/SKILL.md`)
- 스킬 `tripin-ingest`: 채널 덤프/영상 URL → 파싱 → 필터 → 자막(로컬, IOS 클라이언트 우회)
  → 장소 식별 → 웹검색 검증 → 후보 등록 → 좌표 백필
- 스크립트 6종 (`scripts/ingest/`): parse-innertube / fetch-transcript / ensure-cities /
  insert-candidates / backfill-coords / apply-summaries — 전부 로컬 전용·재실행 안전

### 어드민
- `/admin` 대시보드: 내비게이션 + 할 일 링크(좌표 미등록·요약 미작성 큐 진입)
- `/admin/confirm`: 장소 행/핀 클릭 → 상세 카드 → **수정 폼**(`updatePlace`) — 확정 잠금
  (좌표 또는 구글 링크 + 근거) 동일 적용
- `/admin/place/[id]` 요약 에디터: 7.3 템플릿 + 불릿 3~5 + 금지어/글자수 실시간 검사 +
  **자막 복붙 검사**(12자 연속 일치, 자막은 대조 후 폐기) + "저장 후 다음" 큐 흐름
- 구글 공유 링크(maps.app.goo.gl) 붙여넣으면 저장 시 **좌표 자동 해석**
  (`src/shared/lib/resolve-google-place.ts`)

### 공개 웹 디자인 (상세: `DESIGN.md` + `.impeccable/design.json`)
- impeccable 정식 플로우: 방향 배정(seed fda20065) → 사용자 선택 → 빌드 → 피니시 리뷰
  (P0 2건 수정) → 판정 "조건부 출시" → 조건 3건 반영 완료
- 월드: 자막체(Black Han Sans) + 크리에이터 액센트 형광펜(`--hl` 주입) + 타임코드 칩 +
  [대괄호] 라벨 + 챕터 바. Named Rules는 DESIGN.md 참조 (Pen/Timecode/Flat Paper/
  Two-Face Mono/Click-Select)
- 리뷰가 잡아준 핵심 수리: 홈 카운트를 익명 시야 기준으로, 지도 핀 시그니처 가드
  (리스트 조작 시 뷰포트 리셋 방지), 키보드 접근 + 전역 포커스 링, 모노 폰트 한글 폴백

## 3. 운영 규칙 (이번에 확정된 결정들)

| 규칙 | 내용 | 근거 위치 |
|------|------|-----------|
| **확정 = 공개** | `map_status=confirmed` 저장 시 `is_published=true` 자동 동기화, 보류는 비공개. `/admin/publish` 조각 게이트가 생기기 전까지의 임시 운영 규칙 | `src/app/admin/confirm/actions.ts` |
| 자동 확정 금지 | 파이프라인은 candidate까지만, 확정은 사람이 | SKILL.md, LEGAL.md 4.6 |
| mentionNote ≠ 공개 요약 | 자막 파생물 — 확정 근거 참고용만, 공개 요약은 템플릿으로 새로 작성 | SKILL.md 규칙 3 |
| 도시는 자동 생성 OK | `ensure-cities.mjs`, 생성 내역 보고. 크리에이터는 수동(어드민) | SKILL.md 규칙 4 |
| 홈 숫자·도시 칩 | 익명 방문자가 실제 볼 수 있는 것(공개·확정)만 센다/노출한다 | `(public)/page.tsx` |
| 가격 표기 | price_hint 저장 시 "(영상 촬영 시점 기준)" 자동 부착 | 요약 에디터·apply-summaries |

## 4. 미해결 / 다음 단계 (우선순위순)

1. **git 첫 커밋** — 전체가 무보호 워킹트리 상태
2. **후보 17곳 확정** — `/admin/confirm`에서 검수. 특히 sourceNote에 표시된 2건 주의:
   나가하마 넘버원(기온점 추정), 쿠시카츠 다나카(체인 지점 확인)
3. **`/admin/publish` 조각 공개 체크리스트** (docs/ADMIN.md 7장) — 8핀 게이트·요약 경고
   해소 조건을 조각 단위로. 생기면 "확정=공개" 임시 규칙을 대체
4. **영상 메타 30일 갱신 배치** (LEGAL.md §III.E.4.d) — 대시보드에 경고만 뜨는 상태
5. **삭제 요청 창구** — 푸터에 "준비 중" 문구인 상태 (LEGAL.md 임시조치 의무)
6. `GOOGLE_PLACES_API_KEY`(서버용) 채우면 가게명만으로 좌표+링크 자동화 확장 가능
7. 디자인 이관 항목: introText 붙는 조각의 모바일 재측정 / 홈 `loadCreators` 전량 조인 →
   장소 수백 개 규모에서 DB 뷰·트리거 집계로
8. 다음 채널 온보딩: INGEST.md ★ 섹션 절차 그대로 (크리에이터 생성 → 덤프 붙여넣기)

## 5. 알려진 제약 (막히면 여기부터)

- **유튜브 자막**: 웹 클라이언트는 pot 토큰으로 빈 응답 → IOS 클라이언트 우회 중.
  막히면 `fetch-transcript.mjs`·`admin/place/[id]/actions.ts` 상단 클라이언트 버전 갱신
- **네이버 place ID**: 자동 검색이 ncaptcha 차단(우회 금지) — 확정 폼에 URL 붙여넣으면 ID 추출
- **카카오**: 해외 미커버 — 일본/미국 장소 null 정상
- **브라우저 지도 키**: 리퍼러 제한(localhost:3000 허용) — 서버에서 못 씀
- **폐업 이력**: 카메하메하 베이커리(구 마라사다, qVLEo8WKKxY) 폐업 확인으로 삭제됨

## 6. 데이터 흐름 요약

```
[수집] 덤프/URL → tripin-ingest → videos + places(candidate, 비공개)
[확정] /admin/confirm 수정 폼 → confirmed + 공개 + 통계 재계산 → 웹 노출
[요약] /admin/place 큐 → summary_bullets(+price_hint) → 공개 카드 완성
[노출] 익명 RLS(is_published) → 홈 카운트·도시 칩·조각 페이지 전부 이 시야 기준
```
