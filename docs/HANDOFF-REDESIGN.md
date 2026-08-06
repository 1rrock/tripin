# Tripin 핸드오프 — 시각 월드 교체 (2026-08-06)

> 브랜치 `redesign-world-v2` 의 상태 스냅샷. 캐논(한국형 정보 서비스 표준)을 버리고
> **공항 사인 시스템**으로 교체하는 작업이며, 토큰·프리미티브까지 끝나고 화면 마이그레이션이 남았다.
> 선행 문서: `PRODUCT.md` · `LEGAL.md` · `DESIGN.md`(아직 캐논 — 마감에 교체됨) · `REDESIGN-PLAN.md`
> 이전 스냅샷: `docs/HANDOFF.md` (2026-08-04, 캐논 시절)

---

## 0. 30초 요약

- 디자인 월드를 **캐논 → 공항 사인 시스템**으로 교체 중. 방향 확정·컴프 승인 완료
- **모바일이 원본**이고 데스크톱은 같은 시스템의 반응형 확장. 데스크톱 우선으로 갔던 시도는 전부 폐기됨
- 토큰 레이어(`globals.css`)와 프리미티브(`shared/ui/sign.tsx`)까지 완료, 빌드 통과
- **남은 일: 공개 화면 12개 파일 240곳 마이그레이션.** `Explorer.tsx` 부터
- 작업 브랜치 `redesign-world-v2`. 되돌리려면 `master` (커밋 `319a285`)

---

## 1. 왜 바꿨나

`.impeccable/surfaces/…explorer-tsx.md` 에 이렇게 적혀 있었다:

```
## Chosen direction
캐논 — 한국형 정보 서비스 표준 (standing exit, seed 08cb9f80)
```

`standing exit` 은 impeccable 이 매 방향 라운드에 열어두는 **"카테고리 표준을 정직하게 실행하는 문"** 이다.
즉 2026-08-05 에 고른 건 방향이 아니라 **방향을 고르지 않는 선택지**였고, 당시엔 홈·허브(Color Pop)와
Explorer(캐논)로 갈라진 제품을 봉합해야 해서 합리적이었다. `DESIGN.md:208` 이 대가를 기록한다 —
*"랜딩의 시각적 차별성을 포기하고 전 화면 일관성을 얻었다."*

이번 작업이 그 포기를 되돌린다.

**절차** (impeccable new-work §3~5):
1. 러트 명시 — 지도 퍼스트 여행 앱 / 유튜브 썸네일 그리드 / 여권 스탬프 계열(후보 1개만) /
   캐논(이미 써봄) / 웜 크림+세리프+테라코타(= 당시 팔레트, 사용자 명시 거부)
2. 자체 후보 7개 도출 (6개 물성 계열) — 다큐 필름 로그 · 자연사 표본 라벨 · 문화유산 조사보고서 ·
   바둑 기보 · 등반 개념도 · 해도 · 접히는 여행 지도(러트 슬롯)
3. `concept-seed.mjs --scope direction --mode operate` → **ASSIGNED INDEX 3**, seed **`21af9ba1`**
4. 융합 계량(청중 식별 · 제품 명료성) → **공항 사인 시스템이 배정 방향을 두 축 모두 이겨 빌드가 됨**
5. 사용자가 결정 페이지에서 확정, 텔레메트리 전송 완료

**탈락 사유 기록** — 보딩패스(라이브 리랭크가 제품에 없음) / 7세그먼트(한글 90%가 시스템 밖) /
가변 폰트 스페시먼(사용자 안티레퍼런스와 정면 충돌) / 오리즈루(선형 과정 불일치) /
중력비 정원(baseline 왜곡이 한글 가독성 파괴)

---

## 2. 월드가 제품 진실에 붙는 지점

| 제품 | 사인 시스템 |
|---|---|
| 번호 뱃지 ↔ 지도 핀 1:1 연동 | 게이트 번호 |
| 8핀 미만 비공개 게이트 | *"닫힌 경로는 패널에서 사라진다"* |
| 영상·지도 아웃링크 | 모서리에 고정된 화살표 |
| 조각 화면의 다음 행동 | decision-point 토폴로지 |

---

## 3. 디자인 시스템 — 전부 실측값

