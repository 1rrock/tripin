---
target: 랜딩페이지 및 전체 공개 UI
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-05T00-51-24Z
slug: src-app-public-page-tsx
---
⚠️ DEGRADED: single-context (3개 서브에이전트를 병렬 스폰했으나 미회신 — Chrome 확장이 dev 서버에 도달 불가하여 브라우저 단계에서 정체된 것으로 추정. 부모 컨텍스트가 정적 분석 + 렌더된 HTML 실측 + 디텍터 CLI로 대체 수행)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 지도 스켈레톤·실패 문구·`aria-busy`·"복사됨" 피드백은 모범. `loading.tsx` 부재로 ISR 캐시 미스 시 흰 화면, 담기·복사에 `aria-live` 없음 |
| 2 | Match System / Real World | 4 | "간 곳", "담기", "영상 0:11" — 정보 나열형 톤이 일관되게 지켜짐. 감탄사·과장 카피 0건. 이 제품의 진짜 강점 |
| 3 | User Control and Freedom | 3 | 재클릭 해제, URL이 곧 상태(`?picked=`), 브레드크럼. 담기 전체 해제 없음, 404에서 복귀 경로 없음 |
| 4 | Consistency and Standards | **1** | 같은 "칩"이 홈에선 잉크 2px 보더 + 레몬, Explorer에선 보더 없는 `bg-fill`. 공개 화면 두 개가 서로 다른 디자인 월드 |
| 5 | Error Prevention | 2 | 어드민 확정 잠금은 모범(좌표+근거 없으면 확정 불가). 공개 게이트(8핀)가 코드로 강제되지 않아 "간 곳 1" 조각 3개가 공개 중 |
| 6 | Recognition Rather Than Recall | 3 | 번호 뱃지 ↔ 지도 핀 ↔ 리스트 연동이 이 제품의 핵심 장치. DESIGN.md가 규정한 장소 칩 스트립이 제거되어 3중 연동이 2중으로 축소 |
| 7 | Flexibility and Efficiency | 2 | URL 공유는 훌륭한 액셀러레이터. 어드민 키보드 단축키 0건(확정 10초 목표와 충돌), 담기 일괄 조작 없음 |
| 8 | Aesthetic and Minimalist Design | 3 | 홈 히어로의 900 웨이트 위계가 강력하고 색 면적 통제도 좋음. 히어로 스티커 칩이 `lg` 전용 장식 + 하드코딩 |
| 9 | Error Recovery | 2 | 지도 실패 시 "목록만으로도 모든 장소를 확인할 수 있어요" + 재시도는 모범. `error.tsx` 부재, 404는 영어 기본 화면, 클립보드 실패 시 무음 무시 |
| 10 | Help and Documentation | 2 | 푸터 고지·헤더 뱃지가 맥락 설명 역할을 겸함. 삭제요청 창구 "준비 중", 도움말 없음 |
| **Total** | | **25/40** | **Acceptable — 사용자가 만족하려면 상당한 개선 필요** |

전 표면이 Persuade(홈)와 Operate(Explorer)를 모두 포함하므로 10개 전부 채점했다.

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | `--brand` 위 흰 13px 텍스트 3.10:1 — WCAG 1.4.3 위반 (실제 버튼 2종) |
| 2 | Performance | 3 | transform-only 티커·마커 콘텐츠 교체 등 최적화 양호. 서드파티 폰트 CDN + `loadPiece` 직렬 왕복 |
| 3 | Responsive Design | 3 | `dvh`·safe-area·거터 돌파 스크롤 스트립 설계 좋음. 터치 타깃 36px/28px < 44px |
| 4 | Theming | 3 | 완전한 CSS 커스텀 프로퍼티 토큰 + `@theme inline`. 다크모드 부재는 DESIGN.md가 명시한 의도이므로 감점 없음 |
| 5 | Implementation Integrity | **1** | 디텍터는 클린(0건)이나, 핵심 화면이 자기 DESIGN.md와 빌드 산출물의 방향 계약을 위반 |
| **Total** | | **12/20** | **Acceptable — 상당한 작업 필요** |

