# Tripin

여행 유튜버가 다녀간 장소를 지도로 정리하는 비공식 디렉터리. Next.js 16 (App Router) + Supabase + Tailwind v4.

## 세션 시작 시

**`docs/HANDOFF.md` 를 먼저 읽어라.** 현재 상태·열린 블로커·되풀이하면 안 되는 실수가 거기 있다.

문서 역할:

| 문서 | 무엇 |
|---|---|
| `docs/HANDOFF.md` | **현재 상태.** 여기부터 |
| `PRODUCT.md` | 제품 진실·원칙 |
| `LEGAL.md` | 약관·법. 설계를 실제로 제약한다 |
| `CONCEPT.md` | 화면 기획 |
| `INGEST.md` | 수집 파이프라인·쿼터 |
| `docs/I18N.md` | **ko/en 공개 화면.** 새 UI·링크·문구는 여기 규칙 필수 |
| `docs/channels.md` | **등록 채널 목록** — Orca 신작 동기화 대상 |
| `docs/ORCA_CHANNEL_SYNC_PROMPT.md` | Orca 자동화 프롬프트 (신작 → candidate) |
| `DESIGN.md` | ⚠️ **낡음** — 삭제된 옛 월드를 기술한다. 믿지 말 것 |

## 이 프로젝트에서 자주 틀리는 것

- **Tailwind v4 다.** CSS 변수는 `px-(--gutter)`. v3 의 `px-[--gutter]` 는 **조용히 무시된다.**
- **디자인 토큰은 `src/app/globals.css` 에만.** 컴포넌트에서 px·hex 를 직접 쓰지 않는다.
- **화면 설계 전에 데이터 행 수를 세라.** 이걸 안 해서 시각 월드를 두 번 갈아엎었다.
- **Figma 컴프로 방향을 묻지 마라.** 실데이터로 화면 하나를 구현해 스크린샷으로 물어라.
- **지도는 자동화로 검증할 수 없다** — 이 환경의 브라우저에 WebGL 이 없어 항상 실패로 보인다.
  유저에게 스크린샷을 요청하라.
- **레이아웃 판단은 스크린샷이 아니라 DOM 실측으로.** 헤드리스 캡처가 우측을 잘라낸다.
- **공개 UI 는 ko/en.** 한글 하드코딩·`href="/city"` 고정 금지. 규칙은 `docs/I18N.md`.
  언어 전환은 `<a>` 풀 로드. 클라이언트에서 `locale.ts`(headers) import 금지 → `paths.ts` 사용.

## 법·약관 (설계를 바꾸는 제약)

- 영상 **제목·썸네일을 변형하지 마라** (YouTube API §III.E.3). 요약·의역·크롭 금지.
- 영상 썸네일은 저장하지 않는다 — `youtube_video_id` 에서 URL 을 유도한다(`shared/lib/youtube.ts`).
- 조회수·구독자수는 **저장도 표시도 하지 않는다** (§III.E.2).
- 유튜브로 돌아가는 링크를 가리거나 없애지 마라.
- 자세한 근거와 나머지 제약은 `LEGAL.md`.

## 검증

```bash
npx tsc --noEmit && npx eslint src --max-warnings=0 && npm run build
```

`--max-warnings=0` 이다. 경고도 실패다.