시안 PNG 를 디코딩해 픽셀을 직접 셌다. 스크립트가 남아 있으므로 재검증 가능하다:

```bash
# 리포에는 원본 webp 만 있다 (png 는 파생물이라 gitignore)
sips -s format png .impeccable/refs/qb-board.webp --out .impeccable/refs/qb-board.png
python3 .impeccable/refs/measure-reference.py .impeccable/refs/qb-board.png
```

기준: 시안 폰 화면 폭 = 보드 332px → 375 환산 배율 **1.130**

| 항목 | 실측 | 토큰 |
|---|---|---|
| 지면 | `#ffcc00` — 배경·카드·칩 **전부** | `--sign` |
| 잉크 | `#0e0d0b` — 픽토그램 인셋·푸터·본문 | `--ink` |
| 카드 보더 | **2px `rgb(151,116,0)` 저대비** | `--hairline` / `--stroke-card` |
| 카드 내부 디바이더 | 1.2px | `--stroke-divider` |
| 활성 표현 | 색이 아니라 **보더 굵기 3.5px** | `--stroke-active` |
| 카드 라운드 | 17px | `--r-card` |
| 카드 픽토그램 인셋 | **86px**, 글리프는 박스의 **50%** | `--box-card` / `--glyph-ratio` |
| 퀵액션 인셋 | 70px | `--box-quick` |
| 프로필 | **검정 라운드 정사각 52px** (원형 사진 아님) | `--box-avatar` |
| 데이터 라벨 | cap 8px → 12px, 자간 8% | `--t-label` |
| 데이터 값 | cap 38px → **30px** | `--t-value` |
| 거대 숫자 | cap 77px → 52px | `--t-value-hero` |
| 푸터 | 전폭·하단 고정, **칩 없음** — 활성은 아이콘·라벨이 노랑 | `--r-nav` / `--icon-nav` |

### 조정하는 법

컴포넌트에서 px 를 직접 쓰지 않는다. `globals.css` 에서만 바꾼다.

```css
--glyph-ratio: 0.5;   /* 아이콘이 크다 → 이 숫자 하나만 내린다. 전체가 따라온다 */
--box-card: 86px;     /* 박스 자체를 키우려면 여기 */
```

### 반응형 원칙 (중요)

**컨테이너만 넓히고 값을 그대로 두면 안 된다.** `md`/`xl` 에서 박스·획·타이포를 함께 키운다.
1440px 에서 인셋 62px·보더 1.5px 를 쓰면 화면폭 대비 4%·0.1% 가 되어 사인 시스템이
**HTML 테이블로 무너진다** — 데스크톱 컴프가 반복해서 실패한 원인이 정확히 이것이다.

---

## 4. 지금까지 한 것

| 커밋 | 내용 |
|---|---|
| `90c8672` | 월드 교체 전 스냅샷 + 문서 정합 (`design.json` 을 폐기된 Sticker Atlas → 캐논으로 재생성) |
| `677528c` | **다크 테마 대비 파손 3건 수정** — 최악 1.16:1 → 6.23:1 |
| `19498bc` | REDESIGN-PLAN 갱신 |
| `dfc1fd8` | 방향 계약을 `layout.tsx` `<body>` 첫 자식 HTML 주석으로 기록 (프로덕션 빌드 감사 통과) |
| `7ee4bf1` | 컴프 승인 기록 |
| `eccb9b6` | **토큰 레이어 + 프리미티브** |

### 다크 파손 3건 (곁가지로 발견·수정)

원인은 하나였다 — *테마를 따라가지 않는 지면 위에 테마를 따라가는 글자색(`--ink`)을 썼다.*
레몬 지면 위 10곳이 다크에서 **1.16:1**(글자가 보이지 않음), 레몬 칩 hover 반전, 액센트·지도 핀.
`--on-lemon` · `--ink-fixed` · `--hl-under` 도입으로 해소. **이 수정은 캐논 시절 코드에 한 것이므로
월드 교체가 끝나면 대부분 대체된다** — 다만 "테마 밖 지면 위에는 고정 글자색" 이라는 원칙은 남는다.

---

## 5. 남은 일 — 화면 마이그레이션

구 토큰 클래스가 **12개 파일 240곳**. 단순 치환이 아니다(필 → 사각 인셋, 굵은 보더 → 헤어라인).

