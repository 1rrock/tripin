# Tripin 전면 디자인 개편 — 경로 B (월드 교체)

> ⚠️ **폐기됨 (2026-08-07).** 이 문서가 계획한 '공항 사인 시스템' 월드는 실행된 뒤
> 다시 교체됐다. 현재 월드와 상태는 `docs/HANDOFF.md` 를 보라. 여기는 이력이다.


> 작성 2026-08-06 · **결정: 경로 B — 시각 월드 자체를 교체한다**
> 대상 4개 표면: `/`(홈) · `/c/[creator]`(허브) · `/c/[creator]/[city]`(조각) · `/c/[creator]/v/[videoId]`(타임라인)
> 범위 밖: `/admin` (DESIGN.md가 명시적으로 규범 밖)

---

## 0. 왜 교체인가 — 진단

`.impeccable/surfaces/src-app-public-c-creator-city-explorer-tsx.md`:

```
## Chosen direction
캐논 — 한국형 정보 서비스 표준 (standing exit, seed 08cb9f80)
```

`standing exit`은 impeccable이 매 방향 라운드마다 열어두는 **"카테고리 표준을 정직하게 실행하는 문"** 이다. 스킬 원문:

> *The standing exit: every direction round offers one quiet, permanent alternative, the category standard, played straight.*

즉 8/5에 뽑은 건 **디자인 방향이 아니라 "방향을 고르지 않는 선택지"** 였다. 당시엔 합리적이었다 — 홈·허브(Color Pop)와 Explorer(캐논)로 제품이 두 월드로 갈라져 있었고, 봉합이 급했다. DESIGN.md 205행이 대가를 기록한다:

> *"랜딩의 시각적 차별성을 포기하고 전 화면 일관성을 얻었다."*

**이번 작업은 그 포기를 되돌린다.** 일관성은 유지하되, 이번엔 실제로 고른 방향으로 통일한다.

### 지금 월드가 스스로에게 건 족쇄

DESIGN.md의 제약 7개 중 **6개가 "빼기"** 다:

| 제약 | 결과 |
|---|---|
| 그림자 = 모바일 시트 1개뿐 | 전 화면 완전 평면 |
| 회전 0도 | 시각적 리듬 없음 |
| 사진·일러스트·그라디언트·텍스처 전부 없음 | 지면이 빈 종이 |
| 서체 1종(Pretendard) | 대비를 웨이트로만 |
| authored 모션 = 화면당 1개 | 홈은 티커 하나가 전부 |
| ~~다크모드 없음~~ | **정정 (08-06): 이미 깨져 있었다** — 아래 참조 |

남은 표현 수단이 여백·크기·웨이트뿐이다. 이건 절제가 아니라 **표현 수단의 고갈**이다.

> **정정 (2026-08-06).** 위 목록에서 "다크모드 없음"은 문서상의 규칙이었을 뿐, **코드에는 라이트/다크 2테마가 이미 완성돼 있었다** — `globals.css`의 11개 토큰 × 2테마, `ThemeToggle`의 3상태 토글, `layout.tsx`의 FOUC 방지 스크립트. Step 0에서 DESIGN.md를 코드에 맞춰 정정했다. 즉 제약 7개 중 **하나는 이미 사용자 본인이 깨뜨렸다** — 이 제품이 표현을 원한다는 신호로 읽는 게 맞다.

---

## 1. 선행 정리 — 인큐번트를 정확히 알려줘야 한다 (필수)

new-work §1은 이렇게 시작한다:

> *Redesign: preserve product truth, content, function, constraints... **The old look is evidence of what the subject is, not authority over what it becomes.***

즉 스킬은 **현재 월드를 "안티 레퍼런스"로 읽는다** — 이걸 피해서 새 월드를 만든다. 그런데 지금 `.impeccable/design.json`(스킬과 디텍터가 읽는 기계 사이드카)이 **엉뚱한 월드**를 담고 있다:

```
design.json  northStar : The Sticker Atlas (스티커 아틀라스)   ← 08-04에 폐기된 월드
design.json  shadows   : hard-shadow    = 4px 4px 0 var(--ink)
                         hard-shadow-lg = 6px 7px 0 var(--brand)
                         card-lift      = 6px 6px 0 var(--ink)
design.json  generated : 2026-08-04T23:30   ← 캐논 결정(08-05)보다 이전
```

DESIGN.md 205행은 정반대를 말한다:

> *"**하드 오프셋 그림자, 2px 잉크 보더, 회전 스티커, 84px 히어로는 이 시스템에 존재하지 않는다.**"*

**경로 B에서 이게 왜 중요한가**: DESIGN.md는 어차피 교체된다. 하지만 스킬이 "무엇을 피할 것인가"를 판단할 때 **폐기된 Sticker Atlas를 인큐번트로 오인하면 엉뚱한 것을 안티 레퍼런스로 삼는다.** 실제로 피해야 할 건 캐논(평면·무채색·저밀도)인데, 스티커(하드 섀도·회전)를 피하려 들면 결과가 다시 캐논 쪽으로 수렴한다.

### 코드는 이미 깨끗하다 (검증 완료 2026-08-06)

`globals.css` + `src/app/(public)/` + `src/shared/ui/` 전체 검색 결과:

- **하드 오프셋 그림자 0건 · 2px 잉크 보더 0건**
- 걸린 4건은 전부 정당:
  - `src/shared/ui/MapView.tsx:271-272` — `rotate-6`/`-rotate-3`은 지도 실패 시 **도로선 SVG 스케치**. DESIGN.md 367행이 직접 규정
  - `src/app/(public)/c/[creator]/v/[videoId]/Timeline.tsx:397,413` — `border-2 border-paper`는 스크러버 마커 링. **잉크가 아니라 페이퍼** 보더

**잔재는 `design.json` 한 파일에만 있다.**

### Step 0 — ✅ 완료 (2026-08-06)

`/impeccable doctor` → `design-sidecar-stale` 1건(mention) 확인 → `document`로 사이드카 재생성. 재실행 결과 **`findings: []`**.

실제로는 드리프트가 1건이 아니라 **4건**이었다:

| 발견 | 처리 |
|---|---|
| `design.json`이 폐기된 Sticker Atlas 월드 | 캐논 기준으로 재생성 (schemaVersion 2, 컴포넌트 10개, 룰 11개) |
| **코드에 다크 모드가 있는데 DESIGN.md는 금지** | DESIGN.md를 코드에 맞춤 + 결정 이력 기록 |
| `--white` ↔ `--card`, `--on-brand` 누락 | 토큰명·참조 전부 정정, 대비비 두 테마 재실측 |
| CTA 56px/32px/16px ↔ 코드 48px/24px/15px | 코드 기준으로 정정 |

**미해결 (코드 결함 2건)** — §9 참조.

<details><summary>당시 사용한 프롬프트</summary>

```
/impeccable doctor
```

> 그대로 실행하고 무엇이 스테일인지 보고해라. **DESIGN.md(캐논)가 진실이고 design.json은 폐기된 Sticker Atlas 월드를 담고 있다** — design.json을 DESIGN.md 기준으로 재생성해라.
>
> 곧 월드를 교체할 예정이라 DESIGN.md 자체는 어차피 바뀐다. 그럼에도 지금 맞추는 이유는, redesign 플로우가 **현재 월드를 안티 레퍼런스로 읽기 때문**이다. 피해야 할 건 캐논(평면·무채색·저밀도)이지 스티커(하드 섀도·회전)가 아니다.
>
> `.impeccable/critique/2026-08-05T00-51-24Z__*.md`(25/40, P0 1건)도 스테일이다 — 월드 통합 **이전** 스냅샷이라 4번 "Consistency 1점 — 공개 화면 두 개가 서로 다른 월드" 지적은 이미 해결됐다.

</details>

