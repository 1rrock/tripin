# Tripin 핸드오프 (2026-08-07)

> 브랜치 `redesign-world-v2` 의 현재 상태. 새 세션은 이 문서부터 읽으면 된다.
> 선행: `PRODUCT.md`(제품 진실) · `LEGAL.md`(약관·법) · `CONCEPT.md`(화면 기획) · `INGEST.md`(수집)
> ⚠️ `DESIGN.md` 는 **아직 옛 월드를 기술한다** — §6 참조. 믿지 말 것.

---

## 0. 30초 요약

- 시각 월드를 **두 번** 갈아엎었고, 지금은 세 번째인 **콘택트 시트(다크)** 다. 공개 화면 전부 이 월드로 옮겨졌다.
- 진입점을 3축으로 열었다: **지역 / 채널 / 지도**. 도시 교차 페이지(`/city/[city]`)가 새로 생겼다.
- 채널명·프로필 사진이 실제 유튜브 값으로 들어갔다(마이그레이션 `0004`).
- 30일 갱신 배치는 **코드만 있고 안 돈다** — `YOUTUBE_API_KEY` 가 없다.
- 지도 스타일은 Cloud 에 올렸는데 **아직 화면에 안 먹었다** — POI 아이콘이 그대로 보인다.
- 세션 인계가 자동화됐다 — `CLAUDE.md`(새로 만듦) + `/handoff` 스킬 + auto memory. §8 참조.

---

## 1. 왜 월드를 두 번이나 갈아엎었나 — 이게 제일 중요하다

두 번 다 같은 이유로 실패했다. **재료 없이 월드를 골랐다.**

이 제품이 가진 시각 재료를 실제로 세어 보면:

| | 상태 |
|---|---|
| `creators.avatar_url` | 컬럼 자체가 없었다 (초상 리스크 회피, LEGAL 1.3) |
| `places` 사진 | 컬럼 없음 |
| `videos.thumbnail_url` | 컬럼은 있는데 **전 레코드 NULL** |

이미지가 0개라 화면을 채울 게 텍스트와 픽토그램뿐이었고, 뭘 씌워도 "90년대 HTML 표"가 됐다.
색이나 보더의 문제가 아니었다. **Figma 컴프를 7번 돌려도 안 나왔고, 실데이터를 코드에 띄우고서야 보였다.**

해결: 썸네일 URL 을 `youtube_video_id` 에서 유도한다(`shared/lib/youtube.ts`).
API 호출도 저장도 없어서 30일 보관 제한을 애초에 건드리지 않는다. 수집된 영상 전부 `maxresdefault` 존재 확인.

**교훈: 새 화면을 설계하기 전에 그 화면에 실제로 들어갈 데이터를 먼저 세어라.**

---

## 2. 지금 월드 — 콘택트 시트

암실 작업대 위의 **콘택트 시트**. 한 롤에서 뽑은 프레임을 검은 인화지에 늘어놓고,
흰 인덱스로 번호를 매기고, 쓸 만한 컷에 왁스 연필로 표시하는 물건.
→ 프레임 = 유튜브 썸네일, 롤 = 채널, 표시 = 내가 갈 곳.

**방향 계약**은 `src/app/layout.tsx` 의 HTML 주석에 있다(빌드 산출물까지 살아남는다). 편집 전에 읽을 것.

### 절대 하지 않는 것

- **발광** — box-shadow 로 색 번짐, 네온 테두리. 이 어둠은 네온이 아니라 은염이다.
- **왁스(`--wax`)를 버튼 배경으로** — 왁스는 *표시*다. 링·밑줄·활성 인덱스에만.
  면적을 먹기 시작하면 "다크 + 네온 액센트"라는 AI 기본값으로 즉시 떨어진다.
- **라이트 테마** — 다크 하나로 커밋했다. `ThemeToggle` 은 삭제됐다.
  밝은 면은 지도(`--lightbox`) 하나뿐이고 그건 테마가 아니라 월드의 일부다.

### 파일

| 파일 | 역할 |
|---|---|
| `src/app/globals.css` | 토큰 전부. 컴포넌트에서 px 를 직접 쓰지 않는다 |
| `src/shared/ui/frame.tsx` | 프리미티브 — Icon(스트로크 세트), Frame, Avatar, FrameNo, Act, Chip, Rule, Index, Meta |
| `src/shared/ui/VideoSheet.tsx` | 시트 한 칸(썸네일 + 캡션). 홈·허브 공용 |
| `src/shared/ui/PlaceSheet.tsx` | 핀 상세 (모바일 하단 / 데스크톱 지도 안쪽) |
| `src/shared/ui/Thumb.tsx` | 유튜브 썸네일 (maxres → hq 폴백) |
| `src/shared/ui/MapView.tsx` | 지도 = 라이트박스 |

