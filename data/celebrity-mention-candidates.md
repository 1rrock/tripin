# 연예인 언급(b) 후보 — 승인·시드 완료

생성: 2026-08-22 · 원천: 영상 제목 패턴 스캔 + `video_places` 확정 연결
**2026-08-22 유저 승인으로 아래 6곳을 시드했다** (`is_published=true`).
홈 실측: 첫 순환에 6인(성시경·추성훈·강레오·최강록·신동엽·백종원) 전원 노출 확인.
이후 새 후보가 생기면 같은 형식으로 이 문서에 추가하고 승인 후 시드한다.

주의: 한 장소에 인물이 여럿이면(일등집: 신동엽+성시경) 카드에는 한 명만 실린다
(로더가 장소당 1스팟) — 대표 인물 한 명만 시드하는 걸 권한다.

## 승인 추천 (6곳)

| # | 장소 | 도시 | 인물 | 근거 제목 (채널) | 판단 |
|---|---|---|---|---|---|
| 1 | 간소 나가하마야 | 후쿠오카 | 백종원 | "백종원님도 오신 오래된 라멘집" (후쿠오카 아저씨) | 명확한 방문 언급 |
| 2 | 안식 (ANSIC) 소주 바 | 후쿠오카 | 추성훈 | "추성훈님 유튜브에 요즘 나온 핫한 술집" (후쿠오카 아저씨) | 본인 채널 방문 — (a)의 추성훈과 같은 인물로 합류 |
| 3 | 원조수구레 | 서울 | 백종원 | "백종원도 오지게 감탄하고 간 40년 업력" (김사원세끼) | 명확한 방문 언급 |
| 4 | 남한강민물매운탕 | 서울 | 백종원 | "백종원의 16년째 단골" (김사원세끼) | 단골 = 방문 |
| 5 | 일등집 | 서울 | 성시경 | "신동엽, 성시경도 몰래 다녀간 해장국집" (김사원세끼) | 방문 명확. 대표 인물로 성시경 추천(신동엽도 가능) |
| 6 | 나리의 집 | 서울 | 신동엽 | "신동엽, 차승원도 최고로 꼽는 집" (김사원세끼) | ⚠️ 경계 — "꼽는"은 방문 단정 아님. 판단 필요 |

## 제외 추천 (오탐)

| 장소 | 제목 | 사유 |
|---|---|---|
| KALDI COFFEE (후쿠오카) | "백종원 님도 오신 **동네**" | 백종원이 온 건 동네지 이 카페가 아님 |
| 시칠리아 5곳 (Pane Condito 외) | "백종원과 대부가 사랑한 맛피아의 섬" | 섬(시칠리아) 수식이지 개별 가게 방문 아님 |
| 삼전동 야끼니꾸 소통 | "최강록 셰프 단골 맛집으로 **소문난** … 팩트체크" | 소문 검증 영상 — 제목만으론 사실 확정 불가 |

## 승인 시 실행할 INSERT (승인된 행만 남기고 실행)

```sql
insert into place_celebrity_mentions (place_id, person_name, person_name_en, source_video_id, is_published)
values
  ((select id from places where slug = '간소-나가하마야-mbfb'), '백종원', 'Baek Jong-won', 'f6df1407-9c98-4a20-886d-a2701622c237', true),
  ((select id from places where slug = 'ansic-shochu-bar'), '추성훈', 'Choo Sung-hoon', 'fa915bb1-1af9-493a-beb7-5b9288dbf18b', true),
  ((select id from places where slug = '원조수구레-1-yakv'), '백종원', 'Baek Jong-won', '56877f37-f9a1-47ec-9fbb-497e7343bc38', true),
  ((select id from places where slug = '남한강민물매운탕-1-bscr'), '백종원', 'Baek Jong-won', '0f244936-c766-424f-9f40-f64b19e7896c', true),
  ((select id from places where slug = '일등집-ej1r'), '성시경', 'Sung Si-kyung', 'b1b2be5e-32cc-4781-80cf-97cb06165e27', true),
  ((select id from places where slug = '나리의-집-gocl'), '신동엽', 'Shin Dong-yup', '889e7aa8-7e92-48b1-81ba-664a6f2ea2f4', true)
on conflict (place_id, person_name) do nothing;
```

주의: `person_name` 은 `creators.celebrity_name` 과 같은 표기를 써야
라운드로빈이 같은 인물로 묶는다 (추성훈·성시경은 (a)에도 존재).
반영 후 프로덕션이면 `vercel cache invalidate --tag public-data`.
