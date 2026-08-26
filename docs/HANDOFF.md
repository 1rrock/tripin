# HANDOFF

이 파일은 코드 주석과 전역 설정이 가리키는 자리다. 2026-08-24 이전까지 **없었다** —
`docs/` 디렉터리 자체가 없었다. 주석 14곳이 참조하는 `docs/ADMIN.md` 도 같은 날
**만들었다**(어드민 설계 근거 — 인증·확정 잠금·요약 규칙·삭제요청 큐).

읽는 순서: `PRODUCT.md`(제품 원칙·브랜드 규칙) → `ROADMAP.md` → 이 파일 → `docs/ADMIN.md`.

---

## 0. 2026-08-24 두 번째 묶음 — 남은 일 처리

앞 배포(`8568685` → `85c13e3`, 커밋 12개) 뒤 남겨 뒀던 항목들. 그 인수인계 파일
(`docs/NEXT-PROMPT.md`)은 내용을 전부 이 문서로 옮기고 **지웠다** — 같은 사실이 두
파일에 살면 한쪽이 먼저 낡는다. 남은 것은 §5 에 있다.

| 항목 | 결과 |
|---|---|
| **B-1 삭제요청 인입 경로** | `/takedown` 폼 + `/api/takedown` + `submit_takedown_request`(0021). 실측 행 0 → 접수 가능. 8장(ADMIN.md) |
| **B-2 `이사하야신사` 오분류** | `restaurant` → `attraction`. 1행. 나머지 133행은 손대지 않았다(§3-13) |
| **B-3 봉인 밖 다섯 번째 규격** | `NewListButton` 의 button 갈래를 `Button`(secondary·md)으로 이관. row 갈래는 목록 행이라 남겼다 |
| **B-4 EN 상호명** | `places.name_en` 1,599곳 채움 + **표시 배선**(§3-12). EN 트리가 이제 영문 상호를 그린다 |
| **docs/ADMIN.md** | 신설 |

⚠️ **DB 변경분은 프로덕션에 이미 들어갔다**(B-2·B-4). 코드는 아직 배포 전이라
`name_en` 은 배포 전까지 아무 데도 안 나온다. `이사하야신사` 는 공개 캐시가 도는 대로
바뀐다 — 즉시 반영하려면 `vercel cache invalidate --tag public-data`.

---

## 1. 이 브랜치에서 무슨 일이 있었나

`feat/celebrity-spots` 에서 **전체 점검 → 수정 → 검증**을 한 번에 돌렸다.
기준점은 `8568685`, 결과는 커밋 12개 · **143 files · +5,792 / −2,466**.

점검에서 치명 4 · 높음 8 · 중간 13 · 낮음 14를 찾았고, **3건을 빼고 전부 고쳤다**(§5).

### 커밋 지도

| 커밋 | 무엇을 |
|---|---|
| `87ae399` `fix(routes)` | 스트리밍 경계가 삼키던 404·308 |
| `0155bbb` `fix(proxy)` | 깨진 퍼센트 이스케이프 500 → 404, matcher 분리 |
| `0420061` `fix(i18n)` | `stripLocalePrefix` 가 `/ko` 미처리 + 사전 통합 |
| `cd8156e` `perf(api)` | 요청당 1회 캐시, 사전 인코딩, 삼킨 에러 |
| `875866b` `perf(search)` | 입력 프리즈, 색인 정규화, 가짜 실패어 |
| `f0e7591` `fix(map)` | 하트 → 마커 정지, 리렌더 폭풍 |
| `a5d7caf` `perf(lists)` | 목록 페이지 분할 + ISR 복귀 |
| `a8cd14d` `feat(seo)` | 빈 공유 카드, OG 로케일·색·폰트 |
| `b151b20` `feat(ui)` | Chip·Button·EmptyState 봉인, `--alert` |
| `3b38094` `fix(security)` | 어드민 이중 방어, RLS 쓰기, rate limit |
| `8d48591` `fix(shell)` | 언어 전환 서버 렌더, 태블릿 내비 |
| `57bc954` `chore` | `/hero-concepts` 삭제, 의존성 4건 |

> ⚠️ **중간 커밋은 개별로 빌드되지 않을 수 있다.** i18n 키를 라우트가 쓰고 봉인한
> `Chip` 을 페이지가 쓰는 식으로 얽혀 있다. 검증한 것은 **HEAD 하나**다.
> bisect 용이 아니라 읽기용 분할이다.

---

## 2. 수정 전후 (프로덕션 빌드 실측)

> 아래 표는 **첫 묶음**(`8568685` → `85c13e3`)의 수치다. 두 번째 묶음이 바꾼 값은
> 이 표 아래 §2-1 에 따로 적는다 — 두 번을 한 표에 섞으면 어느 쪽이 무엇을 샀는지
> 못 읽는다.

