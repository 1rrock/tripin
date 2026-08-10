# Tripin 핸드오프 (2026-08-10)

> 브랜치 `redesign-world-v2` 의 현재 상태. 새 세션은 이 문서부터 읽으면 된다.
> 선행: `PRODUCT.md`(제품 진실) · `LEGAL.md`(약관·법) · `CONCEPT.md`(화면 기획) · `docs/I18N.md`(ko/en)
> ⚠️ `DESIGN.md` 는 **폐기됐다** — 삭제된 라이트 월드를 기술한다. 파일 상단에 배너를 달아 뒀다.

---

## 0. 30초 요약

- 배포 전 **UI/UX 전면 감사**를 돌렸고, 나온 **P0 7건을 전부 닫았다.** 법정 정적 페이지 4종,
  `<html lang>` 로케일, `/c/*` 트리 i18n, 채널 유튜브 아웃링크, 영상 제목 가시화 등.
- **EN 이 영어가 됐다.** UI 크롬·도시명·장소명·산문(133곳 초벌 완료)까지.
  채널명·주소는 **의도적으로 원문 유지**다(§2-4). 산문(요약)은 번역 컬럼과
  스크립트까지 만들어 뒀고 **API 키만 넣으면 채워진다.**
- **ISR 이 죽어 있었다**(레이아웃이 `headers()` 를 읽어 전 페이지 동적). 데이터 계층 캐싱으로
  바꿔 TTFB 0.19~0.35s → **0.009~0.017s**.
- 아직 **아무 데도 배포 안 됐다.** 도메인 미정이라 크론·OG·삭제요청 창구가 전부 묶여 있다.
- **커밋 완료.** 워킹 트리는 비어 있다. 브랜치 `redesign-world-v2` 에 6개 커밋 (`fa19d25`..`4b79cf1`).
  원격이 없어서 **이 머신에만 있다** — `master` 병합·푸시는 아직.

---

## 1. 이번 세션에 바뀐 것

`4cbff9e` 위에 6개 커밋. 아래 소제목이 대체로 커밋 하나씩에 대응한다.

```
4b79cf1 feat(admin): EN 번역 검수 화면                        → 1-5
8aa4503 feat(legal): 법정 정적 페이지 4종 + takedown 쓰기 구멍 차단  → 1-1(1), 1-2
d591387 feat: 배포 전 감사 대응 — i18n 완결, ISR 복구, SEO 배관, 푸터  → 1-1, 1-2, 1-3, 1-4
31a3623 feat(i18n): EN 산문 컬럼과 초벌 번역 스크립트              → 1-5
8cd2c30 feat(brand): 마크·워드마크와 파비콘 세트                   → 1-4
fa19d25 docs: 핸드오프 갱신
```

`d591387` 이 큰 이유는 캐시 계층과 i18n 이 **같은 로더 파일에 살기 때문**이다.
더 쪼개면 중간 커밋이 빌드되지 않아 이분 탐색 가치가 오히려 사라진다.

### 1-1. P0 — 배포를 막던 7건 (전부 수정·검증 완료)

| # | 무엇이 문제였나 | 무엇을 했나 |
|---|---|---|
| 1 | `/about` `/policy` `/takedown` `/privacy` 가 **전부 404** 인데 푸터는 "삭제 요청 접수"를 약속 | 4종 신설. `/takedown` 은 `mailto:` 실접수 + 정통망법 §44조의2 4단계 명시 |
| 2 | `<html lang="ko">` 하드코딩 → `/en` 전체가 한국어 문서 | 루트 레이아웃을 `async` 로, `lang={locale}` |
| 3 | **`/c/*` 트리 전체가 i18n 미적용** — 문구도 링크도. 공개 라우트 11개는 되는데 이 트리만 낙오 | 메시지 네임스페이스 `hub`/`piece`/`video`/`map` 신설 + 트리 전체 적용 |
| 4 | 홈·지도의 도시명이 EN 에서도 한국어 (`home.ts` 가 `name_en` 을 select 조차 안 함) | select 추가 + `displayCityName` 적용 |
| 5 | **채널 허브에 유튜브 채널 링크가 0개** (LEGAL 이 3곳에서 요구) | `youtube_channel_id`/`handle` select + 아웃링크. **`youtube_handle` 은 DB 에 `@` 포함 저장** — `@` 중복 주의 |
| 6 | 핵심 페이지에서 **영상 제목이 `title=` 툴팁에만** 존재 (터치 기기에서 안 보임 → §III.E.3 위반 소지) | 본문 텍스트로 노출 |
| 7 | `/en` 채널허브·영상 페이지가 헤더/푸터만 영어인 **언어 혼재** | 3번으로 함께 해소 |

