# Eatripin 로고 브리프

> 📦 **이력 (2026-08-13).** 마크는 **Slash coral**(왁스 면 + 잉크 슬래시)로 **이미 채택됐다**
> — 커밋 `abb4aed`, 산출물은 `public/mark.svg` · `public/wordmark.svg` · `src/shared/ui/Mark.tsx`.
> 이 문서는 그때 돌린 의뢰서다. **현재 마크의 규범이 아니다** — 새로 의뢰할 때만 꺼내 쓴다.
> 워드마크의 글자 겹침 규칙(§ 아래)은 여전히 유효하다.

> 여러 곳(디자이너·에이전시·AI 툴)에 돌리기 위한 의뢰서.
> 상대에 따라 §A(짧은 프롬프트) 또는 §B(전체 브리프)를 복사해 쓴다.
> 근거: `PRODUCT.md`(제품) · `src/app/globals.css`(토큰) · `src/app/layout.tsx`(방향 계약)

---

## ⚠️ 의뢰 전 반드시 전달할 것 — 이름은 오타가 아니다

**`EATRIPIN` 의 글자 겹침은 의도된 장치다.** 이걸 모르면 받는 쪽이 100% "고쳐서" 준다.

```
eat + trip + pin
  └ t 공유 ┘  └ p 공유 ┘
= EATRIPIN
```

`EATTRIPIN`(t 두 개)이나 `EATRIPPIN` 으로 바꾸면 **틀린 것이다.**

---

## §A. AI 이미지 생성기용 (짧은 버전)

> Midjourney·DALL·E·Ideogram 등. 그대로 복사해 쓴다.
> 로고에 글자를 넣는 건 AI 가 자주 틀리므로, **철자를 반드시 검수**할 것.

```
Wordmark logo for "EATRIPIN", a travel directory that maps places
Korean YouTubers actually visited (food, sights, routes).

Style: darkroom contact sheet. Deep charcoal ground (#0b0b0c), warm
off-white type (#f5f3ef). Grotesque sans-serif, heavy weight, wide
letter-spacing. Flat, matte, printed-on-paper feel — like silver halide
photography, not neon.

Key device: the letters T and P are SHARED between words
(eat+trip+pin). Highlight exactly those two letters in a single
vermilion accent (#ff3d14) while all other letters stay off-white.

Must be legible at 16x16px. No gradients, no glow, no drop shadows,
no 3D. No pin/location/map icons. No red as a dominant fill color.
Monochrome-safe.
```

**변형을 받고 싶으면** 마지막에 한 줄씩 바꿔 붙인다:

- `Variation: square app icon, letters cropped to ET monogram.`
- `Variation: the shared letters are boxed with a thin rule instead of colored.`
- `Variation: letterpress / ink-on-paper texture, no color accent.`

---

## §B. 디자이너·에이전시용 (전체 브리프)

### 1. 무엇을 만드는가

**Eatripin** — 여행 유튜버가 실제로 다녀간 장소를 지도로 정리하는 비공식 디렉터리.

채널을 고르면 그 사람이 전 세계에서 간 곳이 지도에 뜨고, 핀을 누르면 그 장면의 영상으로
넘어간다. 신뢰를 자체 큐레이션이 아니라 **이미 구독 중인 크리에이터**에 기댄다.

### 2. 이름 — 이게 로고의 전부다

```
eat + trip + pin  →  EATRIPIN
```

앞 단어의 끝 글자와 뒤 단어의 첫 글자를 **겹쳐 쓴다**(t, p). "먹고 다니는 여행 핀"이라는
뜻이 한 단어 안에 접혀 있다.

**로고의 과제는 이 접힘을 눈에 보이게 만드는 것이다.** 지금은 그냥 대문자 텍스트라
아무도 눈치채지 못한다.

접근 예(제안일 뿐, 더 나은 안 환영):
- 공유 글자 T·P 만 색/웨이트를 달리한다
- 공유 글자를 얇은 괘선으로 감싼다
- 두 단어의 경계를 아주 미세한 자간 차이로만 암시한다

### 3. 시각 세계 — 암실의 콘택트 시트