| 항목 | 전 | 후 |
|---|---|---|
| 죽은 URL 7종 | **200** (soft-404) | **404** |
| 단일 채널 도시 리다이렉트 | **한 번도 안 나감** | **307 + Location** |
| 깨진 퍼센트 이스케이프 | **500** | **404** |
| `/type/restaurant` | 244 KB gz (1.91 MB) | **39.6 KB** |
| `/city/fukuoka` | 187 KB gz (1.26 MB) | **31.9 KB** |
| `/c/kimsawon` | 108 KB gz (1.06 MB) | **31.2 KB** |
| `/api/map/index` | 727 KB raw / 147 KB gz | **280 KB / 137 KB** |
| `/api/search-index` | 806 KB raw / 175 KB gz | **413 KB / 129 KB** |
| SEO 착지 3종 TTFB | 20–35 ms (매 요청 SSR) | **2.3–3.1 ms** (ISR) |
| 검색 연속 8타 입력 | **렌더러 45초+ 프리즈** | **8 ms** |
| `og:image` 누락 | 4개 라우트 | **0** |
| ko 정적 `aria-current` | **0개** | `/` 2 · `/map` 3 |
| 언어 전환 링크(정적 HTML) | 4개 라우트에서 **0개** | 전 라우트 |
| 필터 선택 행 대비 | **4.46:1** (AA 미달) | **7.12:1** |
| `npm audit` | high 4 | **0** |

### 2-1. 두 번째 묶음 (같은 절차로 재측정 — `rm -rf .next && build && rm -rf .next/cache`)

| 항목 | 전 | 후 | 무엇을 샀나 |
|---|---|---|---|
| `takedown_requests` 인입 경로 | **없음**(실측 행 0) | 폼 + RPC | 법정 접수 창구 |
| EN 장소 이름 | 전 건 한국어 | **1,599곳 영문** | `/en` 트리의 이름 |
| `places.name_en` 채워진 행 | **0** | 1,599 / 공개 1,884 (나머지 285는 이미 라틴) | — |
| `/api/map/index` | 280 KB / 137 KB gz | **319 KB / 158 KB gz** | 행마다 `nameEn` 한 칸 |
| `/api/search-index` ko | 413 KB / 129 KB gz | **456 KB / 148 KB gz** | 건초더미의 `name_en` 이 실제로 채워짐 |
| `/api/search-index` en | 413 KB / 129 KB gz | **401 KB / 128 KB gz** | 이름이 짧아진 만큼 상쇄 |
| `map:detail-index` (ko) | 1.57 MiB (79%) | **1.61 MiB (81%)** | §3-6 — **내 변경 탓이 아니다** |
| 봉인 밖 단추 | 1개 | **0개** | — |

⚠️ ko 검색 색인이 +19KB gz 인 것은 **의도한 비용이다.** 건초더미에 `name_en` 을 싣는
배선은 예전부터 있었고 값이 비어 있었을 뿐이다. 이제 ko 에서도 "Ikkei" 로 잇케이가
찾힌다. 색인은 검색을 **열었을 때만** 받아 간다(`api/search-index/route.ts` 주석).

---

## 3. 지뢰 — 이걸 모르면 같은 함정을 다시 밟는다

여기가 이 문서의 본체다. 전부 **실험으로 확인**했고, 틀린 가설은 틀렸다고 적었다.

### 3-1. `loading.tsx` 가 `notFound()`·`redirect()` 의 상태 코드를 삼킨다

Suspense 경계가 200 헤더를 **먼저** flush 해서, 뒤늦게 도착한 404·308이 상태를 못 바꾼다.
증상 세 겹: 죽은 URL 이 200 · `redirect()` 가 Location 헤더 없이 사라짐 ·
응답 본문이 크롬 300자뿐(404 문구는 RSC 플라이트 안에만).

**통제 실험:** 영상 라우트의 `loading.tsx` **하나만** 지우고 재빌드 → 그 라우트만
200→404 로 뒤집혔고 대조군은 그대로. `place/[slug]` 가 정상 404 를 내던 유일한
이유도 거기만 `loading.tsx` 가 없어서였다.

**통하지 않는 우회(시험함):** `generateMetadata` 안에서 `notFound()` → **여전히 200.**
메타데이터 해석도 경계 뒤에 있다.

**해법:** 존재 판정을 경계 **위**인 세그먼트 `layout.tsx` 로. `layout > Suspense > page`
라 layout 이 await 하면 응답이 아직 flush 되지 않는다. 스켈레톤은 유지된다.
이 리포의 5개 `layout.tsx` 는 전부 그 목적 전용이다(그릴 것이 없고 children 만 통과).