### 1-2. P1 — 선택해서 처리한 4건

- **ISR 복구** → `src/shared/api/cache.ts` 신설. 페이지는 동적으로 두고 **로더만 캐싱**
  (`cachePublic`). 로케일 교차 오염 10라운드 테스트 통과.
- **SEO 배관** → 전 공개 페이지 `canonical`(자기 로케일 자기참조 확인), 사이트맵에 ko/en
  `alternates`, 정적 페이지 4종 등재, 308 튕기는 단일채널 도시 6개 제외.
- **`/type/restaurant` 899KB → 393KB (-56%)** — 도시별 상위 12곳만 렌더 + 나머지는 도시 지도로.
- **takedown RLS 구멍** → 마이그레이션 `0006` 적용 완료. 누구나 무제한 INSERT 가능했다.

### 1-3. 적대적 검증에서 나온 **우리가 만든 회귀** 6건 (전부 수정)

병렬 에이전트가 만든 것들이다. 이 목록 자체가 §3-7 의 근거다.

- `PlaceSheet` 가 **리렌더마다 포커스를 뺏음** — `onClose` 인라인 화살표가 이펙트 의존성이라
  "담기" 누를 때마다 발동. 이펙트 분리 + ref 로 해소.
- `aria-modal="true"` 가 데스크톱에선 **거짓말** (시트가 지도 안쪽, 좌측 목록 조작 가능한데
  포커스를 가둠) → `matchMedia` 로 모바일에서만 모달.
- 도시 리다이렉트가 **`?type=` 필터를 버림** → `/type/restaurant` 의 "지도에서 보기"가 필터 소실.
- `/channels` 헤드라인이 **"누구 따라갈까요?" → "채널"** 로 죽음 ("가까운 키 재사용" 지시의 부작용).
- EN 복수형 `"1 types"` → `t()` 에 `{n|clip|clips}` 최소 복수 규칙 추가.
- 사이트맵이 **308 로 튕기는 URL 6개를 광고**.

### 1-4. 푸터 재작업 + 브랜드

- 푸터에 **실제 파손 2건**이 있었다: nav 에 `flex-wrap` 이 없어 EN 라벨 4개가 375px 화면 밖으로
  나갔고, `max-w-[42ch]` 의 `ch` 는 "0" 글리프 폭(≈7px) 기준이라 실제 294px — **전각 한글이
  한 줄 22자에서 끊겨** 국수 가락 컬럼이 됐다. `34rem` 직접 지정으로 교체.
- 문구 전면 재작성(한 문장에 사실 3개 → 한 줄에 한 가지), 정책 링크 행, 브랜드 마감 추가.
- 브랜드 `Tripin → Greatripin` 은 **코드에선 완결**. 문서에는 미반영(§2-6).

### 1-5. EN 산문 번역 (⚠️ 미완 — 키 대기)

- 마이그레이션 **`0007` 적용 완료**: `places` 에 `summary_en`·`summary_bullets_en`·
  `address_en`·`price_hint_en`·**`en_source`**(`null`/`machine`/`human`)·`en_translated_at`,
  `creator_cities` 에 `intro_text_en`.
- **`scripts/translate-en.mjs`** (`npm run translate:en`) — OpenAI 호환 API 초벌 번역.
  `--dry-run`(키 없이 분량만) / `--limit N` / `--redo`.
