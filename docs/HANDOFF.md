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
| `/sitemap.xml` | 자동 생성, `revalidate = 3600`. ko URL + `ko`/`en`/`x-default` hreflang |
| 메타 | `src/shared/seo/page-meta.ts` `publicMeta()` — 공개 페이지 전부 canonical · OG · x-default |
| JSON-LD | `src/shared/seo/json-ld.tsx` — WebSite/Organization(루트) + BreadcrumbList + ItemList(Place). Review/조회수/SearchAction 없음 |
| 문서 title | 인덱스 훅("어디 가세요?")이 아니라 `srHeading` (설명형). 홈에 sr-only H1 |
| GSC verification meta | `src/app/layout.tsx` → `verification.google = lkxLO-HERLGf1WGk8DEGktQW_kCeCwXphuEsfj8NGog` · **prod 배포됨** |
| GSC 사이트맵 제출 · 색인 | **사람이 GSC에서 확인/제출.** 파일 생성은 자동, 색인은 Google 시간 |
| `/takedown` 메일 | `hello@eatripin.com` (`siteUrl` host 기준). **실제 수신함 연결은 미확인/미완 가능** — 창구가 없는 것보다 있는 척이 나쁨 |
| 도메인 정규화 | **apex 하나만 서빙.** `www` · `tripin-peach.vercel.app` → `eatripin.com` **308** (Vercel Domains, 2026-08-13 설정). `vercel.json` 이 아니라 대시보드 설정이라 리포에 안 보인다 |
| Maps 키 HTTP 리퍼러 | 사용자 확인으로 지도 OK → `eatripin.com` 리퍼러 들어간 상태로 추정. 지도 깨지면 콘솔 확인 |
| 폰트 | Paperlogy **5단**(400·500·600·700·900) · `preload: false`. §1-5 참고 |

> ⛔ **위 배관은 로컬에만 있고 prod 에는 안 올라가 있었다** (2026-08-13 감사에서 확인).
> `src/shared/seo/` 는 untracked, JSON-LD 를 붙인 페이지 9개도 uncommitted.
> 프로덕션 HTML 실측: `ld+json` **0건**, `x-default` **0건**, 홈 `<h1>` **없음**.
> **커밋 + 배포하기 전까지 이 표는 "설계"이지 "상태"가 아니다.**

### 1-5. SEO 감사 (2026-08-13)

프로덕션 HTML·헤더 실측으로 확인한 것. 자세한 근거는 커밋 메시지.

**고친 것 (로컬):**

- **폰트 1.4MB → preload 0.** `next/font/local` 은 선언한 src 를 전부 `<link rel=preload>` 로
  내보낸다. 9단을 선언해 뒀는데 Thin·ExtraLight·Light·ExtraBold 는 코드에서 참조가 **0**
  (`font-thin`·`font-light`·`font-extrabold` grep 0건)이었다. 한글 woff2 는 단당 ~160KB —
  안 쓰는 4단이 매 페이지 634KB 를 LCP 앞에 밀어 넣고 있었다. 5단으로 줄이고 `preload: false`.
  `display: "swap"` 이라 폰트 전에도 폴백으로 글자가 보이므로 preload 는 스왑 시점만 당길 뿐인데,
  그 대가가 800KB 였다. **검증:** 빌드 산출물 파일명이 `-s.p.` → `-s.` 로 바뀌면 preload 가 빠진 것.
- **메타 문구.** 조사 폴백 `이(가)` 가 조각·채널·도시 3개 페이지 description 에 있었다 —
  **검색결과 스니펫에 그대로 노출된다.** 받침 유무와 무관한 `의` 구문으로 교체(h1 어법과 동일).
- **스니펫 잘림.** 채널 허브 title 이 도시를 전부 나열해(비밀이야 = 13곳) 브랜드 접미사까지
  밀려났다 → title 3곳·description 6곳 상한. 도시 페이지는 채널명 4개가 앞을 먹어 상호명이
  잘렸다 → 상호명을 앞에 세우고 채널은 2명+`외 N명`.
- **`/channels` description 이 화면용 통계 줄**(`채널 6 · 간 곳 272 · 도시 26`)이었다.
  숫자만 나가면 이 페이지가 뭔지도 왜 누를지도 안 읽힌다. 사람들이 실제로 치는 말은
  채널명이라 이름을 앞에 세운 문장으로 교체. 이걸로 `m.channels.stats` 가 죽어 ko/en/타입에서 제거.
- **목록 4개 화면의 LCP 썸네일이 `lazy` 였다.** `Thumb` 은 `eager` 를 안 주면 기본
  `loading="lazy"`+`fetchPriority="auto"` 인데(`shared/ui/Thumb.tsx:22`), `/city`·`/type`·
  `/type/[type]`·`/channels` 가 **첫 항목에도** 안 넘겨 브라우저가 LCP 이미지를 늦게 발견했다.
  각 목록의 첫 컷만 `eager` 로. 기준은 `VideoSheet.tsx:72` 의 `eager={large}` 와 같다
  (홈·크리에이터 허브·영상 페이지는 원래 맞게 돼 있었다).

**감사에서 나온 오탐 — 다시 제기하지 말 것:**

- ~~`city/[city]` 에 robots noindex 게이트가 없어 사이트맵과 불일치~~ → **아니다.**
  `loadCityDetail` 이 `.eq("map_status","confirmed")` 로 이미 거르고(`shared/api/cities.ts:112`),
  확정 핀 0개면 `byPlace.size === 0` 로 null → `notFound()`(404), 채널 1명이면 308 리다이렉트다
  (`city/[city]/page.tsx:85`). 즉 **렌더되는 도시 페이지 = 확정핀≥1 且 채널≥2** 로
  사이트맵 조건(`sitemap.ts:127-135`)과 이미 정확히 같다. robots 를 더할 이유가 없다.