**들어온 경로:** `f9247cc` 가 `loading.tsx` 13개를 한꺼번에 심었고 그중 6개가
`notFound()`/`redirect()` 라우트에 앉았다. 즉 하루짜리 회귀였다.

### 3-2. 404 **본문**은 초기 HTML 에 안 들어간다 — 고칠 수 없다

상태 코드는 404 로 정상인데 `not-found.tsx` 본문은 전부 RSC 플라이트에만 있다.
헤더·푸터 크롬도 마크업에 없다.

**통제 실험:** `not-found.tsx` 를 `"use client"` 없는 **순수 서버 컴포넌트**로 바꿔
정적 문자열만 렌더하고 재빌드 → **마크업 등장 여전히 0회.** `loading.tsx` 유무와도
무관하다. `"use client"` 탓이 아니라 Next 의 전달 방식이다.

**결론:** 쫓지 마라. 크롤러에게 중요한 것은 상태 코드고 그건 정상이다.
`not-found.tsx` 가 `useLocale()` 을 쓰는 것도 옳다 — 이 파일은 `params` 를 못 받는다.

### 3-3. `usePathname()` 이 주소창 경로를 준다는 건 **런타임에서만** 맞다

정적 렌더(SSG/ISR)에서는 rewrite 된 **라우트 경로**(`/ko`, `/ko/map`)를 준다.

```
/      aria-current 0개  |  /en      2개   ← 같은 홈인데 ko 만 비었다
/map              0개  |  /en/map   3개
/saved            3개  (force-dynamic — 런타임이라 정상)
```

그래서 `stripLocalePrefix` 는 `/en` 뿐 아니라 **`/ko` 도** 걷어야 한다.
안 걷으면 `Nav.isActive`·`LocaleSwitch`·`HeaderLead`·`MapRouteChrome` 이 전부 어긋난다.

### 3-4. `searchParams` 를 읽으면 `revalidate` 를 더해도 ISR 이 안 된다

읽는 것만으로 Next 가 라우트를 동적으로 만든다. `map/page.tsx` 주석이
*"읽지 마라, 매 진입이 람다 SSR"* 이라고 못 박아 뒀는데 SEO 본진 셋이 읽고 있었다.
필터는 클라이언트가 `useSearchParams()` 로 읽는다.

### 3-5. 중첩 `unstable_cache` 는 **읽기만** 우회하고 쓰기는 그대로 한다

캐시된 함수를 캐시된 함수 안에서 부르면 안쪽은 캐시를 우회하지만 **직렬화 비용은
계속 낸다**(크기 측정용 + 저장용으로 두 번). `cities:graph` 가 최상위 호출자 0인 채로
요청마다 MiB 급 객체를 두 번 직렬화하고 버리고 있었다.

또한 `unstable_cache` 에는 **요청 단위 메모이제이션이 없다** — `generateMetadata` 와
본문이 같은 로더를 부르면 전체 `JSON.parse` 가 두 번 돈다. `cachePublic` 을 React
`cache` 로 감싸 해결했다.

### 3-6. `unstable_cache` 2 MiB 상한은 **조용히** 꺼진다

넘으면 빌드 로그 한 줄이 전부이고 그 뒤로는 매 요청 풀스캔이다.
`cache.ts` 가 80% 부터 경고를 남긴다 — Vercel 로그에서 `[cachePublic]` 로 찾는다.

**다음 후보는 `map:detail-index` 다** — `cities:detail` 이 아니다.
`places:slug-index`(ko 99% · en 97%)는 `c25c9e6` 에서 **없앴다**(쪼갠 게 아니라
`map:canvas-index` + `map:detail-index` 의 합집합으로 조립한다).

2026-08-24 재측정 — **ko 1.61 MiB · 81%. 경고선을 이미 넘었다.**
장소당 ~896B 기준 남은 여유는 **약 456곳**이다. 문서에 적혀 있던 79%(1.57 MiB)는
확정 장소가 ~1,833곳이던 시절 값이고, 지금은 1,884곳이다 — **필드가 아니라 장소 수가
민 것**이고 정상적으로 일하면 계속 민다. `MapPlaceDetail`(`cities.ts`)에 필드를
더할 때 반드시 이 수를 먼저 보라.

> 그날 더한 `nameEn` 은 이 항목과 **무관하다.** `MapPlaceDetail` 에 없고
> `map:canvas-index`(0.27 MiB · 13%)에만 들어간다 — 거기는 여유가 크다.

⚠️ **크기 경고는 캐시 미스에만 찍힌다**(`cache.ts` 의 `measured` 가 로더를 감싼다).
서버만 재기동하고 요청하면 `.next/cache` 가 살아 있어 **경고 0건으로 나오고, 그걸
"안전"으로 오독하게 된다**. 재려면:

```
rm -rf .next && npm run build && rm -rf .next/cache && npx next start -p 3105
```