- **공개 화면 표시 규칙 구현·검증됨** (`src/shared/ui/SummaryBlock.tsx`):

  | `en_source` | EN 화면 |
  |---|---|
  | `null` | 요약 **숨김** (`/type` 의 기존 정책과 통일) |
  | `machine` | 노출 + "자동 번역" 표시 + `<details>` **원문 보기** |
  | `human` | 그냥 노출 |

  KO 는 전혀 안 바뀐다. 현재 `en_source` 가 전부 `null` 이라 **EN 요약은 숨겨진 상태이고,
  이게 정상 동작이다.**
- **`/admin/translations`** 검수 화면 신설 — 원문/번역 나란히, 인라인 수정, `human` 승격.

---

## 2. 열린 것 — 우선순위 순

### 🔴 1. 배포처가 없다 — 도메인 미정. **셋이 한 덩어리다**

**상태**: `git remote` 없음 · `.vercel` 없음 · `.github/workflows` 없음. `vercel.json` 의 크론은
**Vercel 에 올라가야만 존재한다.**

세 가지가 전부 도메인에 묶여 있다:

1. **크론 0개 → YouTube 30일 시계.** DB 실측으로 `videos` 116행이 전부
   `api_fetched_at = 2026-08-09`. §III.E.4.d 30일 한도는 **2026-09-08** 에 걸린다.
   ⚠️ **배포와 무관하게 흐른다** — Supabase 에 이미 저장된 데이터 기준이다.
   그 전에 손으로 한 번 돌려야 한다(§4).
2. **`NEXT_PUBLIC_SITE_URL` 이 `localhost`** → 프로덕션 빌드 HTML 에 그대로 샌다.
   `og:image`, `robots.txt` 의 사이트맵 URL 전부 localhost.
3. **`/takedown` 접수처가 `hello@<배포도메인>`** → 그 메일함이 실제로 있고 사람이 봐야
   정통망법 §44조의2 "지체 없이 조치"가 성립한다. **창구가 없는 것보다 있는 척하는 게 나쁘다.**

**막고 있는 것**: 도메인 결정 — **사용자만 할 수 있다.** `PRODUCT.md:69` 가 "Tripin 은 가칭,
도메인 확보 확인 전까지 유지"로 남겨 둔 미해결 항목이다. 추가로 Maps 키에 **배포 도메인
HTTP 리퍼러**를 넣어야 프로덕션에서 지도가 뜬다(콘솔 작업 — 사용자만 가능).

⚠️ **미확인**: Vercel Cron 이 `Authorization: Bearer $CRON_SECRET` 을 자동으로 붙이는지
확인 못 했다. 라우트는 이 헤더를 엄격히 대조한다. **배포 후 첫 크론 실행 로그를 눈으로
확인해야 한다** — 401 이면 매일 조용히 실패하면서 시계는 계속 간다.

### 🟡 2. EN 번역 — 초벌은 돌았다. **남은 건 사람 검수다**

**상태**: 배치 실행 완료. 전부 `en_source='machine'` 이라 공개 화면에 "자동 번역" 표시와
원문 보기가 붙어 나간다. `/admin/translations` 에서 확인하면 `human` 으로 올라가고 표시가
사라진다. → **판단이 필요한 일이라 사용자 몫이다.**

**모델**: Anthropic 이 아니라 **OpenAI 호환 엔드포인트**를 쓴다. `.env.local` 의
`OPENAI_API_KEY` / `OPENAI_BASE_URL` / `AI_MODEL` 세 개로 제공자를 갈아끼운다
(현재 Gemini 무료 티어 `gemini-3.1-flash-lite`). `OPENAI_BASE_URL` 을 비우면 진짜 OpenAI 다.
규약은 `optisearch` 의 `src/shared/lib/openai.ts` 와 같다.

```bash
npm run translate:en -- --dry-run    # 키 없이 분량만
npm run translate:en -- --limit 3    # 품질 먼저 확인
npm run translate:en                 # 미번역분만 (en_source is null)
npm run translate:en -- --redo       # machine 을 다시 번역
```
재실행이 안전하다 — 성공한 건만 `machine` 이 되므로 실패분만 다시 잡는다.