Theming은 다크모드 항목을 제외하고 토큰 규율 기준으로 재정규화해 채점했다.

## Implementation Integrity Verdict — **FAIL**

디텍터 CLI는 `src` 전체에서 exit 0 / findings 0으로 깨끗하다. 그러나 결정론적 스캔이 잡지 못하는 층에서 이 빌드는 **자기 자신과 모순**한다.

`src/app/layout.tsx:34-39`는 빌드 산출물에 HTML 주석으로 방향 계약을 남긴다 — "잉크 #141414 2px 보더 … 하드 오프셋 그림자(4px 4px 0 잉크 — **이 월드의 유일한 깊이**)". 자원 80%가 투입된 핵심 화면이 이 계약을 지키지 않는다:

| 표면 | `border-2 border-ink` | 하드 섀도 |
|---|---|---|
| `(public)/page.tsx` (홈) | **12** | 5 |
| `(public)/c/[creator]/page.tsx` (허브) | **5** | 1 |
| `(public)/c/[creator]/[city]/Explorer.tsx` (핵심) | **0** | 1 (담기 바만) |

## Design Specificity Verdict

**홈과 허브는 확실히 Tripin의 것이다. Explorer는 어떤 한국 정보 서비스에나 붙일 수 있다.**

홈의 히어로는 교체 불가능하다 — "여행 유튜버가 / **간 곳만**, / **지도로.**"를 직접 끊고 레몬 밑줄과 코랄 회전 블록을 얹은 3행 구성, 그 아래 실제 장소명과 타임코드가 흐르는 레몬 티커. 프로필 사진 금지라는 법적 제약을 액센트 이니셜 뱃지라는 서명 컴포넌트로 전환한 것은 제약을 정체성으로 바꾼 드문 사례다.

Explorer로 넘어가면 그 월드가 사라진다. 칩은 보더 없는 `bg-fill`, 리스트 구분은 `--line` 1px 괘선(지면 대비 **1.30:1** — 사실상 비가시), 시트에 잉크 상단 보더 없음, 번호 뱃지에 보더 없음. 남은 Color Pop 흔적은 담기 바의 코랄 그림자 하나뿐이다.

**근본 원인은 취향이 아니라 문서 모순이다:**
- `PRODUCT.md:62` — 비비드 컬러 팝(시안 B)이 "캐논·편집자막 월드 **모두 대체**"
- `.impeccable/surfaces/…explorer-tsx.md:17` — "Chosen direction: **캐논** — 한국형 정보 서비스 표준"

핵심 화면을 지배하는 서피스 브리프가 폐기된 방향을 여전히 지목한다. Explorer는 브리프를 충실히 따랐고, 홈은 PRODUCT/DESIGN을 충실히 따랐다. 두 화면이 각자 옳게 행동한 결과 제품이 갈라졌다. `.impeccable/live/accept-receipts/3e4eb540.json`에 Explorer에 대한 `carbonize` 정리 TODO가 미완료로 남아 있는 것도 같은 사건의 흔적이다.

**결정론적 스캔:** `detect.mjs` — `src` 전체 exit 0, findings 0. URL 스캔은 puppeteer 미설치로 불가. 브라우저 오버레이는 Chrome 확장이 dev 서버에 도달하지 못해 수행하지 못했다(사용자에게 보이는 오버레이는 **없다**).

## Overall Impression

카피 규율과 법적 제약의 디자인 전환은 이 프로젝트에서 가장 뛰어난 부분이고, 아웃링크가 SSR로 전부 실재해 JS 없이도 완전히 동작한다. 문제는 **깔때기가 중간에서 끊긴다**는 것이다. 홈이 만든 기대(에너지·밀도·확신)를 Explorer가 받지 못하고, 그 Explorer에서 "간 곳 1"이 뜨며, 담아서 공유한 링크는 카톡에서 맨 URL로 뜬다. 가장 큰 기회는 새 기능이 아니라 **Explorer를 홈과 같은 월드로 되돌리는 것**이다.

## What's Working