띄운 뒤 ko/en 양쪽으로 전 라우트를 때려야 진짜 크기가 나온다.

### 3-7. Supabase 헬퍼가 에러를 삼키면 **부분 결과가 1시간 캐시된다**

`fetchAll` 의 타입에는 `error` 가 아예 없었다 — 구조적으로 확인이 불가능했다.
페이지네이션 중간 실패 시 일부만 담긴 배열이 완전한 결과처럼 반환되어 굳는다.
사이트맵이 장소를, 지도가 핀을, 검색이 문서를 잃는데 **전부 정상으로 보인다.**
빈 것보다 나쁘다. 새 로더를 쓸 때 `error` 를 반드시 받아라.

### 3-8. OG 카드의 한글 폰트는 **로케일이 아니라 글자**로 판단해야 한다

`celebs`·`city`·`channels`·`place` 는 유저 데이터를 섞는다. `nameEn` 이 비면
`en` 로케일에도 한국어가 그대로 나가는데, 로케일로 폰트를 가르면 폰트를 안 불러
**두부(tofu)** 가 된다. `og-font.ts` 의 `needsKoreanFont(text)` 를 쓸 것.

### 3-9. OG 이미지 라우트 이름에 Next 내부 해시가 붙는다

라우트 그룹(`(public)`·`(home)`·`(hub)`) 아래의 `opengraph-image.tsx` 는 파일명에
해시가 붙는다(`opengraph-image-1saca2`). `page-meta.ts` 의 `OG_IMAGE_ROUTES` 는 그
**실제 빌드 출력에서 읽어 고정한 값**이다. **Next 버전을 올리면 다시 재야 한다** —
안 그러면 모든 공유 카드가 조용히 404 가 된다.

### 3-10. 이 환경에서는 지도를 눈으로 검증할 수 없다

자동화 브라우저 탭에 **WebGL 이 없어**(`canvas.getContext('webgl')` → null) Google Maps
가 정적 이미지로 폴백한다. 지도 인터랙션은 도구로 못 본다 — **유저에게 스크린샷을
요청**해야 한다. 예전에 이걸 "API 키 문제"로 오진한 적이 있다.

헤드리스 캡처가 우측 ~8% 를 잘라내는 문제도 있다. 레이아웃 판단은 캡처가 아니라
`getBoundingClientRect()` **DOM 실측**으로 하라.

### 3-11. `npx tsc --noEmit` 의 `.next/**/validator.ts` 에러는 가짜다

라우트를 옮기거나 지우면 Next 가 만든 라우트 타입 검증기가 낡은 채 남는다.
**`rm -rf .next && npm run build`** 로 재생성된다. `src/` 밖 에러는 무시하고
`grep -v '^\.next/'` 로 걸러서 보라.

### 3-12. EN 장소 이름은 `name_en → name_local → name` 순이다

2026-08-24 이전에는 `displayPlaceName` 이 EN 에서 **`name_local` 만** 봤고
`places.name_en` 은 **어느 화면도 읽지 않았다.** 공개 1,884곳 중 `name_local` 이 있는
것은 145곳뿐이라, EN 트리의 장소 이름이 사실상 전부 한국어로 나갔다.

그래서 **채우기만 해서는 화면이 한 글자도 안 바뀐다.** 컬럼을 채우는 일과 표시를
배선하는 일은 별개고, 둘 다 해야 한다. 배선이 닿아야 하는 자리:

`display.ts` → `cities.ts`(`HomeMapPlace`·`MapCanvasPin`·`MapIndexRow`·`CityPlaceRaw`)
→ `map-filters.ts`(`decodeMapPin`) → `places.ts` → `place-types.ts` → `creator-hub.ts`
→ `videos.ts` → `home.ts` → 각 `*-payload.ts` → `search.ts`.

⚠️ **`MapIndexRow` 의 자리번호를 읽는 곳은 `decodeMapPin` 하나가 아니다.**
주석은 그렇게 적혀 있었지만 실제로는 `decodeMapIndex` 와 `loadMapCreators` 도
채널 자리를 직접 읽는다. 칸을 하나 끼워 넣으면 그 둘이 **조용히 어긋난다**(tsc 가
튜플 길이로 잡아 주긴 했다 — 운이 좋았던 것이지 설계가 막은 게 아니다).

⚠️ 보조줄의 `lang` 을 `locale === "en" ? "ko" : "ja"` 로 못박지 마라. 이제 EN
보조줄에 일본어가 설 수 있다. `displayPlaceSecondaryLang()` 이 실제 값을 보고 고른다.

`en_source` 는 **산문(요약)의 출처 표시**다. 이름과 무관하니 이름을 채울 때 건드리지
마라 — `machine` 을 찍으면 번역되지도 않은 빈 요약이 "자동 번역"으로 나가고, 산문
번역 대상(`en_source is null`)에서도 영영 빠진다. (`docs/ADMIN.md` 7장)

