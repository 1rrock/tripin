# Tripin — 데이터베이스 운영 문서

> Supabase(Postgres) 스키마·마이그레이션·RLS 운영 메모.
> 스키마 설계 근거는 `CONCEPT.md` 6장, 법적 제약은 `LEGAL.md`.

---

## 1. 왜 supabase CLI 를 쓰지 않는가

**CLI 는 머신당 한 계정으로만 로그인된다.** 이 머신은 히든스팟 계정으로 로그인돼 있고, Tripin 은 **별도 계정**이라 `supabase link` 가 안 된다. 계정을 갈아끼우면 히든스팟 작업이 끊긴다.

그래서 **psql 직결**로 마이그레이션을 돌린다 — 히든스팟도 이미 같은 방식(`scripts/db-run.mjs`)을 쓰고 있어 컨벤션도 맞는다.

부수 효과: `supabase gen types` 도 못 쓰므로 **타입은 손으로 관리**한다 (`src/shared/api/database.types.ts`). 마이그레이션을 추가하면 그 파일도 같이 고칠 것.

---

## 2. 최초 세팅

### 2.1 `SUPABASE_DB_URL` 얻기

Supabase 대시보드 → **Settings → Database → Connection string → `Session pooler` 탭**

URI 를 복사하고 `[YOUR-PASSWORD]` 를 실제 DB 비밀번호로 치환해서 `.env.local` 에 넣는다.

```
SUPABASE_DB_URL=postgresql://postgres.cdimzihwqkesvcmogdkd:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

비밀번호를 잊었으면 같은 화면에서 **Reset database password** 로 재발급. anon/service_role 키와는 **다른 값**이다(JWT 에서 유도되지 않는다).

### 2.1.1 실제로 막혔던 것들 (2026-08-04 세팅 시)

세 번 걸려서 세 번 다 고쳤다. 다시 세팅할 일이 있으면 아래를 먼저 확인할 것.

| 증상 | 원인 | 해결 |
|------|------|------|
| `could not translate host name "db.<ref>.supabase.co"` | **Direct connection 은 IPv6 전용**이라 이 머신에서 DNS 해석 자체가 안 된다 | `db.<ref>.supabase.co` ❌ → `aws-0-<region>.pooler.supabase.com` ✅ |
| `password authentication failed` | 플레이스홀더 대괄호를 안 지움 — `[비밀번호]` 를 그대로 붙여넣음 | 대괄호 제거 |
| 같은 인증 실패 | 비밀번호에 `@` 가 들어 있어 URI 파싱이 깨짐 (`@` 가 host 구분자로 먹힘) | **URL 인코딩** — `@`→`%40`, `:`→`%3A`, `/`→`%2F`, `#`→`%23` |

> **Session pooler(5432)를 쓰는 이유**: Direct connection 은 위처럼 IPv6 전용이고, Transaction pooler(6543)는 DDL 에 부적합하다. **마이그레이션은 Session pooler(5432)** 가 맞다.
>
> pooler 는 사용자명이 `postgres` 가 아니라 **`postgres.<project-ref>`** 다. 링크된 상태면 `supabase/.temp/pooler-url` 에 정확한 템플릿이 들어 있으니 거기에 비밀번호만 끼워 넣으면 된다.

### 2.1.2 비밀번호는 argv 에 넣지 않는다

`scripts/db-run.mjs` 는 접속 URL 을 `psql` 인자로 넘기지 않고 **`PGPASSWORD` 환경변수 + `-h -p -U -d` 플래그**로 분해해서 넘긴다.

URL 을 argv 로 주면 비밀번호가 (1) `ps` 프로세스 목록과 (2) `execFileSync` 실패 시 에러 메시지에 **평문으로 노출된다.** 실제로 첫 시도에서 터미널 로그에 찍혀서 이 방식으로 바꿨다. 스크립트를 고칠 때 되돌리지 말 것.

### 2.2 마이그레이션 적용

```bash
npm run db:migrate
```

미적용 마이그레이션을 파일명 순서대로 전부 적용한다. 적용 이력은 `_migrations` 테이블에 남아 같은 파일을 두 번 돌리지 않는다.