`src/shared/ui/sign.tsx`(구 월드)는 **삭제됐다.** 레거시 토큰 시임도 없다.

### 캡션 위계 — 실데이터로 뒤집은 것

처음엔 영상 제목이 헤드라인이었는데 틀렸다. 방문자의 질문은 "그 가게 어디야"이고 답은 **상호명**이다.
게다가 썸네일에 이미 큰 글자가 박혀 있어 제목을 크게 쓰면 같은 말이 두 번 나온다.

```
[썸네일]
추성훈 ChooSungHoon · 도쿄     ← 출처
📍 돈카츠 마루시치 …            ← 답 (헤드라인)
맛잘알 워뇨도 먹은 도쿄 1등…     ← 출처 영상 (원본 그대로)
```

영상 제목은 **유튜브 원본 전문**을 쓴다. 작게 놓아도 "visible" 요건은 충족하고,
요약·의역했다면 그때 §III.E.3 위반이다.

---

## 3. 화면 지도

| 라우트 | 상태 | 비고 |
|---|---|---|
| `/` | ✅ | 영상 콘택트 시트. 상호명까지 검색 |
| `/city` | ✅ | 지역 목록 |
| `/city/[city]` | ✅ | **도시 교차** — 그 도시에 간 모든 채널. `CONCEPT.md 4.5` |
| `/channels` | ✅ | 채널 목록 |
| `/map` | ✅ | 나라별로 끊어 도시 고르기 |
| `/c/[creator]` | ✅ | 채널 허브 (도시 + 영상) |
| `/c/[creator]/[city]` | ✅ | 조각 — 핵심 페이지 |
| `/c/[creator]/v/[videoId]` | ✅ | 타임라인. noindex |
| `/admin/*` | 손대지 않음 | Tailwind neutral 팔레트, 우리 토큰 밖 |

**전역 메뉴**: 모바일 햄버거 / 데스크톱 헤더 인라인 (`src/app/(public)/Nav.tsx`).
사이드바를 안 쓴 이유는 항목이 3개뿐이고 이 월드의 주인공이 프레임과 지도라서다.

**선택의 두 갈래** (조각·도시 지도 공통):
- **핀** 클릭 → 상세 시트 (지도엔 이름 말고 들어갈 자리가 없다)
- **목록 행** 클릭 → 지도만 이동 (행 자체가 이미 상세라 겹쳐 띄우지 않는다)

---

## 4. 열려 있는 것 — 우선순위 순

### 🔴 1. 지도 스타일이 화면에 안 먹었다

`NEXT_PUBLIC_GOOGLE_MAPS_ID` 는 설정됐고 요청에 실려 나가는 것도 확인했다
(`StaticMapService...&7s<mapId>&...`). 그런데 **구글 기본 POI 아이콘이 그대로 보인다.**

의심 순서:
1. Map ID 는 맞는데 스타일이 **연결 안 됨** (콘솔 Map Management 에서 스타일을 고르는 단계).
2. 넣은 값이 Map ID 가 아니라 **Style ID** 일 수 있다. 둘은 다른 값이고 콘솔 메뉴도 다르다
   (Map Styles ↔ **Map Management**). 사용자가 처음 준 값은 명시적으로 styleId 였고,
   두 번째 값도 같은 24자 hex 형태였다.
3. **미확인 — 래스터 폴백에서는 Cloud 스타일이 안 먹을 수 있다.**
   사용자 브라우저와 자동화 브라우저 **둘 다 WebGL 이 없어서**(§5-2) 지도가 벡터가 아니라
   래스터/정적 경로로 돈다. 요청은 `StaticMapService.GetMapImage` 였다.
   Cloud 스타일이 이 경로에도 적용되는지 확인하지 못했다. WebGL 되는 기기에서 한 번 열어 보면
   1·2번인지 3번인지 바로 갈린다 — **이걸 먼저 하라.** 콘솔을 다시 뒤지기보다 싸다.

명세는 `src/shared/config/lightbox-map-style.json` 이고, 콘솔 Import JSON 에 그대로 붙여넣는다.
절차는 `.env.example` 의 `NEXT_PUBLIC_GOOGLE_MAPS_ID` 주석에 있다.