### 3-13. `place_id` 없는 134곳은 재분류를 못 받는다 — 방침이다

`scripts/ingest/reclassify-place-types.mjs` 는 기존 `google_place_id` 로 Places
Details 만 부른다. 이름으로 검색해 붙이는 경로가 2026-08-18 후쿠오카 오확정 무더기를
만든 길이라 **일부러 안 쓴다**(`docs/ADMIN.md` 5.1). 그 134행은 버그로 남은 게 아니다.

그중 이름만으로 랜드마크가 확실한 것은 **`이사하야신사` 하나였고**(실측) 손으로 고쳤다.
나머지는 실제로 식당일 가능성이 높다 — **일괄 처리하지 마라.**

### 3-14. 스크립트의 `.select()` 는 1,000행에서 잘린다

PostgREST 기본 상한이다. `.range()` 로 끝까지 돌지 않으면 공개 1,884곳 중 1,000곳만
보고 "다 했다"로 끝난다 — 출력만 보면 정상이라 **조용한 유실**이다. §3-7 의 `fetchAll`
과 같은 함정이고, 앱 코드는 `fetchAll` 로 막았지만 `scripts/` 는 각자 막아야 한다.
`translate-en.mjs` 의 `selectAll()` 이 그 모양이다. 실제로 첫 실행에서 당했다
(대상이 1,599인데 893으로 나왔다).

### 3-17. 적용하면 안 되는 마이그레이션은 `-- @hold:` 로 막는다

디렉터리에 파일이 있는 것만으로 `npm run db:migrate` 무인자가 적용해 버린다.
`0020_drop_bulk_confirm_backup.sql` 이 그런 파일이고, 그동안 방어는 문서 한 줄
("당분간 개별 실행을 써라")뿐이었다. 문서는 사고를 못 막는다.

이제 파일 머리에 `-- @hold: <이유>` 가 있으면 `db-run.mjs` 가 무인자 실행에서
**빼고 이유를 출력한다**(조용히 빼지 않는다 — 안 도는 것보다 나쁜 게 왜 안 도는지
모르는 것이다). 인자로 직접 주면 그대로 적용되고 경고만 한 번 뜬다.

### 3-15. `URL.pathname` 은 퍼센트 인코딩된 경로를 준다

확정 장소 slug 는 대부분 한글이라(`place-path.ts`), 붙여넣은 URL 에서 slug 를 꺼낼 때
`decodeURIComponent` 를 안 걸면 `%EC%9D%BC…` 로 조회하게 되어 **대상이 영영 안 붙는다.**
`/api/takedown` 에서 실측으로 당했다 — `target_type` 은 맞는데 `target_id` 만 null 이라
증상이 "그냥 못 찾았나 보다"로 읽혔다.


### 3-16. 분류기는 `scripts/ingest/_lib/place-type.mjs` **하나뿐**이다

2026-08-24 에 확정 장소의 93.4%가 `restaurant` 이던 것을 고쳤다(→ 74.6%, 지금 74.5%).
원인 중 하나가 **분류기가 여러 벌로 갈린 것**이었다 — `tmp/ingest-creators.mjs` 의
`guessType` 은 cafe/hotel/attraction 분기가 아예 없었고, `tmp/ingest-sydney-spain.mjs`
의 같은 이름 함수만 제대로 갈랐다. 그래서 시드니·세비야·그라나다만 분포가 정상이었다.

**새 인제스트 경로를 만들면 그 모듈을 import 해라. 분류 규칙을 다시 적지 마라.**

그 파일에 박아 둔 함정 둘:

- **`\b` 를 쓰지 마라.** JS 정규식은 `_` 를 단어문자로 봐서 `\brestaurant\b` 가
  `hamburger_restaurant` 에 **안 걸린다**. 실측으로 당했다 — 버거바가 `bar` 가 됐다.
  타입 토큰에 통째로(`^…$`) 물리거나 접미사(`_restaurant$`)로 적어라.
- **cafe 가 shop 보다 위**여야 한다. 빵집은 Google 이 `bakery` 와 `store` 를 함께
  다는데, shop 이 위면 전부 shop 으로 샌다. 우리 유저에겐 빵집이 먹는 곳이다.
---

### 3-18. 한글 폰트 조각은 **패밀리 이름을 갈라야** 한다 — 한 이름으로 묶으면 전부 받는다

Paperlogy 를 `core` + `ext0-3` 다섯 조각으로 잘라 싣는다(`src/app/fonts.ts`,
`scripts/subset-fonts.mjs`). 홈 첫 진입 폰트 전송이 786KB → 393KB 로 줄었다.