| 순서 | 파일 | 남은 곳 | 비고 |
|---|---|---|---|
| 1 | `(public)/c/[creator]/[city]/Explorer.tsx` | 41 | **자원 80%, 새 규범의 근거 소스** |
| 2 | `(public)/page.tsx` + `HomeBrowse.tsx` + `CreatorSearch.tsx` | 89 | 홈. 시안 홈 패턴(인사→검색→퀵액션→목록) |
| 3 | `(public)/c/[creator]/page.tsx` + `VideoList.tsx` | 31 | 허브 |
| 4 | `(public)/c/[creator]/v/[videoId]/` | 44 | 타임라인 |
| 5 | `shared/ui/MapView.tsx` | 15 | 핀을 사각 인셋으로 |
| 6 | `(public)/layout.tsx` · `[city]/page.tsx` · `ThemeToggle.tsx` | 20 | |

**조각 → 홈 → 허브 ∥ 타임라인 순서를 지킬 것.** 2026-08-05 의 월드 분열은 홈부터 만들고
조각이 따로 논 결과였다. 조각이 먼저 규범을 확정해야 한다.

### 프리미티브 사용법

```tsx
import { Box, Card, Divider, DataRow, BottomNav, Chip, placeGlyph } from "@/shared/ui/sign";

<Card active={isPicked}>
  <div className="flex items-center gap-4">
    <Box icon={placeGlyph(place.type)} size="card" />
    <div className="min-w-0 flex-1">…</div>
  </div>
  <Divider />
  <DataRow items={[
    { label: "핀", value: String(n) },
    { label: "영상", value: "12:40" },
  ]} />
</Card>
```

`DataRow` 는 값이 짧을수록(숫자·타임코드) 잘 산다 — 이 월드가 게이트 번호·편명을 전제로 설계됐기 때문.
긴 한글 고유명사는 `DataRow` 가 아니라 카드 제목 자리에 둔다.

---

## 6. 열려 있는 결정 / 리스크

### 🔴 채널 프로필 사진 — 문서와 코드가 어긋나 있다

사용자가 **사용하기로 결정**(2026-08-06)했으나, 두 문서가 아직 금지하고 있다:

- `PRODUCT.md` "법적·약관 제약 (설계 변경 불가)" 목록에 *"크리에이터 프로필 사진·로고 사용 금지"*
- `LEGAL.md 1.3` *"아바타(프로필 사진)가 이름보다 위험하다"*, 리스크 매트릭스 🟡 MEDIUM

**두 문서를 갱신하지 않으면 이번 세션에서 고친 문서/코드 드리프트가 그대로 재발한다.**
근거가 된 논리도 함께 재검토할 것 — `LEGAL.md:52` *"초상은 이름과 달리 지시 기능을 대체할 수단이
있다 → 굳이 초상까지 쓴 이유를 설명하기 어려움"*.

참고: 경쟁사 `youtubeplace.co.kr` 은 프로필 사진·조회수·좋아요를 전부 사용한다.
`LEGAL.md:104` 가 이미 반박해 뒀다 — *"분쟁 기록을 찾지 못했다 ≠ 분쟁이 없었다"*.

### 썸네일·제목은 합법 (오히려 요건이 있다)

`LEGAL.md:312` YouTube 정책 원문: *"Video metadata such as thumbnail and title must be
**visible to the viewer and unmodified**"* · 재생 트리거 최소 120×70px.

단 **30일 초과 보관 금지**(`LEGAL.md:283`) — 제목·썸네일 URL 을 무기한 저장하면 정책 위반.
렌더 시점 조회(ISR) 또는 월 1회 갱신 배치가 필요하다. **현재 DB 스키마가 어느 쪽인지 확인 필요.**

썸네일은 **격자로 깔지 말 것** — 유튜브 트레이드드레스다. 장소 카드 안의 "출처 증거"로만 배치한다
(장소가 주어, 영상이 출처).

### 지도

`src/shared/config/map-style.ts` 작성됨 — 노란 지면 + 검정 도로 Google Maps 스타일.