⚠️ **배치 직후 공개 화면은 최대 1시간 안 바뀐다.** CLI 는 Next 런타임 밖이라
`purgePublicData()` 를 못 부른다(§3-3). 급하면 어드민에서 아무 저장 액션이나 한 번
돌려 태그를 무르면 된다. 전부 `en_source='machine'` 으로 들어가고,
`/admin/translations` 에서 검수하면 `human` 이 된다.

### 🟡 3. 이 작업이 **이 머신에만 있다**

커밋은 됐다(§1). 하지만 브랜치는 `redesign-world-v2` 이고 **원격이 없다** —
`git remote -v` 가 비어 있다. 기본 브랜치는 `main` 이 아니라 **`master`** 다.

즉 지금 이 디스크가 유일한 사본이다. §2-1 의 도메인 결정이 나면 GitHub 원격 → Vercel
연결이 어차피 필요하니, 그때 `master` 병합까지 같이 처리하는 게 순서다.

### ✅ 4. 채널명·주소는 **번역하지 않는다** (2026-08-10 결정)

한때 "EN 페이지 채널명이 한국어로 남았다"를 결함으로 올렸는데, **결함이 아니라고 정리됐다.**

**채널명** — `추성훈 ChooSungHoon` · `성시경 SUNG SI KYUNG` · `비밀이야 bimirya` 처럼
대부분이 **이미 라틴 표기를 포함한 채널 실명**이고, 그게 YouTube 에 실제로 걸린 이름이다.
임의 로마자로 바꾸면 출처 표기가 오히려 어긋난다. `creators.display_name_en` 컬럼은
남아 있지만 **공개 화면에서 쓰지 않는다** — 지우지 말고 그냥 두면 된다.

**주소** — 길찾기·현지 검색에 쓰이므로 원문 표기가 맞다. 공개 화면은 EN 에서도 원문
주소를 그대로 보여준다. `places.address_en` 컬럼은 남아 있지만 **아무도 읽지 않고,
번역 스크립트도 더 이상 채우지 않는다.** 초벌 배치가 한 번 채웠던 64행은 비워 뒀다 —
읽는 곳이 없는 미검수 기계번역을 남겨 두면, 나중에 이 컬럼을 배선할 때 검수를 거친
것처럼 보인다.

⚠️ 다시 열지 마라. `displayCreatorName` 이 없는 것은 누락이 아니라 결정이다.

### 🟡 5. 남은 P1 — 감사에서 나왔지만 안 고친 것

- **월드의 서명이 핵심 화면에 없다.** `Explorer`·`CityExplorer`·`/type/[type]` 에
  `Frame`/`Thumb`/`VideoSheet` import 가 **0건**. 방향 계약은 "썸네일을 늘어놓는 물건"인데
  정작 자원 80%가 갈 화면이 텍스트 리스트다. **코드 수정이 아니라 방향 결정** — 리드 판단 필요.
- **도시 교차 페이지의 존재 이유가 성립 안 함.** "여러 채널이 겹친 곳"이 UI 에도 데이터에도
  없다(실측: 도쿄 8+8+2+2=20 = 총 20 → 겹침 0). 데이터가 쌓여야 풀리지만, **출처 2개 이상 행에
  표식을 다는 최소 장치는 지금 넣어야** 쌓였을 때 자동으로 드러난다.
- **영상 16편 중 13편(81%)이 정거장 1개**라 `Timeline` 의 주인공인 스크러버 없이 렌더된다.
  `CLAUDE.md` 의 "화면 설계 전 데이터 행 수를 세라"가 겨냥한 실패. 제품 판단 필요.
- 채널 허브 통계 한 줄에서 "검수한 영상"은 `map_status` 무필터, "간 곳"은 confirmed 만 —
  **한 줄에서 두 숫자의 기준이 다르다.** 지금은 candidate 가 0이라 안 드러난다.

### 🟢 6. 나중

- `cities.ts` 의 `loadGraph` 가 필터 없이 풀테이블 스캔. PostgREST 1000행 상한에 걸리면
  **조용히 잘린다.** 현재 places 133 / videos 116 이라 여유. 채널 20~30개에서 터진다.
- 문서의 옛 브랜드명 `Tripin` — `CLAUDE.md`·`README.md`·`PRODUCT.md`·`CONCEPT.md`·
  `docs/I18N.md` 등 12개 파일. 배포 무해, 다음 세션 혼란 요인.