처음엔 next/font/google 이 한글에 쓰는 방식대로 25벌을 `Paperlogy` **한 이름**으로
묶고 `unicode-range` 로 갈랐다. 그랬더니 브라우저가 **조각을 전부 받았다(922KB —
자르기 전보다 나쁨)**. 같은 패밀리 안에서 범위가 겹치면 CSS 규칙상 **나중에 선언된
face 가 이기는데**, core 의 `U+AC00-D7A3` 안에 ext 범위가 통째로 들어 있었다.
구글이 한 이름으로 되는 건 조각마다 범위를 **정확히** 나열해 겹치지 않기 때문인데,
한글은 그 목록이 900구간을 넘어 CSS 가 폰트에서 아낀 것보다 커진다.

지금은 조각마다 이름이 다르고(`Paperlogy`, `Paperlogy Ext0`…) globals.css 에서
사슬로 세운다. 브라우저가 앞 패밀리에 글자가 없으면 다음으로 넘어가므로 커버리지는
원본과 같다(11,723 글리프 전수 대조로 확인 — 누락 0, 겹침 0).

함정 셋:

- **`className` 을 얹지 마라.** `declarations` 로 `font-family` 를 덮으면 next/font 가
  지어낸 이름의 @font-face 가 존재하지 않는데, `className` 은 그 이름으로
  `font-family` 를 덮어써서 `<html>` 이 브라우저 기본 글꼴로 떨어진다. `variable` 만 쓴다.
- **`"Paperlogy Fallback"` 은 반드시 ext 뒤**다. 앞에 오면 모든 글자를 가진 폴백이
  ext 조각을 영영 가린다. 이 폴백은 `adjustFontFallback: false` 라 next/font 가 안
  만들어 주므로 globals.css 에 손으로 적혀 있다 — **폰트 파일을 갈아끼우면 그
  size-adjust/ascent-override 숫자를 다시 계산해야 한다.**
- **원본 Paperlogy 는 한글 11,172자 중 2,780자만 윤곽이 있다.** 나머지 8,392자는
  cmap 에 있지만 빈 글리프다 — `쀍`·`쭑` 이 빈칸으로 나오는 건 **자르기 전부터**
  그랬다. 조각 탓으로 오해하지 마라. 빈 글리프는 다 합쳐 6KB 라 그대로 싣는다.

코퍼스가 늘어도 **다시 돌릴 필요 없다** — 새 글자는 ext 가 받아준다.
`npm run fonts:subset` 은 core 히트율을 올리고 싶을 때만 돌린다(pyftsubset 필요).
---

## 4. 새로 생긴 구조

- **`(protected)` 어드민 라우트 그룹** — 로그인 화면만 밖에 두고 그 안은 레이아웃이
  가드한다. `proxy.ts` 가 유일한 방어선이던 것을 이중으로 만들었다.
- **목록 분할 API** — `/api/city/[city]/places`, `/api/city/[city]/c/[creator]`,
  `/api/type/[type]/groups`, `/api/creator/[creator]/places`, `/api/creator/[creator]/videos`.
  전부 `/api/map/index` 와 **같은 캐시 헤더·`Cache-Tag`** 를 쓴다. 태그가 갈라지면
  어드민 퍼지가 그 CDN 사본을 못 지운다.
- **봉인된 컴포넌트** — `shared/ui/frame.tsx` 의 `Chip`, `shared/ui/Button.tsx`,
  `shared/ui/EmptyState.tsx`(**`children` 필수** — `action` 이 아니다). 인라인으로
  알약·버튼을 다시 그리지 마라. 2026-08-24 두 번째 묶음에서 `NewListButton` 의
  button 갈래까지 들였다. row 갈래는 단추가 아니라 목록 행(`ROW_BODY`)이라 그대로 둔다.

  전수 확인 결과 공개 트리에서 **높이+라운드+채움을 손으로 적은 액션 단추는 0개**다.
  걸리는 것 하나는 `SearchBar.tsx` 의 검색 트리거인데, 그건 액션 단추가 아니라
  **입력창 모양의 필드 어포던스**다(채움 없음 · md 부터 헤더 폭을 채운다).
  `Button` 의 세 variant 어디에도 그런 모양이 없으므로 봉인 대상이 아니다 —
  "예외 0개" 를 "액션 단추는 전부 Button 을 지난다" 로 읽어라.
- **삭제요청 인입 경로** — `/takedown` 폼 → `/api/takedown` → `submit_takedown_request`
  (0021). RLS 정책 0개 + definer RPC + service_role 라우트 = `0013`(channel-apply)과
  같은 배치다. 자세한 것은 `docs/ADMIN.md` 8장.