특정 파일만 강제로 다시 돌리려면:

```bash
npm run db:run -- supabase/migrations/0001_init.sql
```

---

## 3. 스키마 개요

| 테이블 | 역할 |
|--------|------|
| `creators` | 크리에이터. `is_published` 가 채널 단위 공개 스위치 |
| `cities` | 도시 |
| `videos` | 영상 메타. `api_fetched_at` 로 30일 갱신 관리 |
| `places` | 장소. `map_status` 로 confirmed/candidate 구분 |
| `video_places` | 영상↔장소 N:M. `timestamp_sec` 가 아웃링크 `&t=` |
| `creator_cities` | **채널×도시 조각** — 콘텐츠 제작·공개의 최소 단위 |
| `takedown_requests` | 삭제·정정 요청 (법정 절차) |
| `search_misses` | 검색 실패 로그 = 콘텐츠 수요 데이터 |

### 3.1 스키마에 박아둔 제약과 그 이유

일반적인 설계와 다른 부분이 몇 군데 있고, 전부 이유가 있다. **지우기 전에 근거 문서를 볼 것.**

| 설계 | 이유 |
|------|------|
| `creators.initials` (❌ `avatar_url` 아님) | 부정경쟁방지법 제2조 제1호 타목이 성명과 **초상**을 나란히 규정. 이름은 지시적 사용 항변이 서지만 초상은 대체 수단(텍스트)이 있어 방어가 약하다. `LEGAL.md` 1.3 |
| `videos.api_fetched_at` + 인덱스 | YouTube API §III.E.4.d — 공개 API 데이터 **30일 초과 보관 금지**. 갱신 배치가 이 인덱스로 대상을 찾는다. `LEGAL.md` 4.5 |
| 조회수·구독자수 컬럼 **없음** | YouTube API §III.E.2 교차 채널 집계 제한. 저장 자체를 안 한다 |
| `places.lat/lng` 와 `google_place_id` **분리** | Google Places 데이터를 비구글 지도에 표시하면 약관 위반. 좌표는 Overture/Foursquare, `place_id` 는 딥링크 전용. `LEGAL.md` 4장 |
| `places.source_note` | 확정 근거(간판·지역 언급·타임스탬프) 기록. **동명이점 오확정이 이 프로젝트 유일한 구조적 리스크**다. `LEGAL.md` 4.6 |
| `check (confirmed → 좌표 not null)` | confirmed 인데 좌표가 없으면 지도에 못 찍는다. DB 레벨에서 거부 |
| `map_status` 기본값 `candidate` | 확정은 사람이 하는 것. 기본이 confirmed 면 사고가 난다 |

### 3.2 절대 만들지 않을 컬럼

```
transcript_full, raw_caption_blob, caption_segments, quoted_dialogue
view_count, like_count, subscriber_count
avatar_url
```

앞의 넷은 자막 원문(저작권), 다음 셋은 YouTube 교차집계, 마지막은 초상. 근거: `LEGAL.md` 3.3 / 4.5 / 1.3

---

## 4. RLS — 반드시 켠다

**anon 키는 브라우저에 노출되는 것이 전제다.** 공개 페이지가 SSG 로 구워져 나가도, 키가 노출된 이상 누구든 REST API 를 직접 때릴 수 있다. **RLS 가 유일한 방어선이다.**

새 테이블을 만들 때마다 반드시 같이 쓴다:

```sql
alter table 새테이블 enable row level security;
create policy "..." on 새테이블 for select using (...);
```

### 현재 정책

| 테이블 | anon 권한 |
|--------|-----------|
| `creators` | `is_published = true` 인 행만 select |
| `places` | `is_published = true` 인 행만 select |
| `videos` | 공개된 크리에이터의 것만 select |
| `video_places` | 공개된 장소의 것만 select |
| `creator_cities` | `published_at is not null` 인 것만 select |
| `cities` | 전체 select (공개 정보) |
| `takedown_requests` | **insert 만** 가능, select 불가 |
| `search_misses` | 정책 없음 = anon 접근 불가 |

어드민은 `service_role` 키로 **RLS 를 전부 우회**하므로 별도 정책이 필요 없다.