- `DESIGN.md` 정식 재작성 (지금은 폐기 배너만 달아 둠).

---

## 3. 되풀이하면 안 되는 실수 — **이번 세션에 실제로 한 것만**

### 3-1. ⚠️ 렌더된 HTML 을 grep 하면 RSC 페이로드가 걸린다 — **세 번 속았다**

`curl | grep '도쿄'` 로 "EN 에 한국어가 남았다"고 **세 번 오진했다.** 실제로는:
- **RSC flight 페이로드**(`<script>` 안)에 `"name":"도쿄","nameEn":"Tokyo"` 로 **둘 다** 실려 있다.
  로더가 양쪽을 보내고 표시 시점에 고르는 정상 구조다.
- **YouTube 영상 제목**과 **상호명**("매드해피 도쿄")에 도시명이 들어 있다. 이건 원문이라 정상.

**올바른 방법** — `<script>` 를 지우고 `<main>` 안 텍스트만 본다:
```bash
python3 -c '
import urllib.request,re,html
d=urllib.request.urlopen("http://localhost:3000/en/c/chuseonghoon/tokyo",timeout=25).read().decode()
d=re.sub(r"<script.*?</script>","",d,flags=re.S)
m=re.search(r"<main.*?</main>",d,re.S)
print(re.sub(r"\s+"," ",html.unescape(re.sub(r"<[^>]+>"," ",m.group(0))))[:400])'
```

### 3-2. ⚠️ 클라이언트 컴포넌트에 ko/en 을 **둘 다 넘기면 HTML 에 원문이 샌다**

캐시 안전을 위해 "로더는 로케일을 모르고 ko/en 을 둘 다 실어 보낸다"가 원칙인데
(`src/shared/api/cache.ts` 주석), 그 값을 **클라이언트 컴포넌트 props 로 그대로 넘기면**
RSC 직렬화로 **EN 페이지 HTML 안에 한국어 원문이 통째로 들어간다.** 화면에는 안 보이지만
바이트로는 나가고, 크롤러도 본다. 검증 중 실제로 걸렸다.

**해결 = 층을 나눈다.** 로더는 둘 다(캐시 안전) → **서버 컴포넌트가 고른다** → 클라이언트
컴포넌트는 **고른 것 하나만** 받는다. `src/app/(public)/city/[city]/page.tsx` 의
`displaySummary(p, locale)` 매핑이 그 지점이다.

**확인법**: 화면 텍스트가 아니라 **응답 전체**를 grep 한다.

⚠️ **다만 "0 이어야 한다"는 이제 틀렸다.** 번역 배치가 돌아 `en_source='machine'` 이 되면
"원문 보기"(`<details>`) 가 **한국어 원문을 의도적으로** 싣는다. 즉 EN HTML 에 한국어가
있는 것 자체는 정상이다. 이걸 모르고 "샌다"고 판단해 고치면 원문 보기가 부서진다.

지금 판정 기준은 이렇다:

| 장소의 `en_source` | EN 응답에 한국어 원문 | 판정 |
|---|---|---|
| `null` (미번역) | **있으면 안 된다** — 요약 자체가 숨겨지므로 | 있으면 누수 |
| `machine` | **있는 게 정상** — 원문 보기 토글 안에 들어 있다 | 없으면 토글 고장 |
| `human` | 있으면 안 된다 — 토글이 사라지므로 | 있으면 누수 |

따라서 grep 숫자만 보지 말고 **어느 en_source 의 장소인지 먼저 확인**하라.
가시 텍스트(`<main>` 안, `<script>` 제거)로 보는 §3-1 방법이 여전히 1차 도구다.

### 3-3. ⚠️ CLI 배치로 DB 를 바꾼 뒤 화면이 그대로면 **캐시다. 코드를 뜯지 마라**

번역 배치(133건)를 다 돌렸는데 `/en/city/tokyo` 만 영문 요약이 안 나왔다. 조각 페이지
(`/en/c/*/tokyo`)는 나왔다. "도시 페이지 코드 경로 버그"로 한참 팠는데 **아니었다.**