⚠️ **`mapId` 를 쓰면 인라인 `styles` 가 무시되고 Cloud 콘솔 스타일이 이긴다.**
`AdvancedMarker` 가 `mapId` 를 요구하므로, 배포 시 같은 값을 Cloud 맵 스타일로 올려야 한다.
그리고 `NEXT_PUBLIC_GOOGLE_MAPS_ID` 는 **아직 미발급**이라 `env.ts:46` 이 `DEMO_MAP_ID` 로 폴백 중.

### 서체

시안은 **Frutiger Next(유료)**. `Noto Sans` + `Noto Sans KR` 로 대체했다 —
같은 휴머니스트 계열이고 슈퍼패밀리라 한글·라틴이 한 시스템으로 붙는다.
**실측으로 메울 수 없는 격차이므로 미리 인지할 것.** 한글은 네모틀이라 라틴 대비 밀도가 높게 읽힌다.

### DESIGN.md 는 아직 캐논이다 — 의도된 상태

`new-work.md §5`: *"On a new or replacement world, **DESIGN.md is written at finish**, from the
built world, by the shipped documenter"*. 미리 쓴 규칙서는 현실을 기술하는 대신 방어된다.
마감 단계에서 `impeccable-documenter` 가 지어진 월드에서 다시 쓴다.

---

## 7. 마감 절차 (impeccable new-work §7 — 임의로 줄이지 말 것)

1. 스크린샷 라운드 **최대 2회**, 데스크톱·모바일 한 배치. 수정은 배치로 묶는다
2. `node .claude/skills/impeccable/scripts/detect.mjs --json <변경 파일>` **1회** (두 번 돌리지 않는다)
3. **`impeccable-finish-reviewer` 를 새 컨텍스트로 스폰** — 대화 이력을 물려주지 않는다.
   입력 패킷: 원 요청, 아티팩트 경로, 스크린샷 경로, 방향 계약, 훅 findings, QUALITY BAR 카드, 승인 컴프
4. 재빌드 지시가 오면 수정 배치를 건너뛰고 즉시 재빌드
5. **`impeccable-documenter` 스폰 → 여기서 DESIGN.md 와 design.json 이 새로 쓰인다**

---

## 8. 산출물 위치

```
.impeccable/mocks/
  mobile-v4-structure.png      ← 승인 컴프
  _approved.json               ← 승인 기록
  _reference-quality-bar.png   ← 시안 (QUALITY BAR 보드)
  _reference-appscreen-crop.png
  desktop-A-v1…v7*.png         ← 폐기된 데스크톱 시도 (기록용)
.impeccable/refs/
  qb-board.webp / qb-hero.webp ← 시안 원본 (png 변환본은 파생물이라 gitignore)
  measure-reference.py         ← 픽셀 실측 스크립트
src/app/globals.css            ← 토큰 (조정은 여기서만)
src/shared/ui/sign.tsx         ← 프리미티브
src/shared/config/map-style.ts ← Google Maps 스타일
src/app/layout.tsx             ← 방향 계약 (HTML 주석, seed 21af9ba1)
REDESIGN-PLAN.md               ← 전체 계획
```

Figma: <https://www.figma.com/design/cEj6GoBcFrhGQeeEOnphd8> (승인본 node `44:2`)

---

## 9. 다음 사람이 반복하면 안 되는 실수

이번 세션에서 실제로 저지른 것들이다.

1. **시안을 기억으로 만들지 말 것.** v1~v3 는 전부 눈대중이었고 매번 어긋났다.
   `measure-reference.py` 로 재고 시작한다.
2. **노랑을 액센트로 줄이지 말 것.** 시안은 지면 자체가 노랑이다. "너무 노랗다" 싶어 줄였다가
   (v3) 평범한 SaaS 레이아웃이 됐다.
3. **보더를 검정 굵은 선으로 만들지 말 것.** 실측 2px 저대비 앰버다. 검정으로 두르는 순간
   90년대 HTML 테이블로 읽힌다.
4. **데스크톱을 넓은 2컬럼 대시보드로 번역하지 말 것.** 이 월드는 모바일 시스템이다.
   데스크톱은 같은 시스템을 넓은 컨테이너에 담되 **값을 함께 키운다.**
5. **글리프로 박스를 꽉 채우지 말 것.** 박스의 50%다. 그 여백이 사인을 만든다.
6. **1안만 보여주고 확정하지 말 것.** `visualize.md` 가 3안을 요구하는 이유가 있다 —
   1안은 고무도장이 된다.
