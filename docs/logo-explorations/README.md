# GREATRIPIN logo explorations

브리프: [`docs/LOGO-BRIEF.md`](../LOGO-BRIEF.md)

## 채택 (2026-08-10)

| 안 | 용도 | 코드 |
|---|---|---|
| **§07 GT monogram** | 파비콘·앱 아이콘·헤더 마크 | `src/shared/ui/Mark.tsx` · `src/app/icon.svg` · `apple-icon.tsx` · `public/mark.svg` |
| **§01 wax wordmark** | 헤더 워드 · GREA**T**RI**P**IN | `src/shared/ui/Wordmark.tsx` · `public/wordmark.svg` |

문장 중 브랜드명: **Greatripin**. 워드마크 철자: **GREATRIPIN** (t·p 각 1).

## 왜 코드인가

AI 이미지 생성기는 `GREATRIPIN` 철자와 t·p 공유 장치를 자주 틀린다.
이 폴더는 **철자가 보장된** 1차 시안이다. 디자이너·에이전시 의뢰 시 참고 시안으로 첨부한다.

## 보기

브라우저에서 `sheet.html` 을 연다 (Archivo 웹폰트 로드).

```bash
open docs/logo-explorations/sheet.html
```

## 파일

| 파일 | 안 |
|---|---|
| `wordmark-wax-dark.svg` | 공유 T·P 만 왁스. **기본 권장** |
| `wordmark-wax-light.svg` | 라이트 지면 버전 |
| `wordmark-boxed-dark.svg` | 공유 글자를 hairline 박스로 |
| `wordmark-mono-dark.svg` | 색 없이 웨이트만 |
| `wordmark-tracking-dark.svg` | 자간 차이만 |
| `monogram-gt-dark.svg` | 정사각 앱 아이콘 (왁스 stem) |
| `monogram-gt-light.svg` | 라이트 |
| `monogram-gt-mono.svg` | 1도 |
| `favicon-16.svg` / `favicon-32.svg` | 픽셀 스냅 파비콘 |

## 한계

- 워드마크 SVG 는 `text` + 시스템/Archivo 의존. **아웃라인 패스 전환은 아직 안 함.**
- 모노그램은 기하 근사 — 최종 서체 맞춤 필요.
- 앱에 붙이기 전 `public/` 배치·`layout.tsx` 파비콘 연결은 별도 작업.