`loadGraphRows` 가 `cachePublic`(TTL 3600) 으로 감싸여 있고, 그 캐시 엔트리가 번역 **전**
스냅샷을 들고 있었다. 무서운 건 이거다:

- `rm -rf .next/cache` **로 안 죽었다**
- dev 서버 완전 재시작(`kill -9` 후 새 프로세스)**으로도 안 죽었다**
- 죽은 건 **캐시된 함수의 코드를 바꿨을 때**였다 (계측용 `console.log` 한 줄)

**왜 이런 일이 생기나**: `scripts/translate-en.mjs` 는 Next 런타임 **밖**이라
`purgePublicData()` 를 부를 수 없다. 어드민 액션은 부르지만 CLI 배치는 못 부른다.
즉 배치 후에는 TTL 1시간이 지나거나 어드민에서 뭔가를 저장해야 화면이 따라온다.

**진단 순서** — 캐시부터 배제하고 코드로 간다:
1. 같은 쿼리를 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 로 직접 날려 DB 값을 확인한다
2. 값이 맞으면 **캐시된 함수 안쪽**에 `console.log` 를 넣는다.
   찍히지 않거나 옛 값이면 캐시 히트다 — 이 로그 추가 자체가 캐시를 무르므로
   다음 요청에서 화면이 고쳐진다. 그러면 코드는 처음부터 멀쩡했던 것이다
3. 캐시 바깥(예: `loadGraph`)에 넣은 로그는 **캐시 히트에서도 찍힌다** — 둘을 구분 못 한다

### 3-4. ⚠️ `"use server"` 파일에서 **타입을 re-export 하지 마라** — 그 파일의 액션이 전부 죽는다

    // ✗ 절대 하지 마라 ("use server" 파일 안에서)
    import type { ActionResult } from "./_lib/action-result";
    export type { ActionResult };

Turbopack 이 이걸 **값 export 로 보고** `registerServerReference(ActionResult, …)` 를
내보낸다. 타입은 런타임에 없으니 **모듈 평가에서** `ReferenceError: ActionResult is not
defined` 로 터지고, **그 파일의 모든 액션이 같이 죽는다.**

무서운 지점은 여기다 — **`tsc` · `eslint --max-warnings=0` · `npm run build` 가 전부
통과한다.** 타입 수준에서는 합법이기 때문이다. 배포 검증을 다 통과한 상태로 어드민
전체가 500 이었고, 우리는 그걸 모른 채 "배포 준비됐다"고 판단했다.

실제로 4개 파일이 이 상태였다(`admin`·`confirm`·`queue`·`translations`의 `actions.ts`).
증상은 제각각으로 보였다 — "공개 전환이 안 된다", "주소를 고칠 방법이 없다"(수정 폼이
`confirm/actions.ts` 를 쓴다). 원인은 하나였다.

`"use client"` 파일의 같은 구문은 무해하다(`_ui/form.tsx`). 서버 액션 변환을 안 거친다.

**확인법** — 빌드 산출물에서 직접 본다. 타입이 값으로 등록되면 여기 잡힌다:
```bash
npm run build && grep -rl "registerServerReference(ActionResult" .next/server || echo "깨끗함"
```

**교훈**: 어드민은 **타입 검사로 검증되지 않는다.** 화면이 200 이어도 액션은 죽어 있을
수 있다. 액션 하나를 실제로 호출해 봐야 안다(§4 에 서버 액션 직접 호출법을 적어 뒀다).

### 3-5. ⚠️ 낡은 서버가 포트를 잡고 있으면 **옛 빌드를 측정하게 된다**

`pkill -f "next start"` 가 실제 프로세스를 못 죽여서, 새 서버가 `EADDRINUSE` 로 조용히 죽고
**옛 서버가 계속 응답했다.** "수정이 반영 안 됐다"고 한참 헤맸다.

```bash
kill -9 $(lsof -nP -iTCP:3000 -sTCP:LISTEN -t) 2>/dev/null   # 이렇게 죽여라
tail -5 /tmp/*.log                                            # EADDRINUSE 없는지 확인
```