---

## 2. 방향 결정 — 핵심 단계

```
/impeccable shape 공개 화면 전체 — 시각 월드 교체
```

`shape`는 과업 발견을 담당하고 **월드 결정만 new-work로 넘긴 뒤 구현 전에 멈춘다**(new-work §5 마지막 줄). 그래서 이 단계는 "방향 확정"에서 끝나고, 코드는 다음 단계다.

### 붙일 프롬프트

> **8/5에 고른 캐논(standing exit, seed 08cb9f80)을 폐기한다.** 그건 방향이 아니라 "방향을 고르지 않는 문"이었고, 당시 두 월드로 갈라진 제품을 봉합하려는 응급 조치였다. 이번엔 실제로 방향을 고른다.
>
> **new-work §3 "Create or replace the visual world"를 전부 밟아라. `concept-seed.mjs --scope direction --mode operate` 는 건너뛸 수 없다.**
>
> **모드는 `operate`로 굴려라.** 이유: 자원 80%가 들어간 핵심 화면이 `/c/[creator]/[city]`(Operate)이고, PRODUCT.md 기준 **트래픽 대부분이 "채널명+도시" 검색으로 이 화면에 직접 착지한다** — 홈이 아니라 여기가 실질적 랜딩이다. 이 화면을 감당 못 하는 월드는 탈락이다. 홈은 자기 surface brief에서 Persuade를 유지한다.
>
> ### 반드시 유지할 제품 진실 (월드가 바뀌어도 불변)
> - **채널 퍼스트** — 홈은 크리에이터 명단이지 지도가 아니다 (세계지도를 깔면 "아무것도 없는 서비스"로 읽힌다)
> - **유튜브 트레이드드레스 금지** — 빨강 주조·썸네일 그리드·재생버튼 클론·채널 아트. 이건 취향이 아니라 **법적 방어선**이다
> - **크리에이터 프로필 사진·채널 로고 사용 불가** (법적 제약) → 이니셜 + accent_color가 채널 식별자다
> - 모든 장소가 **타임스탬프 붙은 출처 영상**으로 끝난다 — 이게 제품의 종착지이자 성공 지표(아웃링크 클릭)
> - **8핀 미만 조각 비공개** (`MIN_CONFIRMED_PINS`) — 밀도가 신뢰다
> - 한국어 우선, 모바일 우선(375/390)
> - `?picked=` URL이 곧 저장본 — 링크 복사가 공유·재방문 동작
>
> ### 타이포 물리 법칙 (월드 무관하게 유지)
> - **The Korean Measure Rule** — 한국어 한 줄 35–45자. 라틴 ch 기준 수치는 한국어에서 약 2배 과대평가된다. 자동 도구가 "112 chars/line"이라 하면 실제론 절반이다
> - `word-break: keep-all` 전역 — 한국어는 어절 단위로만 줄바꿈
> - 숫자에 `tabular-nums` — 스크롤 중 숫자가 흔들리지 않게
>
> ### 러트(rut) — 후보에서 빼거나 최대 1개만
> new-work §3.1이 요구하는 러트 명시다. 미리 정리해둔다:
> - **카테고리 기본**: 지도 퍼스트 여행 앱 / 유튜브식 썸네일 그리드 → 둘 다 러트
> - **브리프의 문자적 독해**: 여행 = 여권 스탬프, 러기지 태그, 폴라로이드, 코르크보드 핀, 접히는 종이 지도 → **이 계열 전체에 후보 1개만 배정**
> - **이미 써본 것**: 캐논(한국형 정보 서비스 표준) → 후보에서 제외
> - **7개 후보가 최소 3개 물성 계열에 걸쳐야 한다** — 한 계열이 4개 이상이면 파생이 가장 뻔한 지점에서 멈춘 것이다
>
> ### 절대 착지하면 안 되는 지점
> 스킬이 지목하는 AI 기본 클러스터 중 첫 번째가 *"warm cream ground, high-contrast serif display, terracotta or signal-red accent"* 인데, **이게 정확히 Tripin의 현재 팔레트다** (`--paper #fffdf8` + `--brand #ff5a3c`). 새 월드가 여기로 돌아오면 아무것도 바꾸지 않은 것이다.
>
> 기본값 서체도 금지: Fraunces, Playfair Display, Cormorant, Lora, Crimson, Newsreader, Syne, Space Grotesk, Space Mono, IBM Plex, Inter-as-display, DM Sans, DM Serif, Outfit, Plus Jakarta Sans, Instrument Sans. 한국어 서체는 Pretendard 외 실제 선택지가 좁으므로 **한글 본문 서체와 디스플레이/라틴 서체를 분리 결정**해라 — 한글 렌더링 품질과 웹폰트 용량을 근거로 판단하고, 고른 이유를 적어라.
>
> ### 후보 심사 기준
> - **조각 화면(모바일 지도 38dvh + 시트, `lg` 2컬럼 + sticky 지도)을 감당 못 하는 방향은 탈락이다.** 이 구조는 카카오맵 문법으로 검증됐고 실제 과업(훑기→담기→나가기)을 지탱한다
> - 번호 뱃지 ↔ 지도 핀 ↔ 리스트 1:1 연동은 제품의 핵심 장치다. 새 월드가 이걸 더 강하게 표현할 수 있어야 한다
> - 프로필 사진 없이 채널을 구분하는 방법이 월드 안에 있어야 한다
>
> 결정은 `serve-question.mjs` 결정 페이지로 카드 비교해서 받아라. **standing exit(canon)은 이미 써봤으니 canonCard에 그 사실을 명시**하고, 다시 고르면 같은 자리로 돌아온다는 걸 알 수 있게 해라.

