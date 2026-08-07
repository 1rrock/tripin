/**
 * 유튜브 썸네일 URL — DB 없이 영상 ID 에서 유도한다.
 *
 * `videos.thumbnail_url` 컬럼은 존재하지만 **전 레코드 NULL** 이다(수집 파이프라인이
 * 한 번도 채우지 않았다). i.ytimg.com 의 경로 규칙은 공개 계약이라 영상 ID 만으로
 * 만들 수 있고, API 를 호출하지 않으니 30일 보관 제한(LEGAL.md 4.5)에도 걸리지 않는다 —
 * 우리가 저장하는 게 아니라 매 요청마다 원본을 가리킬 뿐이다.
 *
 * ⚠️ 썸네일은 유튜브 원본 그대로 띄워야 한다. 크롭·필터·오버레이로 가공하면
 *    YouTube API Developer Policies §III.E.3 위반이다. 프레임 안에 object-cover 로
 *    꽉 채우는 것까지가 허용선이고, 그 위에 무언가를 덧그리지 않는다.
 *
 * maxres 는 업로더가 HD 썸네일을 올렸을 때만 존재한다. 없으면 120×90 회색
 * 플레이스홀더가 200 으로 내려오므로 화면단에서 hq 로 폴백한다(ui/frame.tsx 의 Thumb).
 * 현재 수집된 16편은 전부 maxres 가 있다.
 */

export function thumbMax(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;
}

export function thumbHq(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/**
 * 채널 프로필 이미지 — 저장된 URL 의 크기 접미사만 바꿔 쓴다.
 *
 * yt3 URL 은 `…=s900-c-k-c0x00ffffff-no-rj` 형태라 s 뒤 숫자가 한 변 픽셀이다.
 * 원본(s900, 약 170KB)을 아바타 자리에 그대로 쓰면 34px 짜리에 900px 을 내려받는다.
 *
 * ⚠️ 썸네일과 달리 이 URL 은 채널 ID 에서 유도할 수 없어(해시) DB 에 저장한다.
 *    그래서 30일 갱신 대상이다 — creators.api_fetched_at (LEGAL.md 4.5).
 */
export function channelAvatar(url: string, px: number): string {
  return url.replace(/=s\d+-/, `=s${Math.max(48, Math.round(px))}-`);
}

/** 타임스탬프가 있으면 그 시각에서 재생되는 시청 링크. */
export function watchUrl(youtubeId: string, atSec?: number | null): string {
  const base = `https://www.youtube.com/watch?v=${youtubeId}`;
  return atSec != null && atSec > 0 ? `${base}&t=${Math.floor(atSec)}s` : base;
}

/** m:ss — 타임코드 표기. null 은 자리를 비우지 않고 대시로 채운다(표 정렬 유지). */
export function timecode(sec: number | null): string {
  if (sec === null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