### 3-6. ⚠️ `.env.local` 은 **키 이름이 아니라 값**을 확인하라

`grep -oE '^[A-Z_]+' .env.local` 로 `ANTHROPIC_API_KEY` 를 보고 "키가 있다"고 사용자에게
보고했는데, 실제로는 `ANTHROPIC_API_KEY=` — **값이 빈 줄**이었다. 번역 스크립트를 다 만들고
나서야 드러났다.

더 나쁜 건, **쓸 수 있는 키가 옆줄에 이미 있었다는 것이다.** `OPENAI_API_KEY`(Gemini 무료
티어)가 같은 파일 27번째 줄에 값까지 채워져 있었는데, 나는 "ANTHROPIC 키가 없다"고
블로커로 올려놓고 세션을 넘길 뻔했다. **막혔다고 선언하기 전에 파일 전체를 읽어라.**

```bash
node -e 'const l=require("fs").readFileSync(".env.local","utf8").split("\n").find(x=>x.includes("ANTHROPIC"));console.log("값 길이:",(l.split("=")[1]||"").length)'
```

### 3-7. ⚠️ 병렬 에이전트는 **같은 파일을 덮어쓰고, 서로의 의도를 오해한다**

11개를 동시에 돌렸더니:
- `type/[type]/page.tsx` 에서 SEO 작업과 무게 경감 작업이 **충돌**해 `revalidate` 줄이 유실됐다.
- 그걸 복구하려던 에이전트가 **의도를 거꾸로 읽었다** — ISR 담당이 죽은 `revalidate` 를
  9개 파일에서 *의도적으로* 걷어낸 것인데, 충돌로 오해하고 한 곳에만 되살려 놨다.
- 편집 중에는 `tsc` 가 계속 깨져서 **중간 측정이 전부 무의미**했다.

**교훈**: 파일 단위로 스코프를 나누고, 겹치면 순차로. 그리고 **작업 중에는 측정하지 마라** —
에이전트가 전부 idle 이 된 뒤에 한 번에 검증한다.

### 3-8. ⚠️ "가장 가까운 기존 키를 재사용하라"는 지시가 **카피를 죽인다**

i18n 위임에서 이렇게 지시했더니 `/channels` 의 헤드라인이 `m.channels.title`("채널")로
바뀌었다. 형제 화면은 "어디 가세요?" / "뭐 볼래요?" 인데 여기만 한 단어가 `--t-display`
900 웨이트로 박혔다. **메타 title 용 키와 화면 헤드라인 키는 별개로 둬라.**

### 3-9. 이전 세션에서 이어지는 것 (여전히 유효)

1. **DOM 이 정상인데 화면이 검다** → 페인트/합성 버그. `mix-blend-mode` + `filter: blur()`.
2. **라이브러리가 이미 폴백하는데 앞에서 막지 마라** (revert `8f65f44`).
3. **`.index` 에 `text-transform: uppercase` 금지** — `ChooSungHoon` → `CHOOSUNGHOON`.
4. **한국어 조사를 이름 뒤에 붙이지 마라** — `{name}가`. `의` 는 안전.
5. **헤드리스 캡처를 믿지 마라** — 우측 ~8% 가 잘린다. 레이아웃은 **DOM 실측**으로.
6. **Tailwind v4 는 `px-(--gutter)`** — v3 의 `px-[--gutter]` 는 조용히 무시된다.
7. **지도는 이 환경에서 검증 불가** — 자동화·기본 브라우저 둘 다 WebGL 이 없다.
   구글 기본 POI 로 보여도 **버그가 아니다.** `NEXT_PUBLIC_GOOGLE_MAPS_ID` 는 설정돼 있다.

---

## 4. 검증

```bash
npx tsc --noEmit && npx eslint src --max-warnings=0 && npm run build
```
현재 **셋 다 통과** (2026-08-10 확인).