> ⚠️ **참고**: 2026-08-06에 `concept-seed.mjs`를 잘못된 인자로 호출해 스코프 없는 롤(key `d548bddc`)이 한 번 굴러갔다. `--scope direction --mode operate`가 아니었으므로 **무효다.** 실제 롤은 이 단계에서 새로 굴린다.

---

## 3. 방향 계약 기록 — 코드보다 먼저

new-work §5는 코드 이전에 **방향 계약을 HTML 주석으로 박아 넣으라**고 요구한다. 위치가 까다롭다:

> *an HTML comment in the emitted markup, never only a templating-frontmatter comment, placed as **the first child of the document's body in the root layout**, never inside a slotted or child component*

Tripin에서는 **`src/app/layout.tsx`의 `<body>` 첫 자식**이다. (`(public)/layout.tsx`가 아니다 — 그건 자식 레이아웃이라 컴파일러가 걷어낼 수 있다.)

5개 블록 + 마감선, 150단어 이내:

| 블록 | 내용 |
|---|---|
| `THESIS` | 이 표면이 소유한 단 하나의 아이디어 + **거부하는 카테고리 기본 배치** |
| `OWN-WORLD` | 팔레트와 컴포넌트 언어. **콘텐츠를 전부 지워도 알아볼 수 있을 만큼 구체적으로** |
| `STORY` | 방문자가 무엇을 이해하고, 믿고, 행동하는가 |
| `FIRST VIEWPORT` | 정확한 구성 — 무엇이 어디에 어느 크기로, 주 행동이 어디에 |
| `FORM` | 고른 형태 + 내 후보 목록에서의 순위 + **스크립트가 출력한 seed key** |
| `FINISH` | 축자 그대로: `unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md` |

> **블록이 무드처럼 읽히면 방향이 아직 안 정해진 것이다.** 마감 리뷰가 렌더를 이 계약과 대조해 감사한다.

프로덕션 빌드 후 검증:

```bash
npm run build && grep -r "<seed-key>" .next/server/app/ | head
```

**빌드가 지운 계약은 아무도 감사할 수 없다.**

### ⚠️ 이 시점에 DESIGN.md를 쓰지 마라

new-work §5:

> *On a new or replacement world, **DESIGN.md is written at finish**, from the built world, by the shipped documenter... a rulebook written before the build gets defended against reality instead of describing it.*

현재 DESIGN.md(캐논)는 **Step 7까지 그대로 둔다.** 지우지도, 미리 새로 쓰지도 않는다.

---

## 4. 컴프 승인 — 건너뛰지 말 것

new-work §5 마지막:

> *the locked direction is **visualized before it is built, never skipped**: load visualize.md and follow it, three compositional options rendered and put before the user for approval. **This step is proven to produce the most compositional and ambitious work.***

```
/impeccable shape  (계속) — visualize 단계
```

> 확정된 방향으로 **컴포지션 3안**을 렌더해서 승인받아라. **컴프 대상은 조각 화면(`/c/[creator]/[city]`)의 첫 뷰포트**다 — 홈이 아니다. PRODUCT.md 기준 트래픽 대부분이 검색으로 이 화면에 직접 착지하므로 여기가 실질적 랜딩이고, 제약도 가장 빡빡하다(지도 + 리스트 + 담기 바 + 필터 칩). **여기서 성립하는 월드는 홈에서도 성립하지만, 반대는 성립하지 않는다.**
>
> **프레임은 세로(모바일 375×812)** 로 렌더해라 — 모바일 우선 표면이다. 가로 프레임은 이 제품에서 깨진 프레임이다.
>
> 승인 후 홈 첫 뷰포트도 1안 추가로 받아라. 홈은 Persuade라 표현 강도가 다르다.

---

## 5. 구현 — 표면 4개 순서

new-work §6: **"컴프가 왕(the comp is king)"**, 2단계 빌드.

- **1단계 재현**: 컴프 폭·높이에서 스크린샷이 컴프와 거의 픽셀 단위로 겹칠 때까지. 허용 타협 3개뿐 — 서체(가장 근접한 것), 아이콘, 컴프 자체의 명백한 결함(오타 등)
- **2단계**: 그다음에야 모션·인터랙션·반응형

> *models systematically believe their HTML, CSS, and SVG recreation succeeded when it did not, so **the overlap comparison is the authority, never your conviction**.*

### 순서

| # | 표면 | 모드 | 왜 이 순서 |
|---|---|---|---|
| 1 | `/c/[creator]/[city]` **조각** | Operate | 자원 80%, 실질 랜딩, 제약 최다. **여기가 새 규범의 근거 소스** |
| 2 | `/` **홈** | **Persuade** | 표현 강도 최대. 조각에서 확정된 월드를 Persuade 레지스터로 올린다 |
| 3 | `/c/[creator]` **허브** | Persuade | 홈과 그리드 규칙 공유 → 홈 직후가 효율적 |
| 4 | `/c/[creator]/v/[videoId]` **타임라인** | Operate | 영상별 타임라인. 조각의 규범 상속 |

**1번이 8/5 분열의 재발 방지 장치다.** 지난번엔 홈부터 만들고 조각이 따로 놀았다. 이번엔 반대로 간다.

### 조각 화면 프롬프트 (1번)

> 승인된 컴프를 재현해라. **new-work §6 재현 단계 규칙을 그대로 적용** — 매 영역마다 같은 치수로 스크린샷을 컴프 옆에 놓고 비교하고, 계속 지는 영역은 코드 재현을 포기하고 렌더된 에셋으로 합성해라.
>
> **보존할 동작** (디자인이 아니라 기능이다):
> - 모바일: 지도 38dvh + 시트가 24px 겹쳐 올라탐 / `lg`: `minmax(0, 26rem) 1fr` 2컬럼 + `sticky top-20` 지도
> - 번호 뱃지 ↔ 지도 핀 1:1 연동
> - `?picked=` URL 상태, 링크 복사
> - 지도 실패 시 리스트만으로 완전 사용 가능 (재시도 내장)
> - candidate는 지도에 안 올리고 "위치 확인 중" 섹션 격리
> - 헤더가 지도보다 먼저 렌더 (LCP에서 지도 스크립트 배제)
>
> **월드 문법으로 다시 만들 것**: 지도 핀, 번호 뱃지, 장소 행, 필터 칩, 담기 바, 로딩 스켈레톤, 실패 상태. *"a stock component inside a committed form is a lapse"* — 하나도 남기지 마라.
>
> ⚠️ **`NEXT_PUBLIC_GOOGLE_MAPS_ID` 미설정** — `env.ts:46`이 `DEMO_MAP_ID`로 폴백한다. `AdvancedMarker`는 유효 mapId를 요구하므로 **지도 시각 검증 전에 발급 필요**. 미발급 상태로 스크린샷 찍으면 타일·POI가 실물과 다르다.

