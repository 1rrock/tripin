# 마이그레이션

`scripts/db-run.mjs` 가 이 디렉터리를 읽는다.

```
npm run db:migrate                       # 미적용 파일 전부, 파일명 오름차순
npm run db:run -- supabase/migrations/0001_init.sql   # 한 파일만 (이력 무시)
```

## 규칙

- **이미 적용된 파일은 고치지 않는다.** 새 파일로만 바꾼다.
- **파일 이름을 바꾸지 않는다.** 적용 이력 테이블 `_migrations` 가 **basename** 을
  키로 쓴다(`db-run.mjs:136`). 이름을 바꾸면 그 파일이 "미적용"으로 되살아나
  **다시 돈다.**
- 순서는 `readdirSync(...).sort()` — 즉 번호가 아니라 **파일명 알파벳 정렬**이다.

## ⚠️ 번호 중복: `0002` 가 둘이다

```
0002_confirm_all_candidates.sql   ← 알파벳순으로 이쪽이 먼저 (c < n)
0002_naver_place_id.sql
```

지금 결과는 맞다. 두 파일 사이에 의존이 없고(하나는 `places` 행의 `map_status`
일괄 승격, 하나는 `naver_place_id` 컬럼 추가), 실제 적용 순서도 위와 같다.

**고치지 않는 이유는 위 "파일 이름을 바꾸지 않는다" 그대로다.** 번호를 정리하려고
한쪽을 `0002a`·`0018` 따위로 바꾸면 `_migrations` 에 없는 이름이 되어 라이브에서
다시 적용된다. `0002_confirm_all_candidates.sql` 은 `update places set map_status =
'confirmed'` 를 통째로 다시 도는 파일이라 재실행이 무해하지 않다.

**다음 사람에게:** 번호가 겹치면 알파벳 정렬이 조용히 순서를 정한다. 새 파일은
항상 **현재 최대 번호 + 1** 로 붙이고, 붙이기 전에 이 디렉터리를 한 번 훑어라.

## 파일별 메모

| 파일 | 메모 |
|---|---|
| `0002_confirm_all_candidates.sql` | 번호 중복(위). 검수 없는 일괄 확정 — 파일 상단의 재검수 목록을 읽어라 |
| `0002_naver_place_id.sql` | 번호 중복(위) |
| `0018_rls_baseline.sql` | `ensure_rls` 이벤트 트리거 정의 + `_migrations`·`_bulk_confirm_20260805` RLS. 멱등 |
| `0019_mention_place_published.sql` | 언급 정책이 대상 장소의 공개 여부를 보게 함 |
| `0020_drop_bulk_confirm_backup.sql` | **되돌릴 수 없다.** 사람이 확인하고 적용할 것 — 파일 상단 참조 |