- ~~`Avatar` 호출부 6곳이 `alt` 를 안 넘겨 접근성 문제~~ → **아니다.** 아바타 옆에 채널명이
  텍스트로 늘 붙어 있고 링크에 `aria-label` 이 걸려 있다. `alt=""` 가 정답이고
  채널명을 넣으면 스크린리더가 같은 이름을 두 번 읽는다.

**확인했고 문제 없던 것:** 본문 SSR(장소명·주소·타임코드 전부 HTML 에 있음) · `notFound()`
전 상세 라우트 · 허브→상세 내부 링크(고아 없음) · `/map` 308 · 영상 페이지 noindex ·
사이트맵과 페이지 noindex 기준 일치 · EN 은 `/en/*` 실 URL · hreflang 상호 참조 ·
공개 페이지 전부 `h1` 정확히 1개.

필터 쿼리(`?type=`·`?channel=`·`?city=`)도 안전하다 — Explorer 들이 `router.replace` 로만
바꾸므로 크롤 가능한 `<a href>` 가 아니고, `publicMeta({ bare })` 덕에 canonical 이
`/city/tokyo?type=cafe` 에서도 `/city/tokyo` 를 가리킨다(실측). 근사 중복으로 크롤 예산이
새지 않는다. **필터를 나중에 링크로 바꾸면 이 보호가 깨진다** — 그때 다시 볼 것.

**배포 후 실측 (2026-08-13):** 커밋 `030fa4d` → prod. `ld+json` 0→4건 · `x-default` 0→정상 ·
폰트 preload **Paperlogy 9종 → 0종**(응답 `link:` 헤더에서 사라짐, Archivo 1개만 남음).
리치 결과 테스트 — 탐색경로 유효, **오류·경고 0건**. GSC 사이트맵 `/sitemap.xml` 제출·성공(63페이지).
색인 리포트는 속성이 새로 인증돼 "데이터 처리 중" — 며칠 뒤 다시 볼 것.

**중복 호스트를 잡았다 (감사 중 발견, Vercel 대시보드에서 수정):**
www · apex · `tripin-peach.vercel.app` **셋 다 200 으로 같은 내용을 서빙**하고 있었다
(리다이렉트 0개, 전부 "Valid Configuration"). canonical 이 apex 를 가리켜 최악은 아니었지만
크롤 예산이 3배로 샜다. www 와 vercel.app 을 **308 → apex** 로 걸었다. 경로 보존 확인함
(`/city/tokyo` → `/city/tokyo`). ⚠️ 이건 `vercel.json` 이 아니라 **대시보드 설정**이라
리포를 아무리 봐도 안 나온다 — 도메인을 새로 붙이면 같은 함정에 다시 빠진다.

**안 고친 것 (구조·의도):**

- 공개 라우트가 전부 동적(`ƒ`) → 응답이 `no-store`, CDN 캐시 0. 루트 레이아웃이
  `getLocale()`→`headers()` 를 읽는 대가다(`shared/api/cache.ts` 주석). 데이터는
  `cachePublic` 이 받고 있어 DB 왕복은 없다. 정적화하려면 로케일을 **URL 세그먼트**로
  올려야 하는데(`/[locale]/...`) i18n 구조 전체를 건드린다 — 트래픽 보고 판단할 것.
- `Thumb` 이 `next/image` 가 아닌 것은 의도(대역폭·i.ytimg.com CDN, `Thumb.tsx` 주석).

### 1-6. 이 세션에서 고친 배포 이슈

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

**요약 실측 (2026-08-13).** 확정 장소 272곳 기준:

| | |
|---|---|
| `summary` | **0%** (전부 null — 불릿만 쓴다) |
| `summary_bullets` | 100%가 값은 있었지만 39%는 **자동 채움뿐**이었다 |
| `price_hint` | 8% |
| `summary_en` | **0%** — EN 표면은 사실상 빈 껍데기 |

자동 채움은 `scripts/strip-filler-bullets.mjs` 로 **전 도시 걷어냈다** (159곳 · 불릿 529개).
유형 라벨("식당.") · "{도시} · {주소}" · "…영상에서/편에서 소개" · "구글 지도에서 위치 확인."
— 전부 화면 다른 곳에 이미 있거나 페이지 전체가 그 얘기라 정보량이 0이었고, 같은 문자열이
수십~백여 회 반복돼 thin·중복 신호였다. 불릿 고유율 **→ 95%**.

남은 일은 **빈 자리를 진짜 요약으로 채우는 것**이다. 지금 **71곳(26%)이 불릿 0개**.
"영상에서만 알 수 있는 것"이 이 사이트가 구글 지도를 이기는 유일한 지점이다 —
상호명·주소만 있으면 구글이 이미 아는 것이라 이길 수 없다. 좋은 예:
"한국어 메뉴판을 갖추고 있다" · "낡은 건물 지하에 있다" · "영상 3:34에 소주 8종 테이스팅".

`LEGAL` 의 "독립적 가치" 요건과 같은 얘기다 — 나중에 제휴·AdSense 할 때 그대로 걸린다.

- **기술 SEO 배관은 2026-08-13 세션에서 넣음** (JSON-LD · `publicMeta` · x-default · 홈 H1 · 인덱스 title). 남은 건 콘텐츠.
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
- **2026-08-13 (이어서):** 기술 SEO — JSON-LD(WebSite/Organization/BreadcrumbList/ItemList), `publicMeta` 로 canonical·OG·x-default 통일, 인덱스 title 을 훅에서 설명형으로, 홈 sr-only H1, 사이트맵 x-default. Review·조회수·SearchAction 스키마는 넣지 않음.