> ⚠️ 코드로는 못 푼다. `AdvancedMarkerElement` 가 mapId 를 요구하고, mapId 가 있으면 구글이
> 인라인 `styles` 를 무시한다. `DEMO_MAP_ID` 도 mapId 라서 로컬에서조차 안 먹는다.
> 예전 코드가 "로컬 한정 인라인 스타일" 분기를 갖고 있었는데 **한 번도 동작한 적이 없었다.**

### 🔴 2. 30일 갱신 배치가 안 돈다 (약관 위반 상태)

`/api/cron/refresh-youtube-meta` 는 구현돼 있다. 없는 것:
- `YOUTUBE_API_KEY` (`.env.local` 에 빈 값)
- 스케줄러 연결 (`vercel.json` 에 크론 있음. Vercel 이 아니면 GitHub Actions·pg_cron)

대상: `videos.title/published_at/duration_sec` + `creators.display_name/avatar_url`.
임계값 25일(30일 한도에 5일 여유). `?purge=1` 일 때만 사라진 영상을 삭제한다.

`LEGAL.md` 위험 #2 가 🟡 "구현됨, 미가동".

### 🟡 3. 확장성 — 채널 20~30개면 두 화면이 깨진다

측정 근거: 홈 HTML 고정 103KB + **영상당 ~2.2KB**(dev). `placeNames` 가 영상 수만큼 직렬화된다.

| 문제 | 언제 |
|---|---|
| **로더가 테이블 전체를 매번 읽는다** (`cities.ts` 의 `loadGraph`) — PostgREST 행 상한에 걸리면 **조용히 잘린다** | **지금 고치는 게 싸다.** 모든 화면이 이 위에 얹혀 있다 |
| 홈에 페이지네이션 없음 — 480편이면 ~1MB + `<img>` 480개 | 채널 5개 |
| 지도 마커 클러스터링 없음 — 8개에서도 5·6번이 겹친다 | 도시당 30곳 |
| 장소 상세 페이지 부재 — "이 가게에 다녀간 유튜버 7명"을 보여줄 자리가 없다 | 채널 10개 |

장소 페이지는 **출처 2개 이상인 장소만** 만들어야 한다. 1개짜리는 얇은 페이지고,
조각 페이지가 이미 그 상호명 질의를 먹고 있다(영상 페이지를 noindex 로 만든 것과 같은 이유).
데이터는 준비돼 있다 — `places.slug` 가 있고 `loadCityDetail` 이 이미 장소별 `sources[]` 를 모은다.

### 🟡 4. `DESIGN.md` 가 낡았다

아직 **공항 사인 시스템**(삭제된 월드)을 기술한다.
impeccable 마감 절차로 다시 써야 한다: `impeccable-finish-reviewer` → `impeccable-documenter`.
`new-work.md` §5 에 따라 DESIGN.md 는 **빌드된 결과물로부터** 쓴다(의도가 아니라).

### 🟢 5. 배포 전 반드시

- `MIN_CONFIRMED_PINS` 가 **0** 이다(게이트 꺼짐). `PRODUCTION_MIN_CONFIRMED_PINS = 8` 로 되돌릴 것.
- Maps 키에 콘솔 제한(API 제한 = Maps JavaScript API 만 / HTTP 리퍼러) 걸렸는지 확인.

---

## 5. 되풀이하면 안 되는 실수 (전부 이번에 실제로 한 것)

1. **DOM 이 정상인데 화면이 검다** → 페인트/합성 버그를 의심하라.
   전체화면 `fixed` + `mix-blend-mode` 레이어와 `filter: blur()` 애니메이션이 겹쳐 영역이
   통째로 검게 래스터됐다. 둘 다 제거. `globals.css` 에 경고를 박아 뒀다.
2. **라이브러리가 이미 우아하게 폴백하는데 앞에서 막지 마라.**
   WebGL 없으면 지도가 안 뜬다고 보고 게이트를 세웠다가 **잘 되던 지도를 막았다**(revert `8f65f44`).
   Google Maps JS 는 WebGL 이 없으면 스스로 래스터로 내려간다.
   덤으로 알게 된 사실: **사용자 브라우저에도 WebGL 이 없다.** 자동화 환경만의 문제가 아니다.
   즉 지금 이 지도는 양쪽 다 래스터로 돌고 있고, 그게 §4-1 의 세 번째 가설이다.
