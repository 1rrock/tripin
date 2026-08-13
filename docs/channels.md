# Tripin 등록 채널 목록 (Orca 자동 동기화용)

> **이 파일이 신작 감지 대상의 단일 소스다.**  
> 채널을 어드민에 추가한 뒤 **여기에도 한 줄 추가**한다.  
> Orca 자동화는 이 MD만 읽고 돌린다 (크론 없음).

업데이트: 2026-08-13

> ⚠️ `enabled` 는 **신작 자동수집 스위치**이지 공개 여부가 아니다. 표의 10채널은
> 2026-08-13 기준 전부 DB 에 있고 확정 장소 272곳이 공개돼 있다 — `no` 인 채널도
> 이미 공개 중일 수 있다. 공개 여부는 `/admin` 과 DB 가 정본이다.

## 규칙

| 항목 | 값 |
|------|-----|
| 대상 | 아래 표의 `enabled: yes` 만 |
| 크리에이터 생성 | **금지** — 이미 `/admin` 에 있는 slug 만 인제스트 |
| 장소 확정 | **금지** — `candidate` 까지만. 확정·요약은 사람 |
| 한 번에 처리 | 신작 후보 **최대 5편/채널**, 전체 **최대 15편/런** (넘으면 다음 런) |

## 채널 표

| enabled | slug | display_name | youtube_handle | youtube_channel_id | notes |
|---------|------|--------------|----------------|--------------------|-------|
| yes | chuseonghoon | 추성훈 ChooSungHoon | @Choosunghoon_ajossi | UCMDHzyo0wIUjKXho-icJDjw | 일본·여행 맛집 · **연예인 축 레퍼런스** |
| yes | kwaktube | 곽튜브 | @jbkwak | UClRNDVO8093rmRTtLe4GEPw | 세계여행·먹방 |
| no | fukuoka-ajo | 후쿠오카 아저씨 | @fukuoka-ajo | UC9C7wZ8AbeO7_W6vFKh3GJg | **공개 중** (확정 149곳, 최대 채널). `enabled: no` 는 신작 자동수집만 끈 것 |
| no | sungsikyung | 성시경 SUNG SI KYUNG | @sungsikyung | UCl23-Cci_SMqyGXE1T_LYUg | **연예인 축 1순위** · 먹을텐데 제목=상호 · 도쿄·부산 |
| no | bimirya | 비밀이야 bimirya | @bimirya | UCaKQ7_GT0k8u_sL0nE2tgkA | 흑백 관련 파인다이닝 · 지도링크 18/100 · 삿포로·도쿄·홍콩 |
| no | choi-kangrok | 최강록 Ultra Taste Diary | @ultratastediary | UC5-f4v2bWroSgTA-IBuXKMw | 흑백 심사·출연 · 삿포로·후쿠오카 미슐랭 투어 · 업로드 드묾 |
| no | italy-fabri | 이태리 파브리 Italy Fabri | @italyfabri | UCza_sEjIhb1yhvVZEdEl6gA | 흑백 출연 · 대만·도쿄·시장 맛집 편 선별 |
| no | tzuyang | 쯔양 tzuyang | @tzuyang6145 | UCfpaSruWW3S4dibonKXENjA | 먹방 셀럽 · 도시 시리즈 · 수동자막 96% · 국내 비중 큼 |
| no | kang-leo | 강레오 걍레오 | @justleo55 | UCTV5_Y5gbVua8PpbOsim9RQ | 흑백 출연 · 레시피 본진 · 맛집 편만 선별 |
| no | seungwoo-dad | 승우아빠 | @swab85 | UCgsffS7MfKL6YU3r_U3E-aA | 흑백 출연 · 최근 쇼츠 위주 · 맛집 롱폼 희소 |

## 필드 설명

- **slug** — DB `creators.slug` 와 동일. `insert-candidates` 의 `creatorSlug`
- **youtube_channel_id** — `UC…` (API·업로드 재생목록 조회용)
- **youtube_handle** — `@…` (사람이 볼 때·검색용)
- **enabled** — `yes` 만 자동 런 대상. 일시 중지는 `no`

## 채널 추가 시

1. 어드민에서 크리에이터 생성 (슬러그·색·이니셜)
2. 이 표에 행 추가, `enabled: yes`
3. (선택) 첫 배치는 수동 인제스트로 밀도 확보 후 자동 신작만 맡김
