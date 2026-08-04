#!/usr/bin/env node
/**
 * 유튜브 자막 추출 — 로컬 실행 전용 (INGEST.md 2장 ③).
 *
 * 사용: node scripts/ingest/fetch-transcript.mjs <videoId> [videoId...]
 * 출력: 영상별로 "mm:ss 텍스트" 라인 (stdout)
 *
 * 방식: InnerTube player API를 IOS 클라이언트로 호출 → captionTracks → timedtext json3.
 *   (웹 클라이언트의 timedtext는 pot 토큰 요구로 빈 응답을 반환 — 2026-08 확인.
 *    웹 방식이 다시 필요하면 watch 페이지의 "captionTracks" 정규식 방식 참고: git 이력)
 *
 * ⛔ 규칙 (INGEST.md):
 *   · 서비스 서버에서 돌리지 않는다 — 로컬(어드민 머신) 전용
 *   · 요청 간 2.5초 딜레이
 *   · 실패 시 재시도하지 않는다 (다음 영상으로)
 *   · 출력은 분석용 일회성 — 파일·DB에 저장하지 않는다
 */

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("사용: node scripts/ingest/fetch-transcript.mjs <videoId> [...]");
  process.exit(1);
}

// IOS 클라이언트 — pot 토큰 없이 자막 URL이 동작하는 클라이언트 (버전은 막히면 최신으로 갱신)
const IOS = {
  ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
  context: {
    client: {
      clientName: "IOS",
      clientVersion: "20.10.4",
      deviceMake: "Apple",
      deviceModel: "iPhone16,2",
      osName: "iPhone",
      osVersion: "18.3.2.22D82",
      hl: "ko",
    },
  },
};

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function transcript(videoId) {
  const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": IOS.ua },
    body: JSON.stringify({ context: IOS.context, videoId, contentCheckOk: true, racyCheckOk: true }),
  });
  if (!res.ok) throw new Error(`player API ${res.status} (클라이언트 버전 갱신 필요할 수 있음)`);
  const data = await res.json();

  const playability = data?.playabilityStatus?.status;
  if (playability !== "OK") throw new Error(`재생 불가: ${playability ?? "알 수 없음"}`);

  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) throw new Error("자막 트랙 없음");
  // 한국어 수동 자막 > 한국어 자동생성 > 첫 트랙
  const track =
    tracks.find((t) => t.languageCode === "ko" && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode === "ko") ??
    tracks[0];
  if (!track?.baseUrl) throw new Error("트랙 URL 없음");

  const body = await (
    await fetch(track.baseUrl + "&fmt=json3", { headers: { "user-agent": IOS.ua } })
  ).text();
  if (!body) throw new Error("timedtext 빈 응답 (pot 차단 — 클라이언트 교체 필요)");
  const timed = JSON.parse(body);

  const lines = [];
  for (const ev of timed.events ?? []) {
    if (!ev.segs) continue;
    const text = ev.segs
      .map((s) => s.utf8 ?? "")
      .join("")
      .replace(/\n/g, " ")
      .trim();
    if (text) lines.push(`${fmt((ev.tStartMs ?? 0) / 1000)} ${text}`);
  }
  return { lang: track.languageCode, kind: track.kind ?? "manual", lines };
}

for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  try {
    const { lang, kind, lines } = await transcript(id);
    console.log(`===== ${id} (${lang}/${kind}, ${lines.length}줄) =====`);
    console.log(lines.join("\n"));
  } catch (err) {
    console.log(`===== ${id} 실패: ${err.message} =====`);
  }
  if (i < ids.length - 1) await new Promise((r) => setTimeout(r, 2500));
}