---

## 6. 마감 — 스킬이 강제하는 절차

new-work §7. 임의로 줄이면 안 되는 부분이다.

1. **스크린샷 라운드 최대 2회.** 데스크톱·모바일 한 배치로. 수정은 배치로 묶고, 수정 하나당 스크린샷 찍지 않는다
2. **`detect.mjs` 1회** — 이 프로젝트에 디자인 훅이 없다면:
   ```bash
   node /Users/1rrock/.claude/skills/impeccable/scripts/detect.mjs --json <변경 파일들>
   ```
   기계적인 것만 고치고 나머지는 리뷰어에게 넘긴다. **디텍터는 두 번 돌리지 않는다**
3. **`impeccable-finish-reviewer` 를 새 컨텍스트로 스폰.** *"never inherits it... a reviewer that inherits your transcript inherits your framing, your optimism, and your abstractions"* — 입력 패킷으로만 전달: 원 요청, 확정 답변, 아티팩트 경로, 스크린샷 경로, 방향 계약, 훅 findings, QUALITY BAR 카드, 승인 컴프 경로, craft-floor 경로
4. **재빌드 지시가 오면 수정 배치를 건너뛰고 즉시 재빌드.** 허락을 구하지 말고 무슨 일이 일어나는지 알려라. 사용자 상담은 **두 번째** 재빌드 지시 때
5. **`impeccable-documenter` 스폰 → 여기서 DESIGN.md와 design.json이 새로 쓰인다.** 지어진 월드가 근거지 의도가 아니다

> *A clean detector pass is not finished; finished is the contract kept, the comp honored, the review closed, and the system recorded.*

### surface brief 갱신

```bash
node /Users/1rrock/.claude/skills/impeccable/scripts/surface-brief.mjs read  src/app/\(public\)/c/\[creator\]/\[city\]/Explorer.tsx
node /Users/1rrock/.claude/skills/impeccable/scripts/surface-brief.mjs write <target> <body-file> [related...]
```

홈은 아직 자기 브리프가 없다 — **Persuade 모드로 새로 만들어라.** 지금은 브리프가 Explorer 하나뿐이라 홈이 계속 Operate 규범을 물려받고 있고, 그게 홈이 얌전한 이유 중 하나다.

---

## 7. 병렬 실행 (ulw) 매핑

의존이 강해서 병렬 구간이 좁다.

```
Step 0  doctor                                   순차 (선행)
   ↓
Step 2  shape → 7후보 → 룰렛 → 방향 확정          순차 (단일 사고 흐름)
   │        └─ 스케치 4장은 병렬 ★ (카드당 에이전트 1개, 최대 4개 동시)
   ↓
Step 3  방향 계약 → layout.tsx + 빌드 grep 검증   순차
   ↓
Step 4  컴프 3안 렌더 → 승인                      렌더는 병렬 가능
   ↓
Step 5-1  조각 화면 구현                          순차 (새 규범의 근거)
   ↓
Step 5-2  홈 구현                                 순차 (Persuade 레지스터 확정)
   ↓
Step 5-3  허브  ∥  Step 5-4  타임라인             ★ 여기서 2개 병렬
   ↓
Step 6  detect → finish-reviewer → documenter     순차
```