1. **카피 규율** (`page.tsx:150`, `Explorer.tsx:284`) — "모든 장소에 출처 영상·타임스탬프 포함". 감탄사·과장 0건. PRODUCT.md의 톤 계약을 전 화면이 지킨다. 이건 대부분의 팀이 실패하는 지점이다.
2. **제약을 서명으로 전환** — 프로필 사진 금지(부정경쟁방지법)가 액센트 이니셜 뱃지를 낳았고, 그 색이 번호 뱃지·지도 핀·선택 강조로 흐르는 `--hl` 주입 체계로 확장됐다. 법적 제약이 시각 시스템의 중심이 됐다.
3. **JS 없는 완전 동작** — `/c/chuseonghoon/tokyo` 실측: 영상 아웃링크 5개, 지도 열기 5개가 전부 SSR HTML에 실재(`?v=eyi5GjsrNOg&t=11s` 등). 필터 칩도 `<Link scroll={false}>`라 JS 없이 동작. SEO 요건이자 접근성 기본선을 실제로 충족한다.
4. **지도 실패 설계** — `MapView.tsx:223-259`가 회색 박스 대신 도로선 SVG 스케치 + "목록만으로도 모든 장소를 확인할 수 있어요" + 재시도. 실패마저 월드 안에 있다.

## Priority Issues

### [P0] 공개 게이트가 코드로 강제되지 않아 "간 곳 1" 조각이 공개 중
**What.** 실측: `/c/chuseonghoon/tokyo` 간 곳 **5**, `/busan` **1**, `/fukuoka` **1**, `/kobe` **1**. PRODUCT.md는 "확정 핀 8개 미만 조각은 공개하지 않는다(완성형 조각 원칙)", 원칙 2는 "밀도가 신뢰다 — 빈 지도를 보여주지 않는다".
**Why it matters.** 검색으로 "추성훈 고베"를 치고 들어온 사람이 핀 1개짜리 지도를 만난다. 성공지표가 아웃링크 클릭인데, 클릭할 게 하나뿐인 페이지는 이탈로 끝난다. 게이트가 DB 플래그(`is_published`)에만 있고 조각 단위 확정 수 검사가 없다.
**Fix.** `[city]/page.tsx`의 `loadPiece`에서 `confirmed.length < 8`이면 `notFound()`(또는 noindex + "준비 중" 화면)로 분기. 홈·허브 집계에서도 동일 기준으로 제외해 카드가 없는 조각을 광고하지 않게 한다.
**Suggested command:** `/impeccable harden`

