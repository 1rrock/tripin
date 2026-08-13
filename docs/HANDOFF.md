# Eatripin 핸드오프 (2026-08-13)

> 브랜치 `redesign-world-v2` 의 **현재 상태**. 새 세션은 이 문서부터 읽으면 된다.
> 선행: `PRODUCT.md` · `LEGAL.md` · `CONCEPT.md` · `docs/I18N.md`
> ⚠️ `DESIGN.md` 는 **폐기** — 삭제된 옛 월드를 기술한다. 믿지 말 것.
> 브랜드 UI 표기는 **Eatripin**. 문서 일부(PRODUCT 등)에 가칭 Tripin 이 남아 있을 수 있다.

---

## 0. 30초 요약

- **프로덕션 배포됨.** https://eatripin.com (Vercel 프로젝트 `tripin`)
- 가비아 도메인 + DNS 연결. **지도 포함 동작 사용자 확인 완료.**
- **1순위는 수익이 아니라 SEO · 사이트 퀄리티 · 데이터(조각) 채우기.**
- 수익 목표는 **용돈 수준 OK.** AdSense 는 지금 신청하지 않는다. 나중에 **숙소 제휴**가 현실적.
- Vercel **Cron 제거됨.** YouTube 메타 30일 갱신은 **수동** (`/api/cron/refresh-youtube-meta`).
- Search Console 소유권용 meta 배포됨. 사이트맵 제출·색인은 GSC에서 진행/대기 중일 수 있음.

---

## 1. 배포 · 인프라 (2026-08-13 세션)

### 1-1. URL · 계정

| 항목 | 값 |
|---|---|
| Production | **https://eatripin.com** |
| www | https://www.eatripin.com (연결됨) |
| Vercel 팀/프로젝트 | `zxcv1685-gmailcoms-projects` / **`tripin`** |
| 로컬 링크 | `.vercel/project.json` 있음 |
| GitHub | `https://github.com/1rrock/tripin.git` (Vercel에 연결됨) |
| 브랜치 | `redesign-world-v2` (원격 대비 **ahead 1** 일 수 있음 — 푸시 상태 확인) |
| 도메인 등록 | 가비아 `eatripin.com` |
| DNS (가비아) | apex `A → 76.76.21.21`, www CNAME/A → Vercel |

### 1-2. 환경변수 (Vercel Production / Preview)

로컬 `.env.local` 기준으로 주입됨. 런타임 필수 쪽:

- `NEXT_PUBLIC_APP_ENV=production`
- `NEXT_PUBLIC_SITE_URL=https://eatripin.com`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_ID`
- `YOUTUBE_API_KEY` / `GOOGLE_PLACES_API_KEY`
- `ADMIN_SECRET` / `CRON_SECRET`
- `OPENAI_*` / `AI_MODEL` (번역 배치용, 선택)

**넣지 않음(의도):** `SUPABASE_DB_URL`(마이그레이션 로컬 전용), `GITHUB_TOKEN`

### 1-3. 크론

- `vercel.json` 은 **스키마만** — `crons` **없음** (사용자 요청으로 제거).
- 라우트 `/api/cron/refresh-youtube-meta` 는 **살아 있음** (수동 호출용).
- 호출: `Authorization: Bearer $CRON_SECRET`
  ```bash
  source .env.local
  curl -s -H "Authorization: Bearer $CRON_SECRET" \
    https://eatripin.com/api/cron/refresh-youtube-meta | python3 -m json.tool
  ```
- YouTube §III.E.4.d 30일 시계는 **배포와 무관하게** DB `api_fetched_at` 기준으로 흐름.
  예전에 08-09 근처 갱신이면 **~09-08 전**에 수동 1회 필수. **스케줄 크론 다시 켜지 마라** (사용자가 뺌). 필요하면 수동/외부 스케줄러만.

### 1-4. SEO · 법 배관

| 항목 | 상태 |
|---|---|
| `/robots.txt` | 자동. Sitemap 은 `SITE_URL` 기준 |
| `/sitemap.xml` | 자동 생성, `revalidate = 3600` |
| GSC verification meta | `src/app/layout.tsx` → `verification.google = lkxLO-HERLGf1WGk8DEGktQW_kCeCwXphuEsfj8NGog` · **prod 배포됨** |
| GSC 사이트맵 제출 · 색인 | **사람이 GSC에서 확인/제출.** 파일 생성은 자동, 색인은 Google 시간 |
| `/takedown` 메일 | `hello@eatripin.com` (`siteUrl` host 기준). **실제 수신함 연결은 미확인/미완 가능** — 창구가 없는 것보다 있는 척이 나쁨 |
| Maps 키 HTTP 리퍼러 | 사용자 확인으로 지도 OK → `eatripin.com` 리퍼러 들어간 상태로 추정. 지도 깨지면 콘솔 확인 |

### 1-5. 이 세션에서 고친 배포 이슈

- `vercel.json` 의 crons 항목 `"//"` 주석 키 → Vercel 스키마 거부 → **제거**. 크론 설명은 라우트 파일 주석에 있음.
- 이후 사용자 요청으로 **크론 스케줄 자체 삭제**.

---

## 2. 제품 · 수익 결정 (2026-08-13)

운영자 합의. 다시 열지 말 것.

| 주제 | 결정 |
|---|---|
| 지금 1순위 | **SEO + 사이트 퀄리티 + 데이터(채널×도시 조각 밀도)** |
| 수익 목표 | **용돈 수준이면 충분** |
| AdSense | **지금 신청하지 않음.** 신규 도메인·모음형·밀도 부족 → 거절 확률 높음. 통과용 가짜 사이트/서브도메인 우회 **비추** |
| 수익화 현실 경로 | 트래픽 생긴 뒤 **숙소 제휴**(Booking/Agoda 등, 쿠팡파트너스형 링크). 여행 직전 의도와 맞음 |
| 쿠팡파트너스 | 이 사이트 결과 안 맞을 가능성 큼 (해외 여행 맵) |
| 글로벌 | 인구(중·인) 물량이 아니라 **EN 표면 + 고단가 지역 + 제휴**. 중국 본토 유튜버 대량·인도 전면전은 **지금 비우선** |
| 글로벌 1차 레버 | 이미 있는 **한국 크리에이터 × 해외 도시** 를 EN·SEO·요약으로 열기 → 이후 영어 채널 소수 깊게 |

성공 지표(PRODUCT): 페이지뷰보다 **영상/지도 아웃링크 클릭**.

---

## 3. 열린 것 — 우선순위 순

### 🔴 1. 콘텐츠 · SEO (메인 작업)

- 검색 의도 큰 **채널×도시** 조각을 깊게 (핀·요약·출처 영상).
- 넓고 얕은 확장 < **보낼 만한 조각**.
- GSC: 소유권 확인 끝났으면 사이트맵 제출, 색인 상태 모니터링.
- 요약은 품질이자 **광고/YouTube 정책상 독립적 가치** 요건 (LEGAL · 나중에 제휴·AdSense 할 때도 동일).

### 🟡 2. 운영 마감 (짧게)

- [ ] `hello@eatripin.com` **실수신** (포워딩 OK). 안 되면 takedown 문구/메일 정직하게 맞출 것.
- [ ] YouTube 메타 **수동 갱신 1회** (크론 없음 — §1-3).
- [ ] Analytics 1종 (Vercel Analytics 또는 GA4) — 아직 안 넣었을 수 있음.
- [ ] 로컬 uncommitted 정리 · `git push` (ahead / `layout.tsx` verification · `vercel.json` 등).

### 🟡 3. EN 번역 검수

- 기계번역(`en_source=machine`) 초벌은 돌린 적 있음. 공개에 "자동 번역" + 원문 보기.
- `/admin/translations` 에서 `human` 승격 = 사람 일.
- 채널명·주소는 **번역하지 않음** (의도, §4 참고 이력).

### 🟢 4. 나중

- 숙소 제휴 링크 (도시 페이지 하단 등, 과다 배치 금지).
- AdSense는 조각 밀도·색인·요약이 쌓인 뒤 재검토 (`PRODUCT` 감각: 조각 ~12 이후).
- 영어 여행 채널 소수 파일럿.
- `cities.ts` `loadGraph` 풀스캔 — places 늘면 PostgREST 1000 상한.
- 문서 브랜드명 Tripin → Eatripin 정리.
- `DESIGN.md` 정식 재작성.

### 예전에 닫힌 것 (재논의 금지에 가깝)

- 채널명·주소 EN 번역 안 함.
- 구글 링크 있으면 주소 모호해도 공개 가능.
- 폐업 확인 후 영구/임시 폐업 비공개 유지(삭제 아님).
- 배포 전 P0 7건 · ISR 데이터 캐시 · i18n `/c/*` 등 — 2026-08-10 세션에서 처리.

---

## 4. 로컬 워킹 트리 주의 (2026-08-13 시점)

배포는 CLI 업로드로 나간 적 있음. **git 워킹 트리는 깨끗하지 않을 수 있음.**

확인된 변경 후보:

- `src/app/layout.tsx` — Google site verification
- `vercel.json` — crons 제거
- 그 외 검색/UI 파일 수정이 섞여 있을 수 있음 (`HomeSheet`, `globals.css` 등) — **배포와 무관한 로컬 작업일 수 있으니 status 보고 판단**

새 세션 시작 시: `git status` · 무엇을 prod에 반영할지 분리.

검증:

```bash
npx tsc --noEmit && npx eslint src --max-warnings=0 && npm run build
```

---

## 5. 되풀이하면 안 되는 실수 (유효)

### 5-1. 렌더 HTML grep = RSC 페이로드에 속음

`curl | grep '도쿄'` 로 EN 누수 오진 가능. `<script>` 제거 후 `<main>` 텍스트만 볼 것.

### 5-2. 클라이언트 props 에 ko/en 둘 다 넘기지 말 것

로더는 캐시 때문에 둘 다 → **서버에서 고른 뒤** 클라이언트는 하나만.

### 5-3. CLI 배치 후 화면 그대로 = 캐시

`translate:en` 등은 `purgePublicData()` 못 부름. TTL 1h 또는 어드민 저장 한 번.

### 5-4. `"use server"` 파일에서 type re-export 금지

`export type { ActionResult }` 가 런타임 액션 전체를 죽임. tsc/eslint/build 통과해도 500.

### 5-5. 화면 설계 전 데이터 행 수

영상 1정거장 비율 높음, 도시 교차 겹침 0에 가까웠음. UI 가정 전에 셀 것.

### 5-6. Tailwind v4

`px-(--gutter)` 만. `px-[--gutter]` 는 조용히 무시.

### 5-7. 지도 자동화 검증 불가

이 환경 WebGL 없음. 지도는 사용자 스크린샷/확인.

### 5-8. AdSense 우회 사이트

통과용 저품질 사이트 → 서브도메인/본진 광고는 계정 정지 리스크. 하지 말 것.

---

## 6. 새 세션 시작 체크리스트

1. 이 문서 §0 · §3 읽기  
2. https://eatripin.com 헬스 (홈·지도·`/takedown`·robots)  
3. `git status` / 브랜치 / Vercel 최근 배포  
4. 작업 고르기: **데이터·SEO·퀄리티** (수익 코드는 요청 있을 때만)  
5. YouTube 메타 나이가 25일+ 이면 수동 갱신 한 번  

---

## 7. 빠른 명령

```bash
# 로컬
npm run dev
npm run typecheck && npx eslint src --max-warnings=0 && npm run build

# 프로덕션 배포 (링크된 상태)
vercel --prod --yes

# YouTube 메타 수동 갱신
set -a && source .env.local && set +a
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  https://eatripin.com/api/cron/refresh-youtube-meta | python3 -m json.tool

# 폐업 확인 (API 비용 — 결과 파일 있으면 재호출 말 것)
npm run check:closed
```

---

## 8. 이전 세션 이력 (요약만)

- **2026-08-10:** 배포 전 P0 7건, 법정 페이지, i18n 완결, ISR→데이터 캐시, EN 초벌 번역, 폐업 4곳 비공개, 브랜드 마크 등. 당시 “미배포·도메인 미정”.
- **2026-08-13:** Vercel 배포, `eatripin.com`, 크론 제거, GSC meta, 수익/우선순위 결정, 본 핸드오프 갱신.