**병렬 가능 지점은 3곳뿐이다**: 스케치 생성(new-work가 명시적으로 허용), 컴프 3안 렌더, 그리고 허브+타임라인 구현.

방향 결정과 조각/홈 구현은 **절대 병렬로 돌리지 마라.** 서로 충돌한 월드 조각들이 나오고, 그게 정확히 8/5에 봉합한 문제다.

실행 시:

```
ulw: REDESIGN-PLAN.md Step 5-3, 5-4를 병렬로 실행해줘.
     조각·홈에서 확정된 월드 규범을 둘 다 입력으로 받아야 한다.
```

---

## 8. 안 쓸 명령

| 명령 | 이유 |
|---|---|
| `audit` `harden` `optimize` | a11y·성능·i18n·엣지케이스 — 이번 범위 밖 |
| `bolder` `quieter` `distill` `polish` | **refinement 계열.** 인큐번트 정체성을 보존하는 명령이라 월드 교체와 정면 충돌 |
| `document` | 직접 부르지 마라. 마감의 `impeccable-documenter`가 지어진 월드에서 쓴다 |
| `live` | dev 서버 + **로컬** 브라우저 필요. surface brief에 원격 브라우저(Windows)에 붙어 실패한 이력 있음 — 쓰려면 `list_connected_browsers`로 `isLocal:true` 먼저 확인 |

> new-work §"How to design": *"Never split the difference into **polish on the discarded look**."*

---

## 9. 알려진 리스크와 검증 부채

### ✅ 다크 모드 결함 — 발견 3건, 전부 수정 (2026-08-06, `677528c`)

원인은 하나였다: **테마를 따라가지 않는 지면 위에 테마를 따라가는 글자색(`--ink`)을 썼다.** 코랄·레몬은 두 테마에서 같은 밝은 중간톤이고, 크리에이터 액센트와 지도 타일은 아예 테마 밖(DB·외부 서비스)에서 온다.

| # | 파손 | 다크 대비 |
|---|---|---|
| 1 | 레몬 지면 위 `--ink` — 10곳 (홈 티커, 워드마크 "in", 도시 칩 4, 다음행동 칩 4) | **1.16** → 12.45 |
| 2 | 레몬 칩 hover 반전이 `--ink` 지면으로 가서 레몬 글자가 다시 사라짐 | **1.16** → 12.45 |
| 3 | 액센트·지도 핀 위 `--ink` (활성 핀은 지면까지 `--ink`라 흰 글자가 밝은 지면에) | 파손 → 18.42 |

도입 토큰 3종 (전부 두 테마 공통 고정값): `--on-lemon` `#231a00` · `--ink-fixed` `#141414` · `--hl-under`(밑줄 띠 높이 — 라이트는 글자를 관통하는 형광펜 `-0.32em`, 다크는 겹치지 않게 내린 밑줄 `-0.12em`).

`Explorer.tsx:334`의 하드코딩 `white`도 `var(--card)`로 교정했다 (`Timeline.tsx`는 원래 맞게 쓰고 있었다).

**검증**: 두 테마 전부 WCAG AA — **최악값 1.16 → 6.23**. `next build` ✓ · `eslint` ✓ · `tsc` ✓ · `impeccable doctor` findings `[]` ✓

> 남은 디텍터 지적 3건은 전부 `advisory` — 타입 램프 밖 크기(`14px` 1건, `16px` 2건). **고치지 않았다** — 월드 교체가 타입 램프를 통째로 다시 짜므로 지금 맞추는 건 버려질 작업이다.

<details><summary>수정 전 상세 (기록용)</summary>

**1. 레몬 지면 위 글자가 다크에서 보이지 않는다 — 1.16:1**

