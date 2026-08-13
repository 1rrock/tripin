# Eatripin

여행 유튜버가 다녀간 장소를 **채널 단위로 모아 지도에 보여주는** 비공식 디렉터리.

**https://eatripin.com** · 운영 중

> 이름은 `eat + trip + pin`. **글자 겹침은 의도된 장치다** — 고쳐서 쓰지 마라.
> (초기 가칭이던 `Tripin` 이 옛 문서에 남아 있을 수 있다.)

핀을 누르면 **타임스탬프가 붙은 원본 영상**과 지도 앱으로 나간다. 이 서비스는 유튜브의
경쟁자가 아니라 유튜브로 나가는 **출구**이고, 그 포지션이 법적 방어선이기도 하다.

---

## 문서 지도 — 무엇을 먼저 읽나

**작업을 시작한다면 `docs/HANDOFF.md` 부터.** 현재 상태·열린 블로커·되풀이하면 안 되는
실수가 거기 있다.

| 문서 | 무엇 | 상태 |
|---|---|---|
| `docs/HANDOFF.md` | **현재 상태. 여기부터.** | 산 문서 |
| `PRODUCT.md` | 제품 진실·원칙·브랜드 계약 | 산 문서 |
| `LEGAL.md` | 약관·법. **설계를 실제로 제약한다** | 산 문서 |
| `CONCEPT.md` | 화면 기획 (코드가 §4.3·§7.3 참조) | 산 문서 |
| `INGEST.md` | 수집 파이프라인·쿼터 | 산 문서 |
| `docs/I18N.md` | ko/en 공개 화면 규칙 | 산 문서 |
| `docs/ADMIN.md` | 어드민 화면기획 (코드가 1·5·6장 참조) | 산 문서 |
| `docs/DATABASE.md` | 스키마·마이그레이션·RLS 운영 | 산 문서 |
| `docs/channels.md` | 등록 채널 목록 — Orca 신작 동기화 대상 | 산 문서 |
| `DESIGN.md` | 디자인 시스템 — **`.impeccable/design.json` 과 짝인 도구 관리 파일.** 손으로 고치지 마라 | ⚠️ 낡음 |
| `REDESIGN-PLAN.md` | 2026-08-06 '공항 사인' 개편안 | 📦 이력 |
| `docs/CHANNEL-CANDIDATES.md` | 2026-08-09 채널 조사 스냅샷 | 📦 이력 |
| `docs/LOGO-BRIEF.md` | 로고 의뢰서 (마크는 이미 채택됨) | 📦 이력 |

## 기술

Next.js 16 (App Router) · React 19 · Tailwind **v4** · Supabase(Postgres, 전 테이블 RLS)
· Google Maps JS API · Vercel 배포.

**공개 라우트는 전부 동적(`ƒ`)이다.** 루트 레이아웃이 `getLocale()`→`headers()` 를 읽기
때문이고, 그래서 페이지의 `export const revalidate` 는 아무 일도 하지 않는다. 캐시는
데이터 층(`shared/api/cache.ts` 의 `cachePublic`, TTL 1h)이 맡는다. 배경은 `HANDOFF` §1-5.

## 시작하기

```bash
npm install
npm run dev
```

`.env.local` 이 필요하다. **예제 파일은 두지 않는다**(키 이름만으로도 인프라 구조가 새고,
예제가 실제 키 목록과 어긋나면 더 나쁘다). 필요한 키 목록은 `docs/HANDOFF.md` §1-2 에 있다.

### 검증 — 커밋 전 반드시

```bash
npx tsc --noEmit && npx eslint src --max-warnings=0 && npm run build
```

`--max-warnings=0` 이다. **경고도 실패다.**

### 자주 쓰는 것

```bash
npm run db:migrate                      # psql 직결 (supabase CLI 안 씀 — docs/DATABASE.md 1장)
npm run translate:en                    # EN 초벌 번역 배치
npm run check:closed                    # 폐업 확인 (API 비용 — 결과 파일 있으면 재호출 말 것)
node scripts/strip-filler-bullets.mjs --dry-run   # 자동 채움 요약 정리
```

DB 를 건드리는 스크립트는 **`--dry-run` 을 먼저** 돌리고 삭제 대상을 확인한 뒤 `--apply` 하라.

## 법·약관 — 설계를 바꾸는 제약

전체는 `LEGAL.md`. 코드를 만지기 전에 알아야 하는 것만:

- 영상 **제목·썸네일을 변형하지 마라** (YouTube API §III.E.3). 요약·의역·크롭 금지.
  프레임 비율 16:9 를 바꾸는 것도 '변형'이다.
- 영상 썸네일은 **저장하지 않는다** — `youtube_video_id` 에서 URL 을 유도한다
  (`shared/lib/youtube.ts`).
- **조회수·구독자수는 저장도 표시도 하지 않는다** (§III.E.2).
- 영상 메타 **30일 초과 보관 금지** → 월 1회 갱신 (`/api/cron/refresh-youtube-meta`, 수동).
- 자막 원문 저장·게시 금지 — DB 에 필드 자체가 없다.
- 유튜브로 돌아가는 링크를 **가리거나 없애지 마라.**
- 장소 평가·부정 서술 금지. 가격 등 변동 정보는 "영상 촬영 시점 기준" 표기.

## 자주 틀리는 것

- **Tailwind v4 다.** CSS 변수는 `px-(--gutter)`. v3 의 `px-[--gutter]` 는 **조용히 무시된다.**
- **디자인 토큰은 `src/app/globals.css` 에만.** 컴포넌트에서 px·hex 를 직접 쓰지 않는다.
- **DB 를 CLI 로 고쳐도 공개 화면은 안 바뀐다** — 데이터 캐시 TTL 1h. `/admin` 에서 저장
  한 번 하거나 기다려라.
- **`"use server"` 파일에서 type re-export 금지** — tsc·eslint·build 를 다 통과하고 런타임 500 이 난다.
- **지도는 자동화로 검증할 수 없다** (이 환경에 WebGL 없음). 사용자 스크린샷으로 확인하라.
- **화면 설계 전에 데이터 행 수를 세라.** 이걸 안 해서 시각 월드를 두 번 갈아엎었다.
- 공개 UI 는 **ko/en**. 한글 하드코딩·`href="/city"` 고정 금지 (`docs/I18N.md`).