### [P1] Explorer가 홈과 다른 디자인 월드 — 깔때기 중간에서 정체성이 끊김
**What.** 위 Implementation Integrity Verdict 표 참조. 위반 지점: `Explorer.tsx:325`(1px 헤어라인 — DESIGN.md 명시적 Don't), `:241/:410/:422`(보더 없는 `bg-fill` 칩·필), `:263`(시트 잉크 상단 보더 없음), `:336`(번호 뱃지 보더 없음), `:329`(레몬 32% — 명세는 28%, 하드 섀도 없음).
**Why it matters.** 홈이 "이 서비스는 에너지가 있다"고 약속하고, 사용자가 실제로 시간을 보내는 화면이 그 약속을 회수한다. 브랜드가 랜딩에만 존재하면 재방문 기억이 남지 않는다.
**Fix.** 먼저 **어느 월드가 정답인지 결정**한다(아래 질문 참조). Color Pop이면 Explorer의 칩·필·번호 뱃지에 잉크 2px 보더를 복원하고 괘선을 카드로 되돌린다. 캐논이면 DESIGN.md·PRODUCT.md·`layout.tsx`의 방향 계약을 캐논으로 교체하고 홈을 낮춘다. **절대 중간에서 타협하지 않는다.**
**Suggested command:** 결정 후 `/impeccable polish` (또는 월드 교체 시 재문서화)

### [P1] 담기 → "링크 복사"가 공유 순간 죽는다 — OG 태그 0개
**What.** 렌더된 `<head>` 실측: `og:*` **0개**, `twitter:*` **0개**. 서피스 브리프가 이 화면의 *Memorable moment*로 지정한 바로 그 동작이다.
**Why it matters.** `?picked=`를 카톡에 붙이면 이미지·제목 카드 없이 맨 URL이 뜬다. 제품의 유일한 바이럴 루프가 마지막 한 걸음에서 끊긴다. 담긴 장소 수를 담은 동적 OG 이미지를 만들 수 있는 자리인데 비어 있다.
**Fix.** `layout.tsx` metadata에 `openGraph`/`twitter` 기본값 추가, `[city]/page.tsx`의 `generateMetadata`에 조각별 OG 추가. Next `opengraph-image.tsx`로 "추성훈의 도쿄 · 5곳" 카드를 Color Pop 월드로 생성. `?picked=`가 있으면 담은 수를 반영.
**Suggested command:** `/impeccable harden`

### [P1] `--brand` 위 흰 텍스트 3.10:1 — WCAG AA 위반
**What.** white on `#ff5a3c` = **3.10:1** (기준 4.5:1). 적용 지점: `Explorer.tsx:421` "담음" 13px, `:528` "링크 복사" 13px. white on `--sky` = **3.28:1** (`page.tsx:135` "도쿄 TYO" 14px).
**Why it matters.** 담기와 링크 복사는 이 화면의 결론 행동인데, 저시력 사용자와 야외 밝은 화면에서 라벨이 읽히지 않는다. 화살표 뱃지는 아이콘(비텍스트 3:1)이라 통과하지만 텍스트는 아니다.
**Fix.** 코랄 위 텍스트를 잉크로 바꾸거나(`ink/brand`는 통과), 코랄을 어둡게 조정한다. DESIGN.md의 "The Inverted State Rule"과도 맞는 방향이다 — 담긴 상태를 코랄 지면 + 잉크 텍스트로 반전.
**Suggested command:** `/impeccable colorize`

### [P2] 경계 화면 전무 — 404가 영어 기본 화면
**What.** `src/app` 전체에 `not-found.tsx` / `error.tsx` / `loading.tsx` 없음. 실측 `GET /c/nope/nope` → "This page could not be found" (Next 기본 흑백). `notFound()`는 `c/[creator]/page.tsx:97`, `[city]/page.tsx:192`에서 실제 호출된다.
**Why it matters.** 조각이 비공개로 내려가거나 slug가 바뀌면 검색 유입자가 월드 밖 영어 화면을 만난다. `loading.tsx` 부재는 `loadPiece`의 직렬 Supabase 왕복 6회와 겹쳐 ISR 캐시 미스 시 흰 화면 대기가 된다.
**Fix.** Color Pop 월드의 404(홈·인기 조각 링크 포함), `error.tsx`(지도 실패 화면과 같은 어조), 조각용 `loading.tsx` 스켈레톤 추가.
**Suggested command:** `/impeccable onboard`

## Persona Red Flags

**Casey (이동 중 모바일 — 이 제품의 주 유입 경로)**
- 액션 필 `min-h-9`(36px)와 지도 핀(28px)이 44×44 미만 — `Explorer.tsx:394/410/419`. 영상·지도·담기 3개가 `gap-2`로 붙어 있어 엄지 오터치 위험.
- 담기 후 링크 복사가 성공했는지 확신할 근거가 "복사됨" 텍스트 2초뿐. 클립보드 실패는 `:231`에서 **조용히 무시**된다 — 실패해도 사용자는 성공한 줄 안다.
- 부산/후쿠오카/고베 조각은 핀 1개. 모바일에서 지도 38dvh를 열어 핀 하나를 보는 건 낭비다.

**Jordan (첫 방문자)**
- 홈 헤더 뱃지 "비공식 · 출처는 전부 영상"이 첫인상에서 무슨 뜻인지 불명확하다 — 법적 고지가 브랜드 태그라인 위치를 차지한다.
- 히어로 스티커 칩("맛집", "영상 0:11", "도쿄 TYO")은 `aria-hidden` + `lg` 전용. 모바일 첫 방문자는 이 설명 장치를 아예 못 본다.
- "담기"가 무엇을 하는지 누르기 전엔 알 수 없다. 눌러야 하단 바가 나타나며 URL이 저장본이라는 사실이 드러난다.

**Riley (엣지/빈 상태)**
- `?picked=존재하지않는slug`를 넣으면 `initialPicked`에 그대로 들어가 하단 바가 "내 목록 1곳"을 표시하지만 대응하는 카드는 어디에도 없다 (`Explorer.tsx:154`는 slug 검증 없음).
- `?type=` 필터로 결과 0이 되면 "이 카테고리의 확정 장소가 아직 없어요"가 뜨지만 필터 해제 버튼이 그 자리에 없다 — 위로 스크롤해 "전체" 칩을 찾아야 한다.
- 홈 "준비 중" 대시 카드는 `creators.length < 4`일 때만 뜬다. 4번째 채널이 생기는 순간 예고 없이 사라진다.

**여행 직전의 한국어 시청자 (PRODUCT.md 1순위 페르소나)**
- 검색으로 "추성훈 도쿄"에 도착 → 5곳 확인 → 담기 → 링크 복사 → 카톡 전송. **마지막 단계에서 미리보기 카드가 없어** 받는 사람은 정체불명 URL을 받는다. 이 페르소나의 실제 과업(동행자와 공유)이 완주되지 않는다.

## Minor Observations

- `NEXT_PUBLIC_GOOGLE_MAPS_ID` 미설정 → `env.ts:46`이 `DEMO_MAP_ID`로 폴백. `MapView.tsx:113`이 이를 `AdvancedMarker` 지도에 넘기므로 배포 시 데모 워터마크 지도가 뜬다. 서피스 브리프가 미해결로 적어둔 항목이며, 배포 전 반드시 해소해야 한다.
- `prefers-reduced-motion` 블록이 `.ticker-track`·`.rise-in`만 덮는다. `MapView.tsx:267`의 `animate-pulse` 스켈레톤은 미포함.
- 히어로 스티커 칩 "영상 0:11"(`page.tsx:131`)은 현재 실제 티커 첫 항목과 값이 우연히 일치하지만 하드코딩이다 — 데이터가 바뀌면 조용히 어긋난다.
- 컨테이너 거터가 전 표면 `px-6 md:px-8`(24/32px)인데 DESIGN.md 명세는 20px. 구현이 일관되므로 문서 쪽이 stale.
- 어드민은 프로젝트 토큰을 전혀 쓰지 않고 Tailwind `neutral-*`을 쓴다. DESIGN.md가 "`/admin` 이하는 이 시스템의 규범이 아니다"라고 명시적으로 허용한 범위이므로 **결함이 아니다.**
- 어드민 확정 화면에 키보드 단축키 0건(`ConfirmClient.tsx` 상호작용 요소 67개). PRODUCT.md 원칙 5 "확정 1건당 10초가 사업성을 결정"과 충돌한다.
- `npx tsc --noEmit` exit 0. 세션 초기 진단 `Cannot find module './SummaryEditor'`는 오탐(파일 실재).
- SEO: `sitemap.ts` 없음, JSON-LD 없음, canonical 없음. 유입이 검색 단일 채널인 제품에서 큰 누락.

## Questions to Consider

- 서피스 브리프가 "캐논"이라고 적혀 있는 걸 알고 계셨나요? Explorer가 지금 모습인 건 취향이 아니라 **브리프를 정확히 따른 결과**입니다. 어느 문서가 진실인지 정하지 않으면 다음 화면에서 같은 분열이 또 생깁니다.
- 조각 4개 중 3개가 핀 1개입니다. 지금 필요한 게 디자인 개선일까요, 아니면 도쿄 조각 하나를 8핀 이상으로 채워 "밀도가 신뢰다"를 실제로 보여주는 걸까요?
- 담기의 결론이 "링크 복사"라면, 그 링크가 도착하는 화면(카톡 미리보기)도 이 제품의 디자인 표면 아닌가요?
- 홈의 확신에 찬 버전은 이미 존재합니다. Explorer의 확신에 찬 버전은 어떤 모습일까요?