이 서비스가 가진 유일한 시각 재료는 **영상 썸네일**이다. 그래서 지면을 "썸네일을 늘어놓는
게 본업인 물건" — 암실 작업대 위의 **콘택트 시트** — 로 잡았다.

한 롤에서 뽑은 프레임을 검은 인화지에 늘어놓고, 흰 인덱스로 번호를 매기고, 쓸 만한 컷에
**왁스 연필로 표시**하는 물건이다. → 프레임 = 썸네일, 롤 = 채널, 표시 = 내가 갈 곳.

**이 어둠은 네온이 아니라 은염이다.** 인쇄물의 질감이지 화면의 발광이 아니다.

### 4. 색·서체

| 토큰 | 값 | 용도 |
|---|---|---|
| ground | `#0b0b0c` | 지면. 순검정이 아니다 |
| paper | `#f5f3ef` | 글자. 웜 오프화이트 |
| dim | `#9a9892` | 2차 정보 |
| **wax** | **`#ff3d14`** | **표시 전용** — 아래 경고 참조 |
| hairline | `#2c2c31` | 장식 괘선 |

서체는 **Archivo**(그로테스크, 700 웨이트)를 쓰고 있다. 현재 워드마크는 자간 `0.22em`.
꼭 이 서체일 필요는 없으나 그로테스크 계열의 밋밋함은 유지한다.

> ⚠️ **왁스(#ff3d14)는 "표시"지 "면"이 아니다.**
> 링·밑줄·활성 인덱스처럼 **점 찍는 용도**로만 쓴다. 면적을 먹기 시작하면
> ① "다크 + 네온 액센트"라는 AI 기본값으로 떨어지고
> ② 빨강 주조가 되어 **유튜브 트레이드 드레스와 충돌**한다.
> 로고에서는 **공유 글자 두 개**에만 쓰는 것을 권한다.

### 5. 반드시 만족할 것

- **16×16px 파비콘에서 읽힐 것.** 워드마크가 안 되면 모노그램(ET 등) 대안을 함께
- **어두운 지면이 기본.** 밝은 배경 버전도 필요하지만 주 사용처는 `#0b0b0c`
- **모노크롬으로도 성립할 것.** 색이 빠져도 장치가 죽지 않아야 한다
- 가로형(네비용) + 정사각(앱 아이콘/파비콘용) 두 벌

### 6. 절대 하지 말 것

| 금지 | 이유 |
|---|---|
| **발광** — 글로우·네온·색 번짐·드롭섀도 | 은염이지 네온이 아니다 |
| **핀·위치 마커·지도 아이콘** | 여행 앱 클리셰. 이름에 이미 pin 이 있어 중복이다 |
| **빨강 주조·재생버튼 모티프·썸네일 그리드** | 유튜브 트레이드 드레스 |
| **저채도 파랑 + 소프트 블러** | 회색 정보 대시보드 인상 |
| **그라디언트·3D·베벨** | 인쇄물 질감과 충돌 |
| 지구본·비행기·여권·캐리어 | 여행 브랜드 상투구 |

### 7. 산출물

- 벡터 원본(SVG 또는 AI)
- 가로형 / 정사각형
- 다크 배경용 / 라이트 배경용
- 모노크롬 1도 버전
- 파비콘 16·32·180px

### 8. 참고

- 브랜드명 표기는 **Eatripin**(문장 중), **EATRIPIN**(워드마크)
- 서비스는 각 크리에이터와 **제휴 관계가 없다.** 특정 채널을 연상시키는 요소 금지
- 톤: 정보 나열형. 과장·감탄 없음

---

## 결과물 검수 체크리스트

받은 시안을 이 순서로 본다.

- [ ] **철자가 `EATRIPIN` 인가** (t·p 각 하나씩 — AI 툴은 여기서 자주 틀린다)
- [ ] 글자 겹침 장치가 **설명 없이** 읽히는가
- [ ] 16px 로 줄여도 뭉개지지 않는가
- [ ] 색을 빼도 장치가 살아 있는가
- [ ] 왁스가 면적을 먹고 있지 않은가
- [ ] 유튜브·지도앱 클리셰가 섞이지 않았는가
