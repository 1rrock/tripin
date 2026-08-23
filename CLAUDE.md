# Eatripin

여행 유튜브에서 본 가게를, 실제 지도의 상호로 찾아주는 웹 서비스.
Next.js 16 App Router + Supabase + Google Maps.

## 읽는 순서

1. `PRODUCT.md` — 제품 원칙·유저·브랜드 규칙. **여기가 판단 기준이다.**
2. `docs/HANDOFF.md` — 현재 상태, 그리고 **지뢰 목록**. 코드를 만지기 전에 §3 을 읽어라.
3. `ROADMAP.md` — 다음에 할 것.

`docs/RE-AUDIT-PROMPT.md` 는 새 세션에 전체 재점검을 시킬 때 쓰는 프롬프트다.

## 빠르게 알아야 할 것

- 로케일은 **URL 세그먼트**다. ko 는 접두사 없음, en 은 `/en/*`. 공개 트리에서
  `headers()`·`cookies()` 를 읽으면 정적화가 통째로 깨진다.
- `searchParams` 를 서버에서 읽으면 `revalidate` 를 더해도 ISR 이 안 된다.
- `loading.tsx` 가 있는 라우트에서 `notFound()`·`redirect()` 를 페이지에서 부르면
  상태 코드가 안 나간다. 존재 판정은 `layout.tsx` 에서. (HANDOFF §3-1)
- 캐시 항목은 2 MiB 를 넘으면 **조용히** 꺼진다. `[cachePublic]` 경고를 보라.
- 인제스트 스크립트는 공개 캐시를 안 비운다. 프로덕션은
  `vercel cache invalidate --tag public-data`.
- **지도는 자동화 브라우저로 검증할 수 없다**(WebGL 없음). 유저 확인을 받아라.

## 명령

```
npm run build      # 프로덕션 빌드 (상태 코드·정적화 판정은 dev 와 다르다)
npm run typecheck  # .next/**/validator.ts 에러는 가짜 — grep -v '^\.next/'
npm run lint
npm run db:migrate
```

## 봉인된 것

`shared/ui/frame.tsx` 의 `Chip`, `shared/ui/Button.tsx`, `shared/ui/EmptyState.tsx`.
인라인으로 알약·버튼·빈 화면을 다시 그리지 마라 — 그래서 규격이 9벌로 갈렸었다.

브랜드색 `--wax`(`#c9441a`)는 **워드마크·주 CTA·활성 표시에만**. 넓은 면 금지.
위험·파괴는 `--alert`(`#a4161a`).