3. **`.index` 에 `text-transform: uppercase` 를 넣지 마라.**
   라벨용으로 넣었는데 채널명·도시명에도 붙는 클래스라 `ChooSungHoon` → `CHOOSUNGHOON` 이 됐다.
   한글은 영향이 없어 라틴 이름이 들어오고서야 드러났다.
4. **한국어 조사를 이름 뒤에 직접 붙이지 마라.** `{name}가` → 이름이 라틴이면 무너진다. `의` 는 안전하다.
5. **헤드리스 캡처를 믿지 마라.** 이 머신에서 우측 ~8% 가 잘린다. 레이아웃 판단은 **DOM 실측**으로 하라
   (`getBoundingClientRect`). 잘린 캡처를 보고 없는 버그를 두 번 쫓았다.
6. **`perl -pi -e` 로 JSX 를 고쳤으면 `npx prettier --write` 를 돌려라.** 들여쓰기가 깨진다.
7. **Tailwind v4 는 `px-(--gutter)`** 다. v3 의 `px-[--gutter]` 는 조용히 무시된다(패딩이 0 이 된다).

---

## 6. 검증

```bash
npx tsc --noEmit && npx eslint src --max-warnings=0 && npm run build

# 라우트 스모크
for p in / /city /city/tokyo /channels /map /c/chuseonghoon /c/chuseonghoon/tokyo; do
  curl -s -o /dev/null -w "$p %{http_code}\n" "http://localhost:3000$p"; done

# 방향 계약이 빌드에 살아있는지
grep -rl "콘택트 시트(다크 시네마틱 계열)" .next/server
```

지도는 **브라우저에서 직접** 봐야 한다. 이 세션의 자동화 브라우저는 WebGL 이 없어
지도가 항상 실패 상태로 나왔다 — 앱 문제가 아니다.

---

## 7. 다음 사람이 먼저 할 일

1. **WebGL 되는 기기에서 지도를 한 번 열어라** (§4-1). 스타일이 나오면 래스터 폴백 문제였고,
   그대로 POI 가 보이면 Map ID/연결 문제다. 콘솔을 뒤지기 전에 이걸 먼저 하는 게 싸다.
2. 로더 정리 — `cities.ts` 의 `loadGraph` 에 city/creator 필터를 SQL 로 내리기 (§4-3)
3. `DESIGN.md` 마감 절차 (§4-4)

> 이전 핸드오프 `docs/HANDOFF-REDESIGN.md` 는 **삭제됐다.** 거기 기술된 공항 사인 월드는
> 더 이상 코드에 없어서, 남겨 두면 다음 사람을 오도한다. 필요하면 git 이력에 있다.

---

## 8. 세션 인계 — 이제 손으로 복붙하지 않는다

이 프로젝트에는 원래 `CLAUDE.md` 가 **없었다.** 전역 `~/.claude/CLAUDE.md` 는 통째로 다른
프로젝트(OptiSearch PayApp) 내용이라, tripin 세션마다 무관한 결제 지침이 로드되고 이 프로젝트
정보는 0이었다. 매번 핸드오프를 손으로 복붙하게 된 원인이 그것이다. 셋 다 채웠다:

| | 무엇 | 언제 로드 |
|---|---|---|
| `CLAUDE.md` (프로젝트 루트) | "이 문서부터 읽어라" + 자주 틀리는 것 + 법적 제약 | 매 세션 + **압축 후 재주입** |
| `.claude/skills/handoff/SKILL.md` | `/handoff` — 이 문서를 갱신하는 절차 | 부를 때만 |
| `~/.claude/projects/<project>/memory/` | auto memory. 리포에 없는 것만(작업 방식·환경 함정) | 매 세션 (MEMORY.md 첫 200줄) |

**압축 후에 살아남는 것**은 프로젝트 루트 `CLAUDE.md` 와 스킬 본문뿐이다.
하위 디렉터리 `CLAUDE.md`, `paths:` 스코프 룰, **대화로만 준 지시**는 안 남는다.
→ 다음 세션이 알아야 할 것은 대화가 아니라 **이 문서나 `CLAUDE.md` 에 적어라.**

쓸 만한 명령:

```
/handoff              이 문서 갱신 (컨텍스트 차기 전)
/compact <지시>       예: /compact 지도 스타일과 로더 위주로
/autocompact 500k     자동 압축 임계값 조정
/context              지금 무엇이 로드됐는지
/memory               메모리 파일 열람·편집
```

세션 재개: `claude -c` (최근) / `claude -r` (골라서).
