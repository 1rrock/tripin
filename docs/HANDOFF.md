# HANDOFF

이 파일은 코드 주석과 전역 설정이 가리키는 자리다. 2026-08-24 이전까지 **없었다** —
`docs/` 디렉터리 자체가 없었고, 주석 14곳이 참조하는 `docs/ADMIN.md` 는 **여전히 없다**.

읽는 순서: `PRODUCT.md`(제품 원칙·브랜드 규칙) → `ROADMAP.md` → 이 파일.

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
다음 후보는 `cities:detail`(후쿠오카).

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

---

## 4. 새로 생긴 구조

- **`(protected)` 어드민 라우트 그룹** — 로그인 화면만 밖에 두고 그 안은 레이아웃이
  가드한다. `proxy.ts` 가 유일한 방어선이던 것을 이중으로 만들었다.
- **목록 분할 API** — `/api/city/[city]/places`, `/api/city/[city]/c/[creator]`,
  `/api/type/[type]/groups`, `/api/creator/[creator]/places`, `/api/creator/[creator]/videos`.
  전부 `/api/map/index` 와 **같은 캐시 헤더·`Cache-Tag`** 를 쓴다. 태그가 갈라지면
  어드민 퍼지가 그 CDN 사본을 못 지운다.
- **봉인된 컴포넌트** — `shared/ui/frame.tsx` 의 `Chip`, `shared/ui/Button.tsx`,
  `shared/ui/EmptyState.tsx`(`action` 필수). 인라인으로 알약·버튼을 다시 그리지 마라.
- **`--alert` 토큰** — `#6a0d1b`, 흰 지면 12.45:1. 위험·파괴 전용.
  2026-08-24 에 `#a4161a`(7.75:1) 에서 내렸다 — 옛 값은 `--wax` 와 대비가 **1.60:1**
  뿐이라 "지우기"와 "이게 우리 색"이 색으로는 안 갈렸다(적록색약에서는 같은 색).
  지금은 wax 와 **2.57:1**. 대신 `--paper` 대비가 2.31→1.44 로 줄어, 본문에서
  가르는 것은 명도가 아니라 hue + 굵기 + 아이콘이다.
  브랜드색 `--wax`(`#c9441a`)는 워드마크·주 CTA·활성 표시에만.

---

## 5. 열려 있는 것 3건

| 항목 | 왜 안 고쳤나 |
|---|---|
| **`/map` 하트 → 팬 미검증** | 코드는 고쳤다(`f0e7591`). WebGL 부재로 지도 마커 동작만 눈으로 못 봤다(§3-10). **실제 브라우저에서 하트 누르고 팬 해 볼 것.** 문제가 있으면 그 커밋만 되돌리면 분리된다. |
| **404 본문이 JS 의존** | §3-2 — 실험으로 고칠 수 없음을 확인했다. |
| **`ADMIN_SECRET` 이 비밀번호이자 HMAC 서명 키** | 분리하면 기존 세션이 전부 끊긴다. **시크릿 회전 정책 결정이 필요하다** — 사람 몫. |

### 남은 문서 부채

주석 **14곳**이 `docs/ADMIN.md` 를 근거로 든다. 그 파일은 아직 없다.
보안 규칙의 근거 문서가 없어 "이 예외가 의도된 것인가" 를 검증할 수 없다.

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

**검색 색인 등가 검증 스크립트**는 세션 임시 디렉터리에 있었고 지금은 없다.
재작성한다면: `search.ts` 를 컴파일해 `packHay`/`unpackIndex`/`search` 를 꺼내고,
Supabase 에서 행을 끌어와 옛/새 형식 색인을 만든 뒤 질의 수백 개(손으로 고른 30개
+ 실제 이름·불릿에서 뽑은 무작위 조각, 각각 대문자·초성 변환본)로 대표 결과·그룹·
순서·경로·문구 지문을 대조하면 된다. 마지막 실행에서 **불일치 0**이었다.

⚠️ `hay[0] === name` 은 **ko 에서만** 100% 다. EN 도시·종류는 `name` 이 영문 라벨인데
`hay[0]` 은 한국어 원문이라, 그냥 떼면 "도쿄"로 Tokyo 를 못 찾는다. **같을 때만** 뗀다.