### 삭제 요청이 오면

`is_published` 를 `false` 로 내리는 것만으로 **즉시 차단**된다 — RLS 가 걸러내므로 캐시된 정적 페이지만 재생성하면 끝. 채널 단위로 내리려면 `creators.is_published = false` 하나면 된다.

근거: 정보통신망법 제44조의3(임의의 임시조치) — 신고 없이도 선제 블라인드가 가능하다. 절차는 `LEGAL.md` 4.7.

---

## 5. 정기 배치 (미구현)

| 주기 | 작업 | 근거 |
|------|------|------|
| **월 1회 (필수)** | `api_fetched_at` 30일 경과 영상 메타 재조회 | YouTube API 정책 — 선택이 아님 |
| 월 1회 | `youtube_video_id` 유효성 확인 → 삭제·비공개 영상의 장소는 비공개 전환 | 출처 잃은 장소는 공개하지 않는다 |
| 분기 1회 | 장소 영업 상태 확인 → 폐업 표시 | 오정보 방지 (`LEGAL.md` 4.6) |
| 조각 공개 시 | `creators.place_count/city_count/video_count` 재계산 | 런타임 집계 금지(SSG 속도) |

30일 배치를 안 돌리면 **정책 위반 상태로 누적**된다. 조각이 늘수록 수동으로는 불가능하므로 초기에 자동화할 것 — `CONCEPT.md` 7.5 참조.

---

## 6. 마이그레이션 추가 규칙

1. `supabase/migrations/000N_이름.sql` 로 새 파일 생성 (번호는 순차)
2. **기존 파일을 수정하지 않는다** — 이미 적용된 것은 `_migrations` 에 기록돼 다시 안 돌아간다
3. `src/shared/api/database.types.ts` 를 같이 수정 (CLI 타입 생성 못 씀)
4. 새 테이블이면 **RLS 활성화 + 정책**을 같은 파일에 포함
5. `npm run db:migrate` 로 적용

---

## 7. 현재 상태

- [x] `0001_init.sql` 작성
- [x] **적용 완료** (2026-08-04) — 8개 테이블 + RLS 정책
- [x] `0002_naver_place_id.sql` 적용 — 지도앱 딥링크 3종(구글/카카오/네이버) 지원, `shared/lib/map-links.ts` 참조
- [x] RLS 동작 검증 (아래)
- [ ] 시드 데이터 (Batch 0: 채널 1 × 도시 1)
- [ ] 정기 배치 구현

### 검증한 것

실제로 행을 넣고 anon 키로 접근해서 확인했다 (테스트 데이터는 정리함):

| 검사 | 결과 |
|------|------|
| anon 이 `is_published=false` 행을 읽는가 | 안 읽힘 ✅ |
| `is_published=true` 로 바꾸면 읽히는가 | 읽힘 ✅ |
| anon 이 쓰기 가능한가 | 401 차단 ✅ |
| anon 이 삭제요청을 제출할 수 있는가 | 가능 ✅ |
| anon 이 삭제요청 목록을 읽는가 | 빈 배열 ✅ |

**`is_published` 를 내리면 anon 키로도 즉시 안 보인다**는 것이 실증됐다 — 삭제 요청 대응(`LEGAL.md` 4.7)의 핵심 동작이다.

> ℹ️ RLS 는 정책이 없으면 403 이 아니라 **빈 배열**을 반환한다. `takedown_requests` 조회가 200 으로 오는 것은 정상이며, 내용이 비어 있는지로 판단해야 한다.

### 프로젝트 정보

| 항목 | 값 |
|------|-----|
| 리전 | Southeast Asia (Singapore) |
| 연결 | Session pooler (`aws-0-ap-southeast-1.pooler.supabase.com:5432`) |

> 리전이 Seoul 이 아니라 Singapore 지만 **문제되지 않는다.** Tripin 은 공개 페이지를 SSG/ISR 로 굽기 때문에 DB 왕복이 빌드 타임에 일어난다. 런타임 지연이 사용자 체감에 거의 영향을 주지 않는다. 어드민만 조금 느릴 수 있다.