```bash
# 프로덕션으로 띄워 스모크 (dev 아님 — 캐싱 동작이 다르다)
kill -9 $(lsof -nP -iTCP:3000 -sTCP:LISTEN -t) 2>/dev/null
npm run build && (nohup npm run start > /tmp/s.log 2>&1 &) && sleep 8

for p in / /en /about /policy /privacy /takedown /city/tokyo /en/city/tokyo \
         /c/chuseonghoon/tokyo /en/c/chuseonghoon/tokyo /admin/translations; do
  printf "%-34s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' localhost:3000$p --max-time 20)"
done
# 전부 200, /admin/* 만 307(로그인) 이면 정상
```

```bash
# 로케일 오염 — 캐시가 언어를 섞지 않는지 (교대로 때린다)
for i in $(seq 1 8); do
  curl -s localhost:3000/en/city | grep -c "어디 가세요"   # 0 이어야 정상
  curl -s localhost:3000/city    | grep -c "Where to?"     # 0 이어야 정상
done | sort -u    # "0" 한 줄만 나와야 한다
```

```bash
# 30일 갱신 배치를 손으로 (배포 전이라 스케줄러가 없다 — §2-1)
source .env.local
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/refresh-youtube-meta | python3 -m json.tool

# 지금 데이터가 얼마나 오래됐는지
psql "$SUPABASE_DB_URL" -c \
  "select max(now()::date - api_fetched_at::date) as oldest_days from videos;"
```

### 어드민 서버 액션을 **실제로 호출해서** 검증하기

화면이 200 이어도 액션은 죽어 있을 수 있다(§3-4). 타입 검사로는 절대 안 잡힌다.

```bash
# 1) 로그인 — base64 시크릿에 '+' 가 있어 --data-urlencode 가 필수다(-d 면 공백이 된다)
PW=$(grep '^ADMIN_SECRET=' .env.local | cut -d= -f2-)
curl -s -c /tmp/adm.jar -o /dev/null \
  -X POST --data-urlencode "password=$PW" --data-urlencode "next=/admin" \
  http://localhost:3000/api/admin/login
curl -s -b /tmp/adm.jar -o /dev/null -w "admin %{http_code}\n" http://localhost:3000/admin

# 2) 액션 ID 찾기 — 페이지가 로드하는 청크에 {"name":"<액션명>"} 으로 박혀 있다
curl -s -b /tmp/adm.jar http://localhost:3000/admin/places -o /tmp/p.html
for c in $(grep -oE '/_next/static/chunks/[^"]+\.js' /tmp/p.html | sort -u); do
  curl -s -b /tmp/adm.jar "http://localhost:3000$c" \
    | grep -oE '"[0-9a-f]{40,64}":\{"name":"togglePlacePublished' | head -1
done

# 3) 호출 — 인자가 단순 값이면 JSON 배열로 보낸다
curl -s -b /tmp/adm.jar -X POST http://localhost:3000/admin/places \
  -H 'Next-Action: <위에서 찾은 ID>' \
  -H 'Content-Type: text/plain;charset=UTF-8' \
  --data-raw '["<place-id>",true]' | grep -oE '\{"ok":"[^"]*"\}|"name":"ReferenceError"'
```

⚠️ 인자가 `FormData` 인 액션(`useActionState` 를 쓰는 폼)은 이 방법으로 호출하기
어렵다 — React 가 이전 상태까지 함께 인코딩한다. **같은 파일의 단순 인자 액션을 하나
호출해 모듈이 평가되는지만 보면 충분하다.** §3-4 버그는 파일 단위로 터진다.

```bash
npm run translate:en -- --dry-run    # 번역 대상·분량 (키 없이 동작)
```

---

## 5. 다음 사람이 먼저 할 일

1. **도메인을 정한다** (§2-1). 크론·OG·삭제요청 창구 셋이 여기 묶여 있고, YouTube 30일
   한도가 **2026-09-08** 이다. 배포가 늦어지면 최소한 갱신 배치라도 손으로 돌려라(§4).
2. **번역을 검수한다** (§2-2). `/admin/translations`. 초벌은 이미 들어가 있다.
3. **원격을 붙인다** (§2-3). 지금 이 디스크가 유일한 사본이다.

> 이전 핸드오프의 "지도 스타일" 항목은 **해결됐다** — 원인은 WebGL 없는 브라우저의 래스터
> 폴백이었고 코드 문제가 아니었다. 다시 파지 마라.
