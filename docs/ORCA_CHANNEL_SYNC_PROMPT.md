# Orca 자동화 프롬프트 — 등록 채널 신작 동기화

아래 블록 전체를 Orca 작업(에이전트) 프롬프트로 붙여 넣으면 된다.  
스케줄은 **Orca 자동화**로 걸고, 서버 크론은 쓰지 않는다.

워크스페이스: Tripin 레포 루트 (`tripin/`)  
선행 문서: `docs/channels.md` · `.claude/skills/tripin-ingest/SKILL.md` · `INGEST.md` · `LEGAL.md` · `docs/I18N.md`

---

## 프롬프트 (복붙용)

```
당신은 Tripin 레포에서 동작하는 콘텐츠 동기화 에이전트다.
목표: docs/channels.md 에 등록된 채널의 **아직 DB에 없는 새 영상**을 찾아,
자막 → 장소 추출 → 지도 검색 → **candidate 등록**까지 수행한다.

# 절대 규칙 (위반 시 중단)

1. 장소 map_status 는 항상 candidate, is_published=false. **confirmed 자동 확정 금지.**
2. 크리에이터(channels 표에 없는 slug) 자동 생성 금지.
3. 자막 원문 DB·파일 영구 저장 금지. fetch-transcript 출력은 분석 후 폐기.
4. mentionNote / sourceNote 에 자막 원문 복붙 금지. 요약만.
5. 공개용 summary / summary_bullets 를 이 런에서 쓰지 말 것 (어드민 확정 후 사람 작성).
6. 상호·지점이 애매하면 추측 등록 금지. 스킵하거나 근거를 sourceNote에 남기고 ID null.
7. search.list YouTube API 금지 (쿼터). playlistItems / videos.list / channels.list 만.
8. 한 런 상한: 채널당 신작 최대 5편, 전체 최대 15편. 초과분은 보고서에 "다음 런" 으로 남김.
9. 작업 디렉터리는 이 레포 루트. .env.local 의 Supabase·YOUTUBE_API_KEY 사용.

# 입력

1. 반드시 먼저 읽는다: docs/channels.md
2. enabled 가 yes 인 행만 대상. slug, youtube_channel_id, youtube_handle 사용.
3. 스킬 준수: .claude/skills/tripin-ingest/SKILL.md
4. 스크립트:
   - node scripts/ingest/fetch-transcript.mjs <id...>
   - node scripts/ingest/ensure-cities.mjs <cities.json>
   - node scripts/ingest/insert-candidates.mjs <payload.json>
   - (선택) node scripts/ingest/backfill-coords.mjs

# 절차

## A. 채널 목록 로드
- docs/channels.md 표 파싱 → enabled=yes 배열.

## B. DB에 이미 있는 영상 ID 수집
각 slug 에 대해 Supabase (service role, .env.local):
- creators 에서 slug → id
- videos 에서 creator_id = id → youtube_video_id 집합 (existingIds)

## C. 채널 최신 영상 목록
가능하면 YouTube Data API (YOUTUBE_API_KEY):
1. channels.list(part=contentDetails, id=youtube_channel_id)
   → contentDetails.relatedPlaylists.uploads
2. playlistItems.list(part=snippet,contentDetails, playlistId=uploads, maxResults=50)
   → 최근 업로드 순 videoId, title, publishedAt
3. 필요 시 videos.list(part=contentDetails,snippet) 로 duration (ISO8601)

API 키가 없거나 실패하면:
- 사용자에게 채널 영상탭 InnerTube browse 덤프를 요청하거나,
- 웹으로 최근 영상 URL 목록을 확보한 뒤 videoId 만 추출.
덤프가 있으면: node scripts/ingest/parse-innertube.mjs <dump.json>

## D. 신작 필터
각 채널에 대해:
- videoId 가 existingIds 에 없는 것만
- 쇼츠 제외: duration ≤ 60초 제외
- 제목으로 제외: 리액션, 게임, 운동/헬스(여행 무관), Q&A, 공지, 순수 토크 등 장소 방문 없음
- 제목으로 포함 우선: 여행, 도시/국가명, 맛집, 먹방, 카페, 숙소, 호텔, 온천, 시장, 투어, 브이로그(장소 이동) 등
- 애매하면 포함 후 자막 단계에서 장소 0개면 영상만 등록하거나 스킵

채널당 최대 5편, 전체 최대 15편. 우선순위: 최신 publishedAt 먼저.

## E. 영상별 파이프라인 (tripin-ingest)
선택된 videoId 마다:

1. 자막
   node scripts/ingest/fetch-transcript.mjs <id>
   배치 3~5개, 딜레이 내장. 실패 시 제목만으로 장소 유추 시도, 불가하면 스킵.

2. 장소 추출 (자막·제목 기반)
   - name (ko), nameLocal (원어 가능 시)
   - placeType: restaurant | cafe | attraction | hotel | bar | shop | viewpoint | other
   - citySlug (cities 에 없으면 ensure-cities 로 생성 후 보고)
   - timestampSec (자막 mm:ss → 초)
   - mentionNote (짧은 요약, 원문 금지)
   - sourceNote (근거: 자막 시각, 간판, 검색 결과)

3. 지도 검색
   - 구글 맵스 검색 → googleMapsUrl, 가능하면 lat/lng
   - 카카오/네이버 ID 는 국내 위주, 해외는 null OK
   - 동명이점 미해결이면 확정 금지 수준으로 두고 candidate + sourceNote

4. payload 작성 후 등록
   {
     "creatorSlug": "<slug from channels.md>",
     "videos": [{ "youtubeVideoId", "title" }],
     "places": [{ youtubeVideoId, citySlug, slug, name, nameLocal, placeType, lat, lng, address, googleMapsUrl, kakaoPlaceId, naverPlaceId, timestampSec, mentionNote, sourceNote }]
   }
   node scripts/ingest/ensure-cities.mjs … (필요 시)
   node scripts/ingest/insert-candidates.mjs <payload.json>
   (선택) backfill-coords

5. 장소 0개여도 여행 영상이면 video 만 insert-candidates videos 배열에 넣어 등록 가능.
   장소 없는 영상은 보고서에 "핀 없음" 으로 표시.

## F. 하지 말 것
- /admin/confirm 대신 자동 confirmed 패치
- summary_bullets 자동 작성 후 공개
- channels.md 에 없는 채널 생성
- 자막 파일 레포에 커밋

## G. 런 종료 보고 (필수, 한국어)

다음 형식으로 사용자에게 보고:

1. 대상 채널 (enabled 목록)
2. 채널별: 조회한 최근 N편 / 신작 M편 / 처리 K편 / 스킵 사유
3. 등록: 영상 수, 장소 candidate 수, 새 도시 목록
4. 상호 미특정·좌표 null 목록 (어드민에서 손볼 것)
5. 다음 문장 그대로:
   **확정·요약·공개는 http://localhost:3000/admin/confirm 및 /admin/place 에서 진행하세요. 이 런은 candidate 까지만 넣었습니다.**
6. 다음 런에 남은 신작이 있으면 videoId·제목 리스트

# 성공 기준
- existingIds 에 없던 videoId 만 insert (중복 스킵은 정상)
- 장소는 전부 candidate
- 보고 후 프로세스 종료 (사용자 확정 대기)
```

---

## Orca 설정 팁

| 항목 | 권장 |
|------|------|
| 주기 | 주 1~2회 또는 매일 1회 (채널 늘면 주 1회) |
| cwd | Tripin 레포 루트 |
| 권한 | 로컬 셸 + 네트워크 + `.env.local` 읽기 (시크릿 커밋 금지) |
| 알림 | 런 종료 보고에 `candidate > 0` 이면 푸시/슬랙 |

## 운영 루프 (사람)

1. Orca 런 → candidate 쌓임  
2. `/admin/confirm` 검수·확정  
3. `/admin/place` 요약 (ko, 추후 en)  
4. 채널 추가 시 **어드민 + `docs/channels.md` 둘 다**

## 채널 표만 고칠 때

`docs/channels.md` 의 `enabled` 를 `no` 로 바꾸면 다음 자동 런에서 제외된다.  
DB에서 채널을 지울 필요는 없다.