- **`--alert` 토큰** — `#6a0d1b`, 흰 지면 12.45:1. 위험·파괴 전용.
  2026-08-24 에 `#a4161a`(7.75:1) 에서 내렸다 — 옛 값은 `--wax` 와 대비가 **1.60:1**
  뿐이라 "지우기"와 "이게 우리 색"이 색으로는 안 갈렸다(적록색약에서는 같은 색).
  지금은 wax 와 **2.57:1**. 대신 `--paper` 대비가 2.31→1.44 로 줄어, 본문에서
  가르는 것은 명도가 아니라 hue + 굵기 + 아이콘이다.
  브랜드색 `--wax`(`#c9441a`)는 워드마크·주 CTA·활성 표시에만.

---

## 5. 열려 있는 것

### 5-1. 사람이 눈으로 봐야 하는 것 — 자동화로 불가 (§3-10)

지도 인터랙션은 이 환경에서 **검증할 수 없다.** WebGL 이 없어 Google Maps 가 정적
이미지로 폴백하고, 자동화 탭은 백그라운드라 Chrome 이 타이머·React 스케줄러를
스로틀링한다(드롭다운이 안 열리고 `setTimeout` 이 안 돈다 — 이걸 "프리즈"로 오진한 적이
있다). **유저에게 목록을 주고 결과를 받아라.**

| # | 무엇을 |
|---|---|
| A-1 | `/map` 핀 A 클릭 → **다시 A 클릭** → 드로어 닫힘, **뒤로가기 한 번**에 지도. A→B→C 뒤에도 한 번. (고친 커밋 `57e04d3`) |
| A-2 | 지도 실패 화면에서 "다시 시도" → 타일과 **핀이 같이** 돌아오는지. 클러스터(>150핀)·낱개(≤150핀) 양쪽 |
| A-3 | **하트 → 팬** — 하트를 누른 뒤 팬 했을 때 마커가 계속 그려지는지. 문제가 있으면 `f0e7591` 만 되돌리면 분리된다 |
| A-4 | `/map?place=<유효 id>` 진입 직후 오프라인 → `?place=` 가 URL 에 **남고** "찾을 수 없어요"가 안 떠야 한다. 진짜 없는 id 로는 알림 + URL 정리 |
| A-5 | 죽은 `?place=` → 자동 복구 → **앞으로가기** → 알림·URL 정리가 한 번 더(무한 루프 아님) |
| A-6 | 인덱스가 빈 응답일 때 `/map` 빈 화면의 "홈으로" 알약 |
| A-7 | **`/saved` 데스크톱 "새 리스트 만들기" 단추** — `Button`(secondary·md)으로 이관했다. 라운드가 10px → 12px 로 2px 커진 것 말고 달라 보이면 안 된다. ⚠️ 서버 HTML 로는 확인이 안 된다 — 저장 데이터가 있어야 `SavedIndex` 가 그린다(익명 요청에는 `variant="row"` 만 나온다). 코드 경로와 봉인 위반 0건은 확인했다 |

### 5-2. 남은 것

| 항목 | 상태 |
|---|---|
| **`summary_en` 0행** | `translate-en.mjs` 를 산문 모드로 **한 번도 안 돌렸다.** EN 요약은 §3-8 대로 숨겨지므로 깨진 건 없지만 EN 페이지에 산문이 없다. **막힌 게 아니라 안 하기로 한 것이다** — 2026-08-24 에 "이름만" 으로 범위를 정했다. 돌리려면 `npm run translate:en`(대상 1,942곳, dry-run 먼저) |
| **`0020_drop_bulk_confirm_backup.sql`** | **적용하지 않는다.** `_bulk_confirm_20260805` 12행을 정리하는 대가로 `0002` 롤백 절차의 근거를 잃고, 그 대상에 재검토가 안 끝난 장소 여섯이 있다. 이제 파일 머리에 `-- @hold:` 가 있어 `npm run db:migrate` 무인자가 **자동으로 건너뛴다**(§3-17) — 무인자 실행이 안전해졌다 |
| **오확정 10그룹** | 서로 다른 가게가 한 `google_place_id` 를 나눠 쓴다(다이묘 헤테 3행 · 산요우 쇼쿠도 3행 · 고쿠테이/후우키세이멘/흑마늘 라멘 등). **자동 복구는 두 번 확인해서 안 된다** — 좌표 앵커가 이미 틀린 가게 것이고, 상호+도시 재검색은 근처 인기 매장을 물어 온다. 사람이 봐야 한다 |
| **`선릉역점`(서울)** | 장소 `name` 이 지점 접미사뿐이고 상호가 없다(주소 서울 강남구 선릉로86길 39). 번역 문제가 아니라 **인제스트가 상호를 잃은 행**이다. 무슨 가게인지는 사람이 알아야 고친다 |
| **같은 이름 중복 행 10그룹** | `골목집`(서울, 3행) · `이화원`(후쿠오카, 2행) 등. `merge-duplicate-places.mjs` 가 이름이 다르면 일부러 건너뛰는데 이쪽은 이름이 같다 — 합칠지 사람이 판단 |