`--brand`는 다크 대응 글자색 `--on-brand`(`#23120c`)를 받았지만 **`--lemon`은 못 받았다.** 두 테마 모두 밝은 노랑(`#ffd43a` / `#ffd84d`)인데 글자색이 `--ink`라, 다크에서 `#e9ebee`(밝은 회색)가 밝은 노랑 위에 얹힌다.

영향 표면 (전부 `--ink` 명시 또는 상속):

| 파일 | 위치 |
|---|---|
| `src/app/(public)/page.tsx:208` | 홈 레몬 티커 (상속) |
| `src/app/(public)/layout.tsx:18` | 헤더 워드마크 "in" 블록 (상속) |
| `src/app/(public)/HomeBrowse.tsx:215,223` | 도시 칩 (`text-ink`) |
| `src/app/(public)/CreatorSearch.tsx:165,173` | 도시 칩 (`text-ink`) |
| `src/app/(public)/c/[creator]/page.tsx:210` | 도시 칩 (상속) |
| `src/app/(public)/c/[creator]/v/[videoId]/page.tsx:118` | 다음 행동 칩 (`text-ink`) |
| `src/app/(public)/c/[creator]/[city]/Explorer.tsx:487,504` | 다음 행동 칩 (상속) |
| `src/app/globals.css:141` | `.hl-under` 히어로 밑줄 — 밑줄 위 글자가 `--ink` |

**처방은 이미 코드 안에 있다** — 코랄이 받은 것과 같은 고정 글자색 `--on-lemon`을 도입하면 된다.

**2. `Explorer.tsx:334` — 선택 행 틴트에 하드코딩 `white`**

```
Explorer.tsx:334   color-mix(in srgb, var(--lemon) 32%, white)     ← 다크에서 밝은 블록
Timeline.tsx:86    color-mix(in srgb, var(--lemon) 32%, var(--card))  ← 올바른 패턴
```

같은 장치인데 한쪽만 토큰을 쓴다. `Timeline.tsx`가 의도된 패턴이므로 `Explorer.tsx`를 `var(--card)`로 맞추면 된다. 다만 이 행의 글자색도 결함 1에 걸려 있어 **두 건을 같이 고쳐야 한다.**

</details>

### 그 밖

| 항목 | 영향 |
|---|---|
| **`NEXT_PUBLIC_GOOGLE_MAPS_ID` 미설정** | `env.ts:46`이 `DEMO_MAP_ID` 폴백. 조각 화면 시각 검증 전 발급 필수 |
| **다크 모드는 새 월드의 필수 요건이 아니다** | 사용자 결정(08-06): *"자유 — 월드가 먼저, 테마는 나중에."* 새 월드가 단일 지면을 요구하면 다크 모드를 포기할 수 있다. 방향 후보 심사에서 테마 지원을 탈락 기준으로 쓰지 않는다 |
| **모바일 폭 실기 검증 불가 이력** | 브라우저 확장의 `resize_window`가 뷰포트에 전파 안 됨(`window.innerWidth` 781 고정). 모바일이 주력 유입인 제품이라 실기 확인 경로 확보 필요 |
| **터치 타깃 36px/28px** (44px 미만) | 접근성 범위지만 모바일 주력이라 실사용 영향. 월드 교체 시 자연스럽게 재설계 대상 |
| **일정** | 주 5~8시간 캡(PRODUCT.md), 표면 4개 + 마감 절차 → **2~3주. 그동안 조각 생산 정지** |
| **월드 분열 재발** | 4개 표면을 다 못 끝내면 8/5 상태로 되돌아간다. **조각 → 홈 → 허브 → 타임라인 순서를 끝까지 지키는 게 방지책** |

---

## 10. 되돌리는 법

작업 전 안전망:

```bash
git switch -c redesign-world-v2
git add -A && git commit -m "chore: 월드 교체 전 스냅샷 (캐논)"
```

현재 캐논 월드는 커밋 `319a285` + 워킹 트리에 있다. 새 월드가 실패하면 `master`로 돌아오면 된다. **`master`에서 직접 작업하지 마라** — 되돌릴 지점이 사라진다.
