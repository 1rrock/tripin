---
name: tripin-ingest
description: 유튜브 채널 덤프/영상 링크를 받아 자막 추출 → 장소 분석 → 지도 등록 검색 → DB 후보 등록까지 자동화. 사용자가 InnerTube JSON 덤프를 붙여넣거나 영상 URL을 주면 실행.
---

# Tripin 인제스트 파이프라인

유저가 주는 입력(채널 페이지 JSON 덤프, 영상 URL 목록, 유튜브 링크)을 받아
**영상 등록 → 자막 추출 → 장소 유추 → 상업 등록(구글/카카오/네이버) 검색 → candidate 등록**까지 수행한다.
**확정(confirmed)은 절대 자동으로 하지 않는다** — 유저가 /admin/confirm 에서 직접 한다.

## 입력 형태별 처리

| 입력 | 처리 |
|------|------|
| InnerTube JSON 덤프 (채널 페이지 응답 붙여넣기) | 스크래치패드에 저장 → `parse-innertube.mjs` 로 영상 목록 추출 |
| 영상 URL 1개 이상 | videoId 직접 추출 (`v=` 파라미터 또는 youtu.be 경로) |
| "이 채널 해줘" + 채널명만 | 유저에게 덤프 붙여넣기 요청 (채널 영상탭 → 개발자도구 Network → browse 응답 복사) |

## 파이프라인 단계

### 1. 영상 목록 확보
덤프가 크면 파일로 저장 후:
```bash
node scripts/ingest/parse-innertube.mjs <dump.json>   # → [{youtubeVideoId, title, durationText}]
```

### 2. 필터링 (Claude 판단)
- 제목으로 **여행/맛집/장소 방문 영상만** 선별 (운동, 리액션, 인터뷰 등 제외)
- durationText 로 쇼츠(≤60초) 제외
- 애매하면 포함하고 자막 분석 단계에서 걸러낸다

### 3. 자막 추출 (로컬 전용)
```bash
node scripts/ingest/fetch-transcript.mjs <id1> <id2> ...   # 요청 간 2.5초 딜레이 내장
```
- 한 번에 3~5개씩 배치로 실행 (출력이 크므로)
- **자막 원문은 파일/DB에 저장 금지** (LEGAL.md) — 분석 후 버린다
- 자막 없는 영상은 실패 메시지만 나옴 → 제목만으로 장소를 유추하거나 스킵

### 4. 장소 분석 (Claude가 자막을 읽고)
각 영상에서 추출할 것:
- **장소명** (한국어 표기 + 현지어 표기)
- **장소 유형**: restaurant / cafe / bar / attraction / activity / shop / stay / etc
- **도시** (citySlug — cities 테이블에 있어야 함, 없으면 어드민에서 먼저 생성 안내)
- **언급 타임스탬프** (자막 라인의 mm:ss → 초로 변환)
- **언급 내용 요약** (mentionNote — 주문 메뉴, 반응 등 짧게. 자막 원문 복사 금지, 요약만)

### 5. 상업 등록 검색 (WebSearch / WebFetch)
장소마다 3개 지도 서비스에서 등록 여부 검색:
- **구글**: `"<현지어명>" <도시> google maps` 검색 → maps.google.com/maps.app.goo.gl 링크 확보 (`googleMapsUrl`)
- **카카오**: `place.map.kakao.com <장소명>` 검색 → URL 의 숫자 ID (`kakaoPlaceId`)
- **네이버**: `map.naver.com <장소명>` 검색 → `/place/{id}` 또는 `/entry/place/{id}` 의 숫자 ID (`naverPlaceId`)
- 좌표(lat/lng)는 검색 결과·구글 링크에서 확보되면 넣고, 아니면 null (확정 단계에서 유저가 입력)
- **동명이점 주의**: 지점명까지 확인해서 sourceNote 에 근거 기록 (예: "영상 12:40 간판 + 구글 리뷰 사진 대조")
- 못 찾으면 ID 필드 전부 null → candidate 로만 등록 (유저가 직접 찾아 입력)

### 6. 페이로드 작성 + 등록
스크래치패드에 payload JSON 작성 (형식은 `scripts/ingest/insert-candidates.mjs` 상단 주석 참조):
```bash
# 새 도시가 필요하면 먼저 (형식: scripts/ingest/ensure-cities.mjs 상단 주석)
node scripts/ingest/ensure-cities.mjs <cities.json>
node scripts/ingest/insert-candidates.mjs <payload.json>
```
- 영상: youtube_video_id 중복은 자동 스킵 (재실행 안전)
- 장소: 전부 `map_status='candidate'`, `is_published=false`
- 도시는 ensure-cities 로 생성 가능 (사실 정보라 자동 OK — 생성 내역은 유저에게 보고)
- 크리에이터는 자동 생성 금지 — 유저가 어드민에서 생성 (색상·이니셜 등 유저 결정)

### 7. 보고
- 등록된 영상/장소 후보 개수
- 지도 등록을 찾은 곳 vs 못 찾은 곳 구분
- 마무리 멘트: **"확정은 http://localhost:3000/admin/confirm 에서 확인 후 진행하세요"**

## 규칙 (위반 금지)

1. 자막 추출은 로컬에서만, 요청 간 딜레이 유지, 원문 저장 금지
2. 장소 자동 확정 금지 — candidate 까지만
3. 자막 원문을 DB·파일·mentionNote 에 복사 금지 (요약만)
   - mentionNote 는 자막 파생물이므로 **어드민 확정 근거 참고용으로만** 쓴다.
     공개 summary/summary_bullets 로 복사 금지 — 공개 요약은 CONCEPT.md 7.3 템플릿으로 새로 쓴다 (YouTube 정책 III.G.1.d 독립적 가치 요건)
4. 크리에이터 자동 생성 금지 — 유저가 어드민에서 생성 (슬러그·색상·초성 등 유저 결정 사항). 도시는 ensure-cities 로 생성하되 내역 보고
5. 대량 배치(20개 이상 영상)는 유저에게 분할 실행 여부 확인