### 5-2-1. 2026-08-24 두 번째 묶음에서 닫은 것

| 항목 | 어떻게 |
|---|---|
| **`ADMIN_SECRET` 이 두 역할** | 서명 키를 비밀번호에서 **단방향 유도**로 뽑는다(`cookieSigningKey`). 새 env 0개 · 회전 결정 불필요 · 전환 창이 옛 쿠키를 받아 세션도 안 끊긴다. `docs/ADMIN.md` 1.3 |
| **ledger 오염 26행** | `scripts/clean-migration-ledger.sql` 실행. 47행 → 21행, 백업은 `_migrations_backup_20260824`. 돌리기 전 화이트리스트 누락 0 · basename 충돌 0 을 확인했다 |
| **`db:migrate` 무인자가 `0020` 을 끌고 가던 것** | `-- @hold:` 지시자로 코드에서 막았다(§3-17) |
| **A-8 EN 상호 표기 갈림** | 10행 수정(체인 표기 통일 6 · 지점 접미사 3 · 로마자 1). 재발 방지로 스크립트가 이름 순 정렬 후 배치한다 |

### 5-3. 종결된 것

- **404 본문이 JS 의존** — §3-2. 실험으로 고칠 수 없음을 확인했다. 쫓지 마라.
- **`docs/ADMIN.md` 부재** — 2026-08-24 에 만들었다. 주석 14곳이 이제 실재하는 장을 가리킨다.
- **삭제요청 인입 경로 부재** — 같은 날 열었다(`docs/ADMIN.md` 8.2).

---

## 6. 다시 검증하려면

```bash
rm -rf .next && npm run build && npm run start
```

- **상태 코드:** `/c/nope`·`/city/nowhere`·`/type/nope`·`/saved/doesnotexist`·
  `/place/does-not-exist`·`/place/%` → 전부 404. `/city/lockhart` → 307 + Location.
- **회귀:** ko/en 주요 라우트 30개 200. `/place/일등집-ej1r` 같은 한글 slug 포함.
- **어드민:** `/admin` 307 · `/admin/login` **200**(잠기면 안 된다).
- **무게:** 위 §2 표와 대조.
- **검색:** ⌘K → `후쿠오카`·`fukuoka`·`ㄷㅋ`(→도쿄)·`ㅅㅍㄹ`(→삿포로)·`곽튜브`·
  `zzzqqq`(0건 + 회복 링크). 연속 8타를 빠르게 쳐서 프리즈가 없는지.
- **OG:** 각 라우트의 `og:image` 를 실제로 받아 `image/png` 인지, EN 카드에 두부가
  없는지(영상 카드가 가장 확실 — 제목이 절대 번역되지 않는다).
- **EN 이름:** `/en/place/일등집-ej1r` 의 `<title>` 이 `Ildeungjip — …` 인지.
  `/en/city/fukuoka` 목록 행이 영문 메인 + 한글 보조로 서는지.
- **삭제요청:** `/takedown` 에 폼이 **서버 HTML 로** 있는지(`요청 사유`·`Reason`).
  ```
  curl -X POST localhost:3000/api/takedown -H 'Content-Type: application/json' \
    -d '{"targetUrl":"http://localhost:3000/place/일등집-ej1r","email":"a@b.co","reason":"점검"}'
  ```
  → 204. 이메일 누락·사유 5자 미만 → 400. 분당 4번째 → 429.
  DB 에서 `target_type='place'` 이고 **`target_id` 가 붙었는지**(§3-15).
  anon 키로 `/rest/v1/rpc/submit_takedown_request` → **401**, 테이블 직접 INSERT → **401**.
  ⚠️ 점검 뒤 넣은 행은 반드시 지워라 — 큐의 법정 기한 계산에 섞인다.

**검색 색인 등가 검증 스크립트**는 세션 임시 디렉터리에 있었고 지금은 없다.
재작성한다면: `search.ts` 를 컴파일해 `packHay`/`unpackIndex`/`search` 를 꺼내고,
Supabase 에서 행을 끌어와 옛/새 형식 색인을 만든 뒤 질의 수백 개(손으로 고른 30개
+ 실제 이름·불릿에서 뽑은 무작위 조각, 각각 대문자·초성 변환본)로 대표 결과·그룹·
순서·경로·문구 지문을 대조하면 된다. 마지막 실행에서 **불일치 0**이었다.

⚠️ `hay[0] === name` 은 **ko 에서만** 100% 다. EN 도시·종류는 `name` 이 영문 라벨인데
`hay[0]` 은 한국어 원문이라, 그냥 떼면 "도쿄"로 Tokyo 를 못 찾는다. **같을 때만** 뗀다.
